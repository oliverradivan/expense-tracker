const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: { ...(options.body && !(options.body instanceof URLSearchParams) ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}))
  if (!response.ok) { const error = new Error(payload?.detail || payload?.message || 'Something went wrong. Please try again.'); error.status = response.status; throw error }
  return payload
}

export const post = (path, body) => api(path, { method: 'POST', body: body instanceof URLSearchParams ? body : JSON.stringify(body) })
