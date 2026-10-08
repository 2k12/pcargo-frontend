import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Seguimiento } from '@/types/api'
import { MENSAJE_ESTADO } from './estados'
import { SeguimientoPage } from './SeguimientoPage'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const seguimiento: Seguimiento = {
  numeroGuia: 40425,
  estado: 'EN_TRANSITO',
  origen: 'Ibarra',
  destino: 'Quito',
  items: [
    { tipoCarga: 'PAQUETE', cantidad: 5 },
    { tipoCarga: 'CARTON', cantidad: 20 },
  ],
  totalPiezas: 25,
  creadoEn: '2026-10-07T13:00:00Z',
  historial: [
    { estado: 'REGISTRADO', nota: null, fecha: '2026-10-07T13:00:00Z', usuario: 'Operador' },
    { estado: 'EN_TRANSITO', nota: 'Salió en bus de las 10h', fecha: '2026-10-07T15:00:00Z', usuario: 'Operador' },
  ],
}

describe('SeguimientoPage (pública)', () => {
  it('consulta la guía sin token y muestra estado, ruta e historial', async () => {
    const fetchMock = mockFetch((url) =>
      url.endsWith('/seguimiento/40425') ? jsonResponse(seguimiento) : jsonResponse({}, 404),
    )
    renderWithProviders(<SeguimientoPage />, { route: '/seguimiento/40425', path: '/seguimiento/:numeroGuia' })

    expect(await screen.findByText('Salió en bus de las 10h')).toBeInTheDocument()
    expect(screen.getByText(/Ibarra/)).toBeInTheDocument()
    expect(screen.getByTestId('seguimiento-items')).toHaveTextContent('5 paquetes · 20 cartones · 25 piezas')
    const progreso = screen.getByRole('list', { name: 'Progreso del envío' })
    expect(within(progreso).getByText('En tránsito').closest('li')).toHaveAttribute('aria-current', 'step')

    const [, init] = fetchMock.mock.calls[0]!
    expect((init!.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('muestra mensaje amigable cuando la guía no existe', async () => {
    mockFetch(() => jsonResponse({ error: { code: 'NO_ENCONTRADO', message: 'Envío no encontrado' } }, 404))
    renderWithProviders(<SeguimientoPage />, { route: '/seguimiento/999999', path: '/seguimiento/:numeroGuia' })
    expect(await screen.findByText('No encontramos ese envío')).toBeInTheDocument()
  })

  it('busca la guía ignorando los ceros a la izquierda', async () => {
    const fetchMock = mockFetch(() => jsonResponse(seguimiento))
    const user = userEvent.setup()
    renderWithProviders(<SeguimientoPage />, {
      route: '/seguimiento',
      path: '/seguimiento',
      extraRoutes: [{ path: '/seguimiento/:numeroGuia', element: <SeguimientoPage /> }],
    })

    await user.type(screen.getByLabelText('Número de guía'), ' 0040425 ')
    await user.click(screen.getByRole('button', { name: /Buscar/ }))

    expect(await screen.findByText('Guía 40425')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/seguimiento/40425')
  })

  it('avisa si se escriben letras y no consulta', async () => {
    const fetchMock = mockFetch(() => jsonResponse(seguimiento))
    const user = userEvent.setup()
    renderWithProviders(<SeguimientoPage />, { route: '/seguimiento', path: '/seguimiento' })

    await user.type(screen.getByLabelText('Número de guía'), 'PC-7K2M9QXA')
    await user.click(screen.getByRole('button', { name: /Buscar/ }))

    expect(screen.getByRole('alert')).toHaveTextContent(/solo los números/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('muestra aviso con el motivo cuando el envío no pudo entregarse', async () => {
    mockFetch(() =>
      jsonResponse({
        ...seguimiento,
        estado: 'NO_ENTREGADO',
        historial: [
          ...seguimiento.historial,
          { estado: 'EN_REPARTO', nota: null, fecha: '2026-10-07T17:00:00Z', usuario: null },
          { estado: 'NO_ENTREGADO', nota: 'Destinatario ausente', fecha: '2026-10-07T18:00:00Z', usuario: null },
        ],
      } satisfies Seguimiento),
    )
    renderWithProviders(<SeguimientoPage />, { route: '/seguimiento/40425', path: '/seguimiento/:numeroGuia' })

    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent('No pudimos entregar tu encomienda')
    expect(aviso).toHaveTextContent('Motivo: Destinatario ausente')
    const progreso = screen.getByRole('list', { name: 'Progreso del envío' })
    expect(within(progreso).getByText('En reparto').closest('li')).toHaveAttribute('aria-current', 'step')
  })
})

describe('personaje del estado', () => {
  const ESTADOS = ['REGISTRADO', 'EN_TRANSITO', 'EN_REPARTO', 'ENTREGADO', 'NO_ENTREGADO', 'NOVEDAD', 'CANCELADO'] as const

  it.each(ESTADOS)('muestra la ilustración y el mensaje de %s, a la derecha (móvil y escritorio)', async (estado) => {
    mockFetch(() => jsonResponse({ ...seguimiento, estado, historial: [{ ...seguimiento.historial[0]!, estado }] }))
    renderWithProviders(<SeguimientoPage />, { route: '/seguimiento/40425', path: '/seguimiento/:numeroGuia' })

    await screen.findByText('Guía 40425')
    // Uno en la cabecera de la tarjeta (móvil) y otro grande en la columna derecha (escritorio).
    const personajes = screen.getAllByTestId('personaje-estado')
    expect(personajes).toHaveLength(2)
    for (const p of personajes) {
      expect(p).toHaveAttribute('data-estado', estado)
      expect(p).toHaveAttribute('aria-hidden', 'true')
    }
    const lateral = screen.getByRole('complementary', { name: 'Estado de tu encomienda' })
    expect(within(lateral).getByText(MENSAJE_ESTADO[estado].titulo)).toBeInTheDocument()
    expect(within(lateral).getByText(MENSAJE_ESTADO[estado].texto)).toBeInTheDocument()
  })

  it('no muestra el personaje mientras no hay resultado', () => {
    mockFetch(() => jsonResponse({}))
    renderWithProviders(<SeguimientoPage />, { route: '/seguimiento', path: '/seguimiento' })
    expect(screen.queryByTestId('personaje-estado')).not.toBeInTheDocument()
  })
})
