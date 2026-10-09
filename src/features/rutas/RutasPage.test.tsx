import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TIPOS_CARGA_DEFAULT } from '@/features/envios/domain'
import { TOKEN_KEY } from '@/lib/api'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Ciudad, Ruta } from '@/types/api'
import { RutasPage } from './RutasPage'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

const ibarra: Ciudad = { id: 1, nombre: 'Ibarra', activa: true }
const quito: Ciudad = { id: 4, nombre: 'Quito', activa: true }
const rutas: Ruta[] = [
  { id: 7, origen: ibarra, destino: quito, tiempoEstimadoMin: 150, activa: true, operativa: true },
  { id: 1, origen: ibarra, destino: ibarra, tiempoEstimadoMin: 40, activa: true, operativa: true },
]
const admin = { id: 'u1', nombre: 'Admin', email: 'admin@pcargo.ec', rol: 'ADMIN' }

beforeEach(() => localStorage.setItem(TOKEN_KEY, 'token-de-prueba'))
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function renderizar() {
  const fetchMock = mockFetch((url, init) => {
    if (url.endsWith('/auth/me')) return jsonResponse(admin)
    if (url.includes('/tipos-carga')) return jsonResponse(TIPOS_CARGA_DEFAULT)
    if (url.includes('/ciudades')) return jsonResponse([ibarra, quito])
    if (url.endsWith('/rutas/7') && init?.method === 'PATCH') return jsonResponse({ ...rutas[0], ...JSON.parse(String(init.body)) })
    if (url.includes('/rutas')) return jsonResponse(rutas)
    return jsonResponse({}, 404)
  })
  renderWithProviders(<RutasPage />)
  return fetchMock
}

describe('RutasPage (contrato v8: la ruta no tiene tarifa)', () => {
  it('las tarjetas de ruta muestran el tiempo estimado y ningún precio', async () => {
    renderizar()
    const lista = await screen.findByRole('region', { name: 'Desde Ibarra' })
    expect(await within(lista).findByText('2 h 30 min')).toBeInTheDocument()
    expect(within(lista).getByText('40 min')).toBeInTheDocument()
    expect(within(lista).queryByText(/\$/)).not.toBeInTheDocument()
  })

  it('publica el precio por tipo de carga, con tela urbana/rural y el precio por volumen', async () => {
    renderizar()
    const precios = await screen.findByRole('list', { name: 'Precios por tipo de carga' })
    expect(within(precios).getByText('$1,25 urbana · $1,50 rural')).toBeInTheDocument()
    expect(within(precios).getByText(/más de 50 rollos de tela: \$1,00 c\/u/)).toBeInTheDocument()
    expect(within(precios).getByText('$4,00')).toBeInTheDocument()
    expect(screen.queryByText(/tarifa base|factor|por cada kg/i)).not.toBeInTheDocument()
  })

  it('editar una ruta solo cambia el tiempo estimado (sin tarifa base en el formulario ni en el payload)', async () => {
    const user = userEvent.setup()
    const fetchMock = renderizar()
    const editar = await screen.findAllByRole('button', { name: 'Editar ruta' })
    // Orden por tiempo: primero la urbana (40 min), luego Ibarra → Quito (150 min).
    await user.click(editar[1]!)
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).queryByLabelText(/Tarifa/)).not.toBeInTheDocument()
    const tiempo = within(dialogo).getByLabelText('Tiempo estimado (min)')
    expect(tiempo).toHaveValue(150)
    await user.clear(tiempo)
    await user.type(tiempo, '160')
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PATCH')).toBe(true))
    const [url, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH')!
    expect(url).toBe('/api/rutas/7')
    expect(JSON.parse(String(init!.body))).toEqual({ tiempoEstimadoMin: 160 })
  })

  it('el alta de ruta pide origen, destino y tiempo estimado, sin tarifa', async () => {
    const user = userEvent.setup()
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Nueva ruta' }))
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByLabelText('Tiempo estimado (min)')).toBeInTheDocument()
    expect(within(dialogo).queryByLabelText(/Tarifa/)).not.toBeInTheDocument()
    expect(within(dialogo).getByText(/El precio depende del tipo de carga, no de la ruta/)).toBeInTheDocument()
  })
})
