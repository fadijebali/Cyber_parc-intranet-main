const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const token = localStorage.getItem('authToken');

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();
    let message = raw || 'Request failed';

    if (contentType.includes('application/json')) {
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed.message === 'string') {
          message = parsed.message;
        }
      } catch {
        // ignore JSON parse errors
      }
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
