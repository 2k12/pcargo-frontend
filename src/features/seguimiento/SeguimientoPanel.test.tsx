import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Seguimiento } from '@/types/api'
import { SeguimientoPage } from './SeguimientoPage'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const seguimiento: Seguimiento = {
  numeroGuia: 40425,
  estado: 'EN_TRANSITO',
  origen: 'Ibarra',
  destino: 'Otavalo',
  items: [{ tipoCarga: 'CARTON', cantidad: 3 }],
  totalPiezas: 3,
  creadoEn: '2026-10-08T05:00:00Z',
  historial: [{ estado: 'REGISTRADO', nota: null, fecha: '2026-10-08T05:00:00Z', usuario: null }],
}

describe('SeguimientoPage dentro del panel (embebido)', () => {
  it('no muestra la cabecera pública y busca sin salir del panel', async () => {
    const fetchMock = mockFetch(() => jsonResponse(seguimiento))
    const user = userEvent.setup()
    renderWithProviders(<SeguimientoPage embebido />, {
      route: '/panel/seguimiento',
      path: '/panel/seguimiento',
      extraRoutes: [{ path: '/panel/seguimiento/:numeroGuia', element: <SeguimientoPage embebido /> }],
    })

    expect(screen.getByRole('heading', { name: 'Rastreo de envíos' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /inicio/ })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Número de guía'), '0040425')
    await user.click(screen.getByRole('button', { name: /Buscar/ }))

    expect(await screen.findByText('Guía 40425')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/seguimiento/40425')
  })

  it('la versión pública conserva su cabecera con enlace al inicio', () => {
    mockFetch(() => jsonResponse(seguimiento))
    renderWithProviders(<SeguimientoPage />, { route: '/seguimiento', path: '/seguimiento' })
    expect(screen.getByRole('link', { name: /inicio/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Rastrea tu encomienda' })).toBeInTheDocument()
  })
})
