import { saveAs } from 'file-saver';
import type {
  Category,
  CreateExportInput,
  CreateImportInput,
  DailyReportRow,
  ManagedUser,
  PaginatedResponse,
  Partner,
  PartnerInput,
  Product,
  ProductInput,
  ReportOverview,
  StockExport,
  StockImport,
  StockMovement,
  Unit,
  User,
  VoucherStatus,
} from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
export const AUTH_UNAUTHORIZED_EVENT = 'warehouse:unauthorized';

type ListQueryValue = string | number | undefined | null;

export function buildListQuery(params: Record<string, ListQueryValue> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

export function getToken() {
  return localStorage.getItem('warehouse_token');
}

export function setToken(token: string) {
  localStorage.setItem('warehouse_token', token);
}

export function clearToken() {
  localStorage.removeItem('warehouse_token');
}

export type LoginResponse = {
  accessToken: string;
  user: User;
};

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !(typeof FormData !== 'undefined' && options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    handleUnauthorized(response);
    throw await buildApiError(response);
  }

  return response.json() as Promise<T>;
}

function handleUnauthorized(response: Response) {
  if (response.status !== 401) return;
  clearToken();
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
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

  products: (params: Record<string, ListQueryValue> = {}) =>
    request<PaginatedResponse<Product>>(`/products${buildListQuery(params)}`),
  createProduct: (data: ProductInput) =>
    request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProduct: (id: string, data: ProductInput) =>
    request<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  productMovements: (id: string) => request<StockMovement[]>(`/products/${id}/movements`),

  categories: () => request<Category[]>('/categories'),
  units: () => request<Unit[]>('/units'),

  customers: (params: Record<string, ListQueryValue> = {}) =>
    request<PaginatedResponse<Partner>>(`/customers${buildListQuery(params)}`),
  createCustomer: (data: PartnerInput) =>
    request<Partner>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: PartnerInput) =>
    request<Partner>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  suppliers: (params: Record<string, ListQueryValue> = {}) =>
    request<PaginatedResponse<Partner>>(`/suppliers${buildListQuery(params)}`),
  createSupplier: (data: PartnerInput) =>
    request<Partner>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: PartnerInput) =>
    request<Partner>(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  imports: (params: { page?: number; pageSize?: number; status?: VoucherStatus } = {}) =>
    request<PaginatedResponse<StockImport>>(`/stock-imports${buildListQuery(params)}`),
  createImport: (data: CreateImportInput) =>
    request<StockImport>('/stock-imports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  confirmImport: (id: string) => request<StockImport>(`/stock-imports/${id}/confirm`, { method: 'POST' }),
  updateImport: (id: string, data: CreateImportInput) =>
    request<StockImport>(`/stock-imports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  cancelImport: (id: string) => request<StockImport>(`/stock-imports/${id}/cancel`, { method: 'POST' }),
  uploadImportAttachment: (id: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<StockImport['attachments'][number]>(`/stock-imports/${id}/attachments`, {
      method: 'POST',
      body,
    });
  },

  exports: (params: { page?: number; pageSize?: number; status?: VoucherStatus } = {}) =>
    request<PaginatedResponse<StockExport>>(`/stock-exports${buildListQuery(params)}`),
  createExport: (data: CreateExportInput) =>
    request<StockExport>('/stock-exports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  confirmExport: (id: string) => request<StockExport>(`/stock-exports/${id}/confirm`, { method: 'POST' }),
  updateExport: (id: string, data: CreateExportInput) =>
    request<StockExport>(`/stock-exports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  cancelExport: (id: string) => request<StockExport>(`/stock-exports/${id}/cancel`, { method: 'POST' }),
  adjustStock: (productId: string, data: { targetStock: number; reason: string }) =>
    request(`/stock-adjustments/products/${productId}`, { method: 'POST', body: JSON.stringify(data) }),
  users: (params: { page?: number; pageSize?: number; status?: string } = {}) =>
    request<PaginatedResponse<ManagedUser>>(`/users${buildListQuery(params)}`),
  createUser: (data: { username: string; name: string; password: string; role: User['role'] }) =>
    request<ManagedUser>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: { name?: string; role?: User['role']; status?: ManagedUser['status'] }) =>
    request<ManagedUser>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  resetUserPassword: (id: string, password: string) =>
    request<ManagedUser>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  async downloadExportFile(id: string, code: string) {
    const token = getToken();
    const response = await fetch(`${API_URL}/stock-exports/${id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      handleUnauthorized(response);
      throw await buildApiError(response);
    }

    saveAs(await response.blob(), `phieu-giao-hang-${code}.xlsx`);
  },

  async downloadImportAttachment(importId: string, attachment: StockImport['attachments'][number]) {
    const token = getToken();
    const response = await fetch(`${API_URL}/stock-imports/${importId}/attachments/${attachment.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      handleUnauthorized(response);
      throw await buildApiError(response);
    }
    saveAs(await response.blob(), attachment.originalName);
  },

  overview: (from: string, to: string) => request<ReportOverview>(`/reports/overview?${rangeQuery(from, to)}`),
  daily: (from: string, to: string) => request<DailyReportRow[]>(`/reports/daily?${rangeQuery(from, to)}`),

  async exportMonthly(month: number, year: number) {
    const token = getToken();
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
    });
    const response = await fetch(`${API_URL}/stock-exports/export-excel?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      handleUnauthorized(response);
      throw await buildApiError(response);
    }

    saveAs(await response.blob(), `phieu-xuat-${year}-${String(month).padStart(2, '0')}.xlsx`);
  },
};
