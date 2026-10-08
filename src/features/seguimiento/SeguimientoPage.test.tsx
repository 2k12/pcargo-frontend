import { screen, within } from '@testing-library/react'
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
  codigo: 'PC-7K2M9QXA',
  estado: 'EN_TRANSITO',
  origen: 'Ibarra',
  destino: 'Quito',
  tipoCarga: 'PAQUETE',
  creadoEn: '2026-10-07T13:00:00Z',
  historial: [
    { estado: 'REGISTRADO', nota: null, fecha: '2026-10-07T13:00:00Z', usuario: 'Operador' },
    { estado: 'EN_TRANSITO', nota: 'Salió en bus de las 10h', fecha: '2026-10-07T15:00:00Z', usuario: 'Operador' },
  ],
}

describe('SeguimientoPage (pública)', () => {
  it('consulta el código sin token y muestra estado, ruta e historial', async () => {
    const fetchMock = mockFetch((url) =>
      url.endsWith('/seguimiento/PC-7K2M9QXA') ? jsonResponse(seguimiento) : jsonResponse({}, 404),
    )
    renderWithProviders(<SeguimientoPage />, { route: '/seguimiento/PC-7K2M9QXA', path: '/seguimiento/:codigo' })

    expect(await screen.findByText('Salió en bus de las 10h')).toBeInTheDocument()
    expect(screen.getByText(/Ibarra/)).toBeInTheDocument()
    const progreso = screen.getByRole('list', { name: 'Progreso del envío' })
    expect(within(progreso).getByText('En tránsito').closest('li')).toHaveAttribute('aria-current', 'step')

    const [, init] = fetchMock.mock.calls[0]!
    expect((init!.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('muestra mensaje amigable cuando el código no existe', async () => {
    mockFetch(() => jsonResponse({ error: { code: 'NO_ENCONTRADO', message: 'Envío no encontrado' } }, 404))
    renderWithProviders(<SeguimientoPage />, { route: '/seguimiento/PC-NOEXISTE', path: '/seguimiento/:codigo' })
    expect(await screen.findByText('No encontramos ese envío')).toBeInTheDocument()
  })

  it('normaliza el código a mayúsculas al buscar', async () => {
    const fetchMock = mockFetch(() => jsonResponse(seguimiento))
    const user = userEvent.setup()
    renderWithProviders(<SeguimientoPage />, {
      route: '/seguimiento',
      path: '/seguimiento',
      extraRoutes: [{ path: '/seguimiento/:codigo', element: <SeguimientoPage /> }],
    })

    await user.type(screen.getByLabelText('Código de seguimiento'), ' pc-7k2m9qxa ')
    await user.click(screen.getByRole('button', { name: /Buscar/ }))

    expect(await screen.findByText('PC-7K2M9QXA')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/seguimiento/PC-7K2M9QXA')
  })
})
