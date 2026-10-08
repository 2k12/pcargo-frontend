import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Cliente, Envio, Resumen, Ruta } from '@/types/api'
import { DashboardPage } from './DashboardPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const resumen: Resumen = {
  totalEnvios: 10,
  totalPiezas: 42,
  pesoTotalKg: 60,
  ingresos: 36,
  porCobrar: 16,
  porEstado: { REGISTRADO: 1, EN_TRANSITO: 2, EN_REPARTO: 1, ENTREGADO: 3, NO_ENTREGADO: 1, NOVEDAD: 1, CANCELADO: 1 },
  porTipo: [
    { tipoCarga: 'SOBRE', piezas: 12 },
    { tipoCarga: 'CARTON', piezas: 30 },
  ],
  porRuta: [{ rutaId: 7, ruta: 'Ibarra → Quito', total: 6, monto: 30 }],
  porFormaPago: [
    { formaPago: 'PAGADO', envios: 7, monto: 20 },
    { formaPago: 'AL_COBRO', envios: 2, monto: 16 },
  ],
  porDia: [
    { fecha: '2026-10-06', envios: 4, ingresos: 20 },
    { fecha: '2026-10-07', envios: 6, ingresos: 16 },
  ],
  porCliente: [
    { clienteId: 'c1', nombre: 'Textiles Atuntaqui', envios: 6, monto: 30 },
    { clienteId: null, nombre: 'Sin cliente registrado', envios: 4, monto: 6 },
  ],
}

const cliente: Cliente = {
  id: 'c1',
  nombre: 'Textiles Atuntaqui',
  telefono: '062 906 111',
  direccion: 'Av. Julio Andrade 5-20',
  notas: null,
  creadoEn: '2026-09-01T00:00:00.000Z',
  envios: 12,
  monto: 80,
  ultimoEnvio: '2026-10-07T10:00:00.000Z',
}

const ruta: Ruta = {
  id: 7,
  origen: { id: 1, nombre: 'Ibarra', activa: true },
  destino: { id: 4, nombre: 'Quito', activa: true },
  tarifaBase: 4,
  tiempoEstimadoMin: 150,
  activa: true,
  operativa: true,
}

const envio = {
  id: 'e1',
  numeroGuia: 40425,
  remitente: { nombre: 'Ana', telefono: '0991112233' },
  destinatario: { nombre: 'Almacén El Sol', telefono: '0994445566', direccion: 'Quito' },
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
  historial: [],
} as unknown as Envio

function Ubicacion() {
  const l = useLocation()
  return <p data-testid="ubicacion">{l.pathname + l.search}</p>
}

function setup(route = '/panel') {
  const fetch = mockFetch((url) => {
    if (url.includes('/dashboard/resumen')) return jsonResponse(resumen)
    if (url.includes('/clientes')) return jsonResponse([cliente])
    if (url.includes('/rutas')) return jsonResponse([ruta])
    if (url.includes('/envios')) return jsonResponse({ datos: [envio], pagina: 1, porPagina: 5, total: 1, totalPaginas: 1 })
    return jsonResponse([])
  })
  renderWithProviders(
    <>
      <DashboardPage />
      <Ubicacion />
    </>,
    { route, path: '/panel', extraRoutes: [{ path: '/envios', element: <Ubicacion /> }] },
  )
  return fetch
}

/** Parámetros de la última consulta del resumen. */
const ultimoResumen = (fetch: ReturnType<typeof mockFetch>) => {
  const urls = fetch.mock.calls.map(([u]) => String(u)).filter((u) => u.includes('/dashboard/resumen'))
  return new URL(urls.at(-1)!, 'http://x').searchParams
}

describe('DashboardPage', () => {
  it('muestra KPIs derivados y los estados agrupados por significado', async () => {
    setup()
    expect(await screen.findByText('75%')).toBeInTheDocument() // 3 entregados / 4 cerrados
    expect(screen.getByText('42 piezas')).toBeInTheDocument()
    const gestion = screen.getByRole('region', { name: 'Requieren gestión' })
    expect(within(gestion).getByText('2')).toBeInTheDocument() // novedad + no entregado
    expect(within(gestion).getByText('Novedad')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'En curso' })).getByText('4')).toBeInTheDocument()
    expect(await screen.findByText('Almacén El Sol')).toBeInTheDocument() // recientes
  })

  it('cada estado enlaza al listado filtrado', async () => {
    setup()
    const lista = await screen.findByRole('region', { name: 'Cerrados' })
    await userEvent.click(within(lista).getByText('Entregado'))
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/envios?estado=ENTREGADO')
  })

  it('la distribución alterna entre ruta, carga y pago, y enlaza por ruta', async () => {
    setup()
    await userEvent.click(await screen.findByRole('tab', { name: 'Carga' }))
    expect(screen.getByText('30 pzs')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Pago' }))
    await userEvent.click(screen.getByRole('tab', { name: '$' }))
    expect(screen.getByText('+$16,00')).toHaveClass('text-brand-green-text')

    await userEvent.click(screen.getByRole('tab', { name: 'Ruta' }))
    await userEvent.click(await screen.findByRole('link', { name: /Ibarra → Quito/ }))
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/envios?rutaId=7')
  })

  it('muestra los ingresos en verde de marca con signo +', async () => {
    setup()
    const ingresos = await screen.findByText('+$36,00')
    expect(ingresos).toHaveClass('text-brand-green-text')
    expect(screen.getByText('$16,00')).toBeInTheDocument() // por cobrar
  })

  it('consulta los últimos 30 días por defecto y cambia de periodo', async () => {
    const fetch = setup()
    await screen.findByText('+$36,00')
    expect(ultimoResumen(fetch).get('desde')).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    await userEvent.click(screen.getByRole('tab', { name: 'Todo' }))
    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('periodo=todo')
    expect(ultimoResumen(fetch).get('desde')).toBeNull()
  })

  it('al tocar un día de la tendencia filtra el resumen por ese día', async () => {
    const fetch = setup()
    await userEvent.click(await screen.findByRole('button', { name: /6 de octubre/i }))
    expect(ultimoResumen(fetch).get('desde')).toBe('2026-10-06')
    expect(ultimoResumen(fetch).get('hasta')).toBe('2026-10-06')
    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtro de fecha' }))
    expect(ultimoResumen(fetch).get('desde')).not.toBe('2026-10-06')
  })

  it('filtra por cliente desde el buscador o desde el ranking, y los enlaces lo conservan', async () => {
    const fetch = setup()
    await userEvent.type(await screen.findByRole('combobox', { name: 'Filtrar por cliente' }), 'texti')
    await userEvent.click(await screen.findByRole('option', { name: /Textiles Atuntaqui/ }))
    expect(ultimoResumen(fetch).get('clienteId')).toBe('c1')
    expect(await screen.findByText(/Desde que es cliente/)).toBeInTheDocument()
    expect(screen.getByText('+$80,00')).toBeInTheDocument()
    // Los recientes también se piden solo del cliente
    expect(fetch.mock.calls.some(([u]) => String(u).includes('/envios?') && String(u).includes('clienteId=c1'))).toBe(true)

    await userEvent.click(screen.getAllByRole('button', { name: 'Quitar filtro de cliente' })[0]!)
    expect(ultimoResumen(fetch).get('clienteId')).toBeNull()

    await userEvent.click(await screen.findByRole('button', { name: 'Filtrar el resumen por Textiles Atuntaqui' }))
    expect(ultimoResumen(fetch).get('clienteId')).toBe('c1')
    const cerrados = await screen.findByRole('region', { name: 'Cerrados' })
    await userEvent.click(within(cerrados).getByText('Entregado'))
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/envios?estado=ENTREGADO&clienteId=c1')
  })

  it('abre el resumen ya filtrado desde un enlace (?cliente=)', async () => {
    const fetch = setup('/panel?cliente=c1&periodo=7d')
    expect(await screen.findByText(/Desde que es cliente/)).toBeInTheDocument()
    expect(ultimoResumen(fetch).get('clienteId')).toBe('c1')
  })
})
