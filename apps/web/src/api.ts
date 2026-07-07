import { saveAs } from 'file-saver';
import type {
  Category,
  CreateExportInput,
  CreateImportInput,
  DailyReportRow,
  PaginatedResponse,
  Product,
  ProductInput,
  ReportOverview,
  StockExport,
  StockImport,
  Unit,
  User,
} from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export function getToken() {
  return localStorage.getItem('warehouse_token');
}

export function setToken(token: string) {
  localStorage.setItem('warehouse_token', token);
}

export function clearToken() {
  localStorage.removeItem('warehouse_token');
}

type LoginResponse = {
  accessToken: string;
  user: User;
};

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return response.json() as Promise<T>;
}

async function buildApiError(response: Response) {
  const bodyText = await response.text();

  try {
    const body = JSON.parse(bodyText) as ApiErrorBody;
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    return new Error(message || body.error || `HTTP ${response.status}`);
  } catch {
    return new Error(bodyText || `HTTP ${response.status}`);
  }
}

function rangeQuery(from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  return params.toString();
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<User>('/auth/me'),

  products: (params = '') => request<PaginatedResponse<Product>>(`/products${params}`),
  createProduct: (data: ProductInput) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),

  categories: () => request<Category[]>('/categories'),
  units: () => request<Unit[]>('/units'),

  imports: () => request<PaginatedResponse<StockImport>>('/stock-imports?pageSize=50'),
  createImport: (data: CreateImportInput) =>
    request<StockImport>('/stock-imports', { method: 'POST', body: JSON.stringify(data) }),
  confirmImport: (id: string) => request<StockImport>(`/stock-imports/${id}/confirm`, { method: 'POST' }),

  exports: () => request<PaginatedResponse<StockExport>>('/stock-exports?pageSize=50'),
  createExport: (data: CreateExportInput) =>
    request<StockExport>('/stock-exports', { method: 'POST', body: JSON.stringify(data) }),
  confirmExport: (id: string) => request<StockExport>(`/stock-exports/${id}/confirm`, { method: 'POST' }),

  overview: (from: string, to: string) => request<ReportOverview>(`/reports/overview?${rangeQuery(from, to)}`),
  daily: (from: string, to: string) => request<DailyReportRow[]>(`/reports/daily?${rangeQuery(from, to)}`),

  async exportMonthly(month: number, year: number) {
    const token = getToken();
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    const response = await fetch(`${API_URL}/stock-exports/export-excel?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    saveAs(await response.blob(), `phieu-xuat-${year}-${String(month).padStart(2, '0')}.xlsx`);
  },
};
