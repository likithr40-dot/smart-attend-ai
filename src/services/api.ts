const TOKEN_KEY = 'smart_attend_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string; message?: string };
      errorMessage = payload.error || payload.message || errorMessage;
    } catch {
      // ignore non-json error body
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('text/csv')) {
    return (await response.text()) as unknown as T;
  }
  return (await response.json()) as T;
}
