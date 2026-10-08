import { screen, within } from '@testing-library/react'
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
  remitente: { nombre: 'Textiles Atuntaqui S.A.', telefono: '0991112233' },
  destinatario: { nombre: 'Almacén El Sol', telefono: '0994445566', direccion: 'Av. 10 de Agosto N20-15, Quito' },
  ruta: { id: 13, origen: 'Atuntaqui', destino: 'Quito' },
  items: [
    { tipoCarga: 'PAQUETE', cantidad: 5, pesoKg: 2, costoUnitario: 7.7, subtotal: 38.5 },
    { tipoCarga: 'CARTON', cantidad: 20, pesoKg: 8, costoUnitario: 11.8, subtotal: 236 },
  ],
  totalPiezas: 25,
  pesoTotalKg: 170,
  descripcion: null,
  costo: 274.5,
  formaPago: 'AL_COBRO',
  estado: 'NO_ENTREGADO',
  registro: { fecha: '2026-10-08T03:24:55.786Z', operador: 'Operador Ibarra' },
  entrega: {
    resultado: 'NO_ENTREGADO',
    fecha: '2026-10-08T05:00:00.000Z',
    operador: 'Administrador PCargo',
    nota: 'Local cerrado',
  },
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
    expect(screen.getAllByText('$274,50').length).toBeGreaterThan(0)
    expect(screen.getByText('170 kg')).toBeInTheDocument()

    expect(screen.getByText('Operador Ibarra')).toBeInTheDocument()
    const gestion = screen.getByTestId('gestion-entrega')
    expect(within(gestion).getByText('No entregado')).toBeInTheDocument()
    expect(within(gestion).getByText('Administrador PCargo')).toBeInTheDocument()
    expect(within(gestion).getByText('Local cerrado')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Reintentar entrega' })).toBeInTheDocument()
  })
})
