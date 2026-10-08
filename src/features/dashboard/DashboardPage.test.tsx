import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Envio, Resumen, Ruta } from '@/types/api'
import { DashboardPage } from './DashboardPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const resumen: Resumen = {
  totalEnvios: 10,
  totalPiezas: 42,
  ingresos: 36,
  porEstado: { REGISTRADO: 1, EN_TRANSITO: 2, EN_REPARTO: 1, ENTREGADO: 3, NO_ENTREGADO: 1, NOVEDAD: 1, CANCELADO: 1 },
  porTipo: [
    { tipoCarga: 'SOBRE', piezas: 12 },
    { tipoCarga: 'CARTON', piezas: 30 },
  ],
  porRuta: [{ ruta: 'Ibarra → Quito', total: 6 }],
  porFormaPago: [
    { formaPago: 'PAGADO', envios: 7, monto: 20 },
    { formaPago: 'AL_COBRO', envios: 2, monto: 16 },
  ],
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
  codigo: 'PC-ABC12345',
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

function setup() {
  mockFetch((url) => {
    if (url.includes('/dashboard/resumen')) return jsonResponse(resumen)
    if (url.includes('/rutas')) return jsonResponse([ruta])
    if (url.includes('/envios')) return jsonResponse([envio])
    return jsonResponse([])
  })
  return renderWithProviders(<DashboardPage />, {
    route: '/panel',
    path: '/panel',
    extraRoutes: [{ path: '/envios', element: <Ubicacion /> }],
  })
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
    expect(screen.getByText(/16,00/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Ruta' }))
    await userEvent.click(await screen.findByRole('link', { name: /Ibarra → Quito/ }))
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/envios?rutaId=7')
  })
})
