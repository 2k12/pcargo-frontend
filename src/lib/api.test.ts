import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '@/test/utils'
import { api, ApiError, apiFetch, tokenStorage, UNAUTHORIZED_EVENT } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('antepone /api y adjunta el token Bearer', async () => {
    tokenStorage.set('abc123')
    const fetchMock = mockFetch(() => jsonResponse([{ id: 1, nombre: 'Ibarra' }]))

    const data = await apiFetch<{ id: number }[]>('/ciudades')

    expect(data).toEqual([{ id: 1, nombre: 'Ibarra' }])
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/ciudades')
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer abc123')
  })

  it('no envía Authorization sin token y serializa el body', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ ok: true }))
    await apiFetch('/auth/login', { method: 'POST', body: { email: 'a@b.ec' } })
    const [, init] = fetchMock.mock.calls[0]!
    const headers = init!.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
    expect(headers['Content-Type']).toBe('application/json')
    expect(init!.body).toBe(JSON.stringify({ email: 'a@b.ec' }))
  })

  it('construye query string omitiendo valores vacíos', async () => {
    const fetchMock = mockFetch(() => jsonResponse([]))
    await apiFetch('/envios', { query: { estado: 'ENTREGADO', rutaId: undefined, q: '' } })
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/envios?estado=ENTREGADO')
  })

  it('lanza ApiError con code y message del cuerpo de error', async () => {
    mockFetch(() => jsonResponse({ error: { code: 'TRANSICION_INVALIDA', message: 'No permitido' } }, 422))
    const err = await apiFetch('/envios/1/estado', { method: 'PATCH', body: {} }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 422, code: 'TRANSICION_INVALIDA', message: 'No permitido' })
  })

  it('en 401 limpia el token y emite el evento de no autorizado', async () => {
    tokenStorage.set('expirado')
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)
    mockFetch(() => jsonResponse({ error: { code: 'NO_AUTORIZADO', message: 'Token inválido' } }, 401))

    await expect(apiFetch('/auth/me')).rejects.toMatchObject({ status: 401 })

    expect(tokenStorage.get()).toBeNull()
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })

  it('api.delete envía DELETE y resuelve sin cuerpo en 204', async () => {
    tokenStorage.set('abc123')
    const fetchMock = mockFetch(() => new Response(null, { status: 204 }))
    await expect(api.delete('/ciudades/7')).resolves.toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/ciudades/7')
    expect(init!.method).toBe('DELETE')
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer abc123')
  })

  it('api.delete propaga el 409 como ApiError', async () => {
    mockFetch(() => jsonResponse({ error: { code: 'CONFLICTO', message: 'Tiene rutas; desactívela' } }, 409))
    await expect(api.delete('/ciudades/1')).rejects.toMatchObject({ status: 409, code: 'CONFLICTO' })
  })

  it('traduce fallos de red a ApiError status 0', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(apiFetch('/health')).rejects.toMatchObject({ status: 0, code: 'RED' })
  })
})
