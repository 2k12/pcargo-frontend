const BASE_URL: string = import.meta.env.VITE_API_URL || '/api'

export const TOKEN_KEY = 'pcargo.token'
export const UNAUTHORIZED_EVENT = 'pcargo:unauthorized'

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

interface RequestOptions {
  method?: Method
  /** JSON; con `FormData` se envía como multipart (el navegador pone el boundary). */
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/** Hace la petición con el token y convierte los errores del contrato en `ApiError`. */
async function request(path: string, options: RequestOptions, accept: string): Promise<Response> {
  const { method = 'GET', body, query } = options
  const headers: Record<string, string> = { Accept: accept }
  const esFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !esFormData) headers['Content-Type'] = 'application/json'
  const token = tokenStorage.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : esFormData ? (body as FormData) : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'RED', 'No se pudo conectar con el servidor')
  }

  if (!response.ok) {
    // Solo el 401 cierra la sesión; 403/409/422 (p. ej. CONTRASENA_INCORRECTA) se muestran sin salir.
    if (response.status === 401 && token) {
      tokenStorage.clear()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    const data: unknown = await response.json().catch(() => null)
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error
    throw new ApiError(
      response.status,
      err?.code ?? 'ERROR',
      err?.message ?? `Error inesperado (${response.status})`,
    )
  }
  return response
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await request(path, options, 'application/json')
  if (response.status === 204) return undefined as T
  return (await response.json().catch(() => null)) as T
}

/** Descarga binaria autenticada (p. ej. la foto de evidencia) para mostrarla como `blob:`. */
export async function apiBlob(path: string): Promise<Blob> {
  const response = await request(path, {}, '*/*')
  return response.blob()
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => apiFetch<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  put: <T = void>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body }),
  delete: <T = void>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado'
}
