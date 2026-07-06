import { saveAs } from 'file-saver';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export function getToken() { return localStorage.getItem('warehouse_token'); }
export function setToken(token: string) { localStorage.setItem('warehouse_token', token); }
export function clearToken() { localStorage.removeItem('warehouse_token'); }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) => request<{ accessToken: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request<any>('/auth/me'),
  products: (params = '') => request<any>(`/products${params}`),
  createProduct: (data: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  categories: () => request<any[]>('/categories'),
  units: () => request<any[]>('/units'),
  imports: () => request<any>('/stock-imports?pageSize=50'),
  createImport: (data: any) => request<any>('/stock-imports', { method: 'POST', body: JSON.stringify(data) }),
  confirmImport: (id: string) => request<any>(`/stock-imports/${id}/confirm`, { method: 'POST' }),
  exports: () => request<any>('/stock-exports?pageSize=50'),
  createExport: (data: any) => request<any>('/stock-exports', { method: 'POST', body: JSON.stringify(data) }),
  confirmExport: (id: string) => request<any>(`/stock-exports/${id}/confirm`, { method: 'POST' }),
  overview: (from: string, to: string) => request<any>(`/reports/overview?from=${from}&to=${to}`),
  daily: (from: string, to: string) => request<any[]>(`/reports/daily?from=${from}&to=${to}`),
  async exportMonthly(month: number, year: number) {
    const token = getToken();
    const res = await fetch(`${API_URL}/stock-exports/export-excel?month=${month}&year=${year}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(await res.text());
    saveAs(await res.blob(), `phieu-xuat-${year}-${String(month).padStart(2, '0')}.xlsx`);
  },
};
