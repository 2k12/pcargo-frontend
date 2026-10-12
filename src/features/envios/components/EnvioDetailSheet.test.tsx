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
  formaPago: 'AL_COBRO',
  estado: 'NO_ENTREGADO',
  registro: { fecha: '2026-10-08T03:24:55.786Z', operador: 'Operador Ibarra' },
  entrega: {
    resultado: 'NO_ENTREGADO',
    fecha: '2026-10-08T05:00:00.000Z',
    operador: 'Administrador PCargo',
    nota: 'Local cerrado',
  },
  evidencia: null,
  creadoEn: '2026-10-08T03:24:55.786Z',
  actualizadoEn: '2026-10-08T05:00:00.000Z',
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
})
