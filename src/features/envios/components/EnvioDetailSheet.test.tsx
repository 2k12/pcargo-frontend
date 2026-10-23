import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Envio } from '@/types/api'
import { EnvioDetailSheet } from './EnvioDetailSheet'

afterEach(() => {
  vi.unstubAllGlobals()
})

const envio: Envio = {
  id: '30f4b9af-89f6-45c0-aa6d-c505fdb4c0eb',
  numeroGuia: 7,
  clienteId: null,
  remitente: { nombre: 'Textiles Atuntaqui S.A.', telefono: '0991112233', direccion: 'Sucre 5-12' },
  destinatario: { nombre: 'Almacén El Sol', telefono: '0994445566', direccion: 'Av. 10 de Agosto N20-15, Quito' },
  ruta: { id: 13, origen: 'Atuntaqui', destino: 'Quito' },
  items: [
    { tipoCarga: 'PAQUETE', cantidad: 5, pesoKg: 2, costoUnitario: 3, subtotal: 15 },
    { tipoCarga: 'TELA', cantidad: 20, pesoKg: 8, costoUnitario: 1.5, subtotal: 30 },
  ],
  totalPiezas: 25,
  pesoTotalKg: 170,
  zona: 'RURAL',
  descripcion: null,
  costo: 45,
  costoAdicional: 0,
  formaPago: 'AL_COBRO',
  estado: 'NO_ENTREGADO',
  fechaGuia: '2026-10-07',
  registro: { fecha: '2026-10-08T03:24:55.786Z', operador: 'Operador Ibarra' },
  entrega: {
    resultado: 'NO_ENTREGADO',
    fecha: '2026-10-08T05:00:00.000Z',
    operador: 'Administrador PCargo',
    nota: 'Local cerrado',
  },
  evidencia: null,
  origen: { canal: 'PANEL', integracionId: null, integracion: null },
  referenciaExterna: null,
  creadoEn: '2026-10-08T03:24:55.786Z',
  actualizadoEn: '2026-10-08T05:00:00.000Z',
  repartidor: null,
  asignadoEn: null,
  anonimizadoEn: null,
  historial: [],
}

describe('EnvioDetailSheet', () => {
  it('muestra ítems con totales, forma de pago, registro y última gestión con operador', async () => {
    mockFetch((url) => (url.endsWith(`/envios/${envio.id}`) ? jsonResponse(envio) : jsonResponse({}, 404)))
    renderWithProviders(<EnvioDetailSheet envioId={envio.id} onClose={vi.fn()} />)

    expect(await screen.findByText('Guía 7')).toBeInTheDocument()
    expect(screen.getByText('Al cobro')).toBeInTheDocument()
    expect(screen.getAllByText('$45,00').length).toBeGreaterThan(0)
    expect(screen.getByText('170 kg')).toBeInTheDocument()
    // Zona de entrega (contrato v8) junto al destinatario, y el tipo nuevo con su etiqueta.
    expect(screen.getByTestId('zona-entrega')).toHaveTextContent('zona rural')
    expect(screen.getByText('Rollo de tela')).toBeInTheDocument()

    expect(screen.getByText('Operador Ibarra')).toBeInTheDocument()
    const gestion = screen.getByTestId('gestion-entrega')
    expect(within(gestion).getByText('No entregado')).toBeInTheDocument()
    expect(within(gestion).getByText('Administrador PCargo')).toBeInTheDocument()
    expect(within(gestion).getByText('Local cerrado')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Reintentar entrega' })).toBeInTheDocument()
    // Dirección del remitente (contrato v9) y acciones de la guía imprimible.
    expect(screen.getByText(/Sucre 5-12/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Imprimir guía' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descargar guía PDF' })).toBeInTheDocument()
    // Sin entregar: todavía no se pide la prueba de entrega.
    expect(screen.queryByRole('region', { name: 'Prueba de entrega' })).not.toBeInTheDocument()
  })

  it('al marcar ENTREGADO pide la prueba de entrega y enfoca el nombre de quien recibió', async () => {
    const enReparto: Envio = { ...envio, estado: 'EN_REPARTO', entrega: null }
    const entregado: Envio = {
      ...envio,
      estado: 'ENTREGADO',
      entrega: { resultado: 'ENTREGADO', fecha: '2026-10-08T06:00:00.000Z', operador: 'Operador Ibarra', nota: null },
    }
    mockFetch((url, init) => {
      if (url.endsWith('/estado') && init?.method === 'PATCH') return jsonResponse(entregado)
      return url.endsWith(`/envios/${envio.id}`) ? jsonResponse(enReparto) : jsonResponse({}, 404)
    })
    renderWithProviders(<EnvioDetailSheet envioId={envio.id} onClose={vi.fn()} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Marcar entregado' }))
    const seccion = await screen.findByRole('region', { name: 'Prueba de entrega' })
    expect(within(seccion).getByLabelText('Nombre de quien recibió')).toHaveFocus()
    expect(within(seccion).getByLabelText('Foto de la guía firmada')).toHaveAttribute('capture', 'environment')
  })

  it('envío por API: destaca la integración y muestra la referencia del pedido copiable (contrato v10)', async () => {
    const user = userEvent.setup()
    const porApi: Envio = {
      ...envio,
      origen: { canal: 'API', integracionId: 'i1', integracion: 'Tienda Kichwa' },
      referenciaExterna: 'PED-1001',
    }
    mockFetch((url) => (url.endsWith(`/envios/${envio.id}`) ? jsonResponse(porApi) : jsonResponse({}, 404)))
    renderWithProviders(<EnvioDetailSheet envioId={envio.id} onClose={vi.fn()} />)

    expect(await screen.findByTestId('origen-badge')).toHaveTextContent('API · Tienda Kichwa')
    const ref = screen.getByTestId('referencia-externa')
    expect(ref).toHaveTextContent('Ref. pedido · Tienda Kichwa')
    expect(ref).toHaveTextContent('PED-1001')
    await user.click(within(ref).getByRole('button', { name: 'Copiar referencia del pedido' }))
    expect(await navigator.clipboard.readText()).toBe('PED-1001')
  })

  it('envío del panel: insignia «Panel» y sin referencia externa', async () => {
    mockFetch((url) => (url.endsWith(`/envios/${envio.id}`) ? jsonResponse(envio) : jsonResponse({}, 404)))
    renderWithProviders(<EnvioDetailSheet envioId={envio.id} onClose={vi.fn()} />)
    expect(await screen.findByTestId('origen-badge')).toHaveTextContent('Panel')
    expect(screen.queryByTestId('referencia-externa')).not.toBeInTheDocument()
  })
})

describe('EnvioDetailSheet — repartidor y datos anonimizados (contrato v12)', () => {
  const asignado: Envio = {
    ...envio,
    estado: 'EN_REPARTO',
    repartidor: { id: 'u3', nombre: 'Rider Uno' },
    asignadoEn: '2026-10-08T06:00:00.000Z',
  }

  it('muestra el repartidor asignado y permite reasignarlo', async () => {
    const asignar = vi.fn((_body: unknown) => jsonResponse({ asignados: 1 }))
    mockFetch((url, init) => {
      if (url.endsWith(`/envios/${envio.id}`)) return jsonResponse(asignado)
      if (url.endsWith('/usuarios/repartidores')) return jsonResponse([{ id: 'u3', nombre: 'Rider Uno' }, { id: 'u4', nombre: 'Ana Moto' }])
      if (url.endsWith('/envios/asignar') && init?.method === 'POST') return asignar(JSON.parse(init.body as string))
      return jsonResponse({}, 404)
    })
    renderWithProviders(<EnvioDetailSheet envioId={envio.id} onClose={vi.fn()} />)

    const bloque = await screen.findByTestId('repartidor')
    expect(within(bloque).getByText('Rider Uno')).toBeInTheDocument()
    await userEvent.click(within(bloque).getByRole('button', { name: 'Reasignar' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /Ana Moto/ }))
    await vi.waitFor(() => expect(asignar).toHaveBeenCalledWith({ envioIds: [envio.id], repartidorId: 'u4' }))
  })

  it('un envío terminado no ofrece asignar y avisa si sus datos personales se eliminaron', async () => {
    mockFetch((url) =>
      url.endsWith(`/envios/${envio.id}`)
        ? jsonResponse({ ...envio, estado: 'ENTREGADO', anonimizadoEn: '2027-10-08T05:00:00.000Z' })
        : jsonResponse([]),
    )
    renderWithProviders(<EnvioDetailSheet envioId={envio.id} onClose={vi.fn()} />)
    expect(await screen.findByTestId('anonimizado')).toHaveTextContent('Datos personales eliminados')
    const bloque = screen.getByTestId('repartidor')
    expect(within(bloque).getByText('Sin asignar')).toBeInTheDocument()
    expect(within(bloque).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('EnvioDetailSheet — costo adicional (contrato v15)', () => {
  it('con adicional muestra el desglose: tarifa, costo adicional y total', async () => {
    const conAdicional: Envio = { ...envio, costo: 46.5, costoAdicional: 1.5 }
    mockFetch((url) => (url.endsWith(`/envios/${envio.id}`) ? jsonResponse(conAdicional) : jsonResponse({}, 404)))
    renderWithProviders(<EnvioDetailSheet envioId={envio.id} onClose={vi.fn()} />)

    expect(await screen.findByTestId('desglose-tarifa')).toHaveTextContent('Tarifa$45,00')
    expect(screen.getByTestId('desglose-adicional')).toHaveTextContent('Costo adicional$1,50')
    const tabla = screen.getByRole('table', { name: 'Ítems del envío' })
    expect(within(tabla).getByText('Total').closest('tr')).toHaveTextContent('$46,50')
    expect(screen.getByText('incluye $1,50 adicional')).toBeInTheDocument()
  })

  it('sin adicional no muestra el desglose', async () => {
    mockFetch((url) => (url.endsWith(`/envios/${envio.id}`) ? jsonResponse(envio) : jsonResponse({}, 404)))
    renderWithProviders(<EnvioDetailSheet envioId={envio.id} onClose={vi.fn()} />)
    expect(await screen.findByText('Guía 7')).toBeInTheDocument()
    expect(screen.queryByTestId('desglose-adicional')).not.toBeInTheDocument()
    expect(screen.queryByText(/adicional/)).not.toBeInTheDocument()
  })
})
