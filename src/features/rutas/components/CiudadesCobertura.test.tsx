import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Ciudad, Ruta } from '@/types/api'
import { contarRutasPorCiudad } from '../domain'
import { CiudadesCobertura } from './CiudadesCobertura'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const ibarra: Ciudad = { id: 1, nombre: 'Ibarra', activa: true }
const atuntaqui: Ciudad = { id: 2, nombre: 'Atuntaqui', activa: true }
const quito: Ciudad = { id: 4, nombre: 'Quito', activa: false }
const ciudades = [ibarra, atuntaqui, quito]

const ruta = (id: number, origen: Ciudad, destino: Ciudad): Ruta => ({
  id, origen, destino, tarifaBase: 2.5, tiempoEstimadoMin: 30, activa: true,
  operativa: origen.activa && destino.activa,
})
// Ibarra: urbana + 2 interurbanas = 3 · Atuntaqui: 1 · Quito: 1
const rutas = [ruta(1, ibarra, ibarra), ruta(5, ibarra, atuntaqui), ruta(11, ibarra, quito)]

function renderizar(esAdmin: boolean, handler: Parameters<typeof mockFetch>[0] = () => jsonResponse(ciudades)) {
  const fetchMock = mockFetch(handler)
  renderWithProviders(
    <>
      <CiudadesCobertura rutas={rutas} esAdmin={esAdmin} />
      <Toaster />
    </>,
  )
  return fetchMock
}

const fila = async (nombre: string) =>
  (await within(await screen.findByRole('list', { name: 'Ciudades de cobertura' })).findByText(nombre)).closest('li')!

describe('contarRutasPorCiudad', () => {
  it('cuenta la ruta urbana una vez y las interurbanas en ambas ciudades', () => {
    expect([...contarRutasPorCiudad(rutas)]).toEqual([
      [1, 3],
      [2, 1],
      [4, 1],
    ])
  })
})

describe('CiudadesCobertura', () => {
  it('OPERADOR ve la lista con estado y número de rutas, sin acciones', async () => {
    renderizar(false)
    const filaIbarra = await fila('Ibarra')
    expect(within(filaIbarra).getByText('3 rutas')).toBeInTheDocument()
    expect(within(filaIbarra).getByText('Activa')).toBeInTheDocument()
    expect(within(await fila('Quito')).getByText('Inactiva')).toBeInTheDocument()
    expect(within(await fila('Atuntaqui')).getByText('1 ruta')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /Agregar ciudad/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument()
    expect(screen.getByText('2 activas de 3')).toBeInTheDocument()
  })

  it('ADMIN agrega una ciudad enviando el nombre recortado', async () => {
    const fetchMock = renderizar(true, (_url, init) =>
      init?.method === 'POST' ? jsonResponse({ id: 9, nombre: 'Cotacachi', activa: true }, 201) : jsonResponse(ciudades),
    )
    const user = userEvent.setup()
    await fila('Ibarra')

    await user.click(screen.getByRole('button', { name: /Agregar ciudad/ }))
    await user.type(await screen.findByLabelText('Nombre de la ciudad'), '  Cotacachi  ')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
      expect(post).toBeDefined()
      expect(post![0]).toBe('/api/ciudades')
      expect(JSON.parse(post![1]!.body as string)).toEqual({ nombre: 'Cotacachi' })
    })
    expect(await screen.findByText('Cotacachi agregada a la cobertura')).toBeInTheDocument()
  })

  it('ADMIN no puede agregar un nombre de menos de 2 caracteres', async () => {
    const fetchMock = renderizar(true)
    const user = userEvent.setup()
    await fila('Ibarra')

    await user.click(screen.getByRole('button', { name: /Agregar ciudad/ }))
    await user.type(await screen.findByLabelText('Nombre de la ciudad'), ' A ')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(await screen.findByText('Mínimo 2 caracteres')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('al eliminar una ciudad con rutas muestra el 409 que sugiere desactivarla', async () => {
    const mensaje = 'Atuntaqui tiene rutas registradas; desactívela en lugar de eliminarla para conservar el historial'
    const fetchMock = renderizar(true, (_url, init) =>
      init?.method === 'DELETE' ? jsonResponse({ error: { code: 'CONFLICTO', message: mensaje } }, 409) : jsonResponse(ciudades),
    )
    const user = userEvent.setup()

    await user.click(within(await fila('Atuntaqui')).getByRole('button', { name: 'Eliminar Atuntaqui' }))
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText('¿Eliminar Atuntaqui?')).toBeInTheDocument()
    await user.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText(mensaje)).toBeInTheDocument()
    const del = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE')
    expect(del![0]).toBe('/api/ciudades/2')
  })

  it('ADMIN desactiva una ciudad con el interruptor (PATCH activa=false)', async () => {
    const fetchMock = renderizar(true, (_url, init) =>
      init?.method === 'PATCH' ? jsonResponse({ ...atuntaqui, activa: false }) : jsonResponse(ciudades),
    )
    const user = userEvent.setup()

    await user.click(within(await fila('Atuntaqui')).getByRole('switch', { name: 'Desactivar Atuntaqui' }))

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
      expect(patch![0]).toBe('/api/ciudades/2')
      expect(JSON.parse(patch![1]!.body as string)).toEqual({ activa: false })
    })
  })
})
