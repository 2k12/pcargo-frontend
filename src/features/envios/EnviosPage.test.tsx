import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Envio, Pagina } from '@/types/api'
import { EnviosPage } from './EnviosPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const vacia: Pagina<Envio> = { datos: [], pagina: 1, porPagina: 20, total: 0, totalPaginas: 0 }

const envio = (n: number) =>
  ({
    id: `e${n}`,
    numeroGuia: 40000 + n,
    remitente: { nombre: 'Ana', telefono: '0991112233' },
    destinatario: { nombre: `Cliente ${n}`, telefono: '0994445566', direccion: 'Quito' },
    ruta: { id: 7, origen: 'Ibarra', destino: 'Quito' },
    items: [{ tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 0.2, costoUnitario: 4, subtotal: 4 }],
    totalPiezas: 1,
    pesoTotalKg: 0.2,
    descripcion: null,
    costo: 4,
    formaPago: 'PAGADO',
    estado: 'EN_TRANSITO',
    registro: { fecha: '2026-10-07T10:00:00.000Z', operador: 'Operador' },
    entrega: null,
    creadoEn: '2026-10-07T10:00:00.000Z',
    actualizadoEn: '2026-10-07T10:00:00.000Z',
  }) as unknown as Envio

/** Simula el servidor: 45 envíos paginados según ?pagina=&porPagina=. */
function servidorPaginado() {
  return mockFetch((url) => {
    if (!url.includes('/envios')) return jsonResponse([])
    const p = new URL(url, 'http://x').searchParams
    const pagina = Number(p.get('pagina') ?? 1)
    const porPagina = Number(p.get('porPagina') ?? 20)
    const total = 45
    const datos = Array.from({ length: total }, (_, i) => envio(i + 1)).slice((pagina - 1) * porPagina, pagina * porPagina)
    return jsonResponse({ datos, pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) })
  })
}

const urlsEnvios = (fetch: ReturnType<typeof mockFetch>) =>
  fetch.mock.calls.map(([u]) => String(u)).filter((u) => u.includes('/envios'))

describe('EnviosPage', () => {
  it('toma los filtros de la URL, los envía a la API y permite limpiarlos', async () => {
    const fetch = mockFetch((url) => jsonResponse(url.includes('/envios') ? vacia : []))
    renderWithProviders(<EnviosPage />, { route: '/envios?estado=ENTREGADO&formaPago=AL_COBRO', path: '/envios' })

    expect(await screen.findByText('No hay envíos')).toBeInTheDocument()
    const urls = () => urlsEnvios(fetch)
    expect(urls().some((u) => u.includes('estado=ENTREGADO') && u.includes('formaPago=AL_COBRO'))).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: /Limpiar filtros/ }))
    expect(screen.queryByRole('button', { name: /Limpiar filtros/ })).not.toBeInTheDocument()
    await vi.waitFor(() => expect(urls().at(-1)).not.toContain('estado='))
  })

  it('pide al servidor solo la página visible y navega entre páginas', async () => {
    const fetch = servidorPaginado()
    renderWithProviders(<EnviosPage />, { route: '/envios', path: '/envios' })

    expect(await screen.findByText('1–20 de 45')).toBeInTheDocument()
    expect(urlsEnvios(fetch).at(-1)).toContain('pagina=1')
    expect(urlsEnvios(fetch).at(-1)).toContain('porPagina=20')

    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(await screen.findByText('21–40 de 45')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()
    expect(urlsEnvios(fetch).at(-1)).toContain('pagina=2')

    await userEvent.click(screen.getByRole('button', { name: 'Última página' }))
    expect(await screen.findByText('41–45 de 45')).toBeInTheDocument()
  })

  it('respeta la página de la URL y vuelve a la primera al cambiar un filtro', async () => {
    const fetch = servidorPaginado()
    renderWithProviders(<EnviosPage />, { route: '/envios?pagina=2', path: '/envios' })

    expect(await screen.findByText('21–40 de 45')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar envíos' }), 'Ana')
    await vi.waitFor(() => expect(urlsEnvios(fetch).at(-1)).toContain('q=Ana'))
    expect(urlsEnvios(fetch).at(-1)).toContain('pagina=1')
  })

  it('si la página de la URL ya no existe, muestra la última', async () => {
    servidorPaginado()
    renderWithProviders(<EnviosPage />, { route: '/envios?pagina=9', path: '/envios' })
    expect(await screen.findByText('41–45 de 45')).toBeInTheDocument()
  })
})
