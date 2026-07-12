import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, AUTH_UNAUTHORIZED_EVENT, buildListQuery, getToken, setToken } from './api';

describe('API client safety', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('builds encoded server-side pagination and filter query strings', () => {
    expect(buildListQuery({ page: 2, pageSize: 50, search: 'mã hàng A', status: 'ACTIVE' })).toBe(
      '?page=2&pageSize=50&search=m%C3%A3+h%C3%A0ng+A&status=ACTIVE',
    );
    expect(buildListQuery({ page: 1, search: '', status: undefined })).toBe('?page=1');
  });

  it('clears an expired token and notifies the application on HTTP 401', async () => {
    setToken('expired-token');
    const unauthorized = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, unauthorized, { once: true });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(api.me()).rejects.toThrow('Unauthorized');

    expect(getToken()).toBeNull();
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it('uploads receipt images as multipart data without forcing a JSON content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'attachment-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['image'], 'phieu-nhap.png', { type: 'image/png' });

    await api.uploadImportAttachment('import-1', file);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBeInstanceOf(FormData);
    expect(new Headers(options.headers).has('Content-Type')).toBe(false);
  });
});
