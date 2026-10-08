import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { CatalogoPublico, Ruta } from '@/types/api'
import { buscarRuta, matrizTarifas, tarifaDesde } from './cobertura'
import { LandingPage } from './LandingPage'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const ibarra = { id: 1, nombre: 'Ibarra' }
const quito = { id: 4, nombre: 'Quito' }
const ruta = (id: number, origen = ibarra, destino = quito, tarifaBase = 6): Ruta => ({
  id, origen, destino, tarifaBase, tiempoEstimadoMin: 180, activa: true,
})

const catalogo: CatalogoPublico = {
  ciudades: [ibarra, quito],
  tiposCarga: [
    { codigo: 'SOBRE', nombre: 'Sobre', factor: 1, pesoIncluidoKg: 0.5, pesoMaxKg: 0.5 },
    { codigo: 'VALIJA', nombre: 'Valija', factor: 1.8, pesoIncluidoKg: 2, pesoMaxKg: 25 },
  ],
  rutas: [ruta(1, ibarra, ibarra, 2), ruta(11), ruta(12, quito, ibarra, 6)],
}

describe('cobertura', () => {
  it('busca rutas, calcula la tarifa mínima y arma la matriz', () => {
    expect(buscarRuta(catalogo.rutas, 1, 4)?.id).toBe(11)
    expect(buscarRuta(catalogo.rutas, 4, 4)).toBeUndefined()
    expect(tarifaDesde(catalogo.rutas)).toBe(2)
    expect(tarifaDesde([])).toBeNull()
    const m = matrizTarifas(catalogo.ciudades, catalogo.rutas)
    expect(m.map((fila) => fila.map((c) => c.ruta?.id ?? null))).toEqual([[1, 11], [12, null]])
  })
})

describe('LandingPage (pública)', () => {
  it('muestra servicios, tarifas reales y enlaza al login', async () => {
    const fetchMock = mockFetch((url) => (url.endsWith('/publico/catalogo') ? jsonResponse(catalogo) : jsonResponse({}, 404)))
    renderWithProviders(<LandingPage />)

    expect(await screen.findByRole('heading', { name: 'Valija' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /puerta a puerta/i })).toBeInTheDocument()

    const tabla = screen.getByRole('table')
    expect(within(tabla).getAllByText('$6,00')).toHaveLength(2)
    expect(within(tabla).getByText('$2,00')).toBeInTheDocument()

    const accesos = screen.getAllByRole('link', { name: /Acceso personal/ })
    expect(accesos.length).toBeGreaterThan(0)
    for (const a of accesos) expect(a).toHaveAttribute('href', '/login')

    const [, init] = fetchMock.mock.calls[0]!
    expect((init!.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('el rastreador lleva al seguimiento con el código normalizado', async () => {
    mockFetch(() => jsonResponse(catalogo))
    const user = userEvent.setup()
    renderWithProviders(<LandingPage />, {
      extraRoutes: [{ path: '/seguimiento/:codigo', element: <p>Página de seguimiento</p> }],
    })

    await user.type(screen.getByLabelText('Código de seguimiento'), ' pc-abcd2345 ')
    await user.click(screen.getByRole('button', { name: /Rastrear/ }))
    expect(await screen.findByText('Página de seguimiento')).toBeInTheDocument()
  })
})
