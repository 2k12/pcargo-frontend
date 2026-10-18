import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { EnvioReparto } from '@/types/api'
import { BuscarGuiaSheet } from './BuscarGuiaSheet'

afterEach(() => {
  vi.unstubAllGlobals()
})

const envio = {
  id: 'e1',
  numeroGuia: 40461,
  estado: 'EN_REPARTO',
  destinatario: { nombre: 'Almacén El Sol', telefono: '0994445566', direccion: 'Av. 10 de Agosto' },
  ruta: { id: 1, origen: 'Ibarra', destino: 'Quito' },
  zona: 'URBANA',
  items: [{ tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 0.2 }],
  totalPiezas: 1,
  porCobrar: 0,
  entrega: null,
  evidencia: null,
} as unknown as EnvioReparto

describe('BuscarGuiaSheet', () => {
  it('sin cámara compatible, busca por el número escrito (o el texto del QR) y muestra la entrega', async () => {
    const fetch = mockFetch((url) =>
      url.endsWith('/repartidor/envios/guia/40461') ? jsonResponse(envio) : jsonResponse({ error: { code: 'NO_ENCONTRADO', message: 'No' } }, 404),
    )
    renderWithProviders(<BuscarGuiaSheet abierta onCerrar={vi.fn()} />)
    // jsdom no tiene BarcodeDetector: no se ofrece la cámara.
    expect(screen.queryByRole('button', { name: /cámara/ })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Número de guía'), 'https://pcargo.ec/seguimiento/0040461')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByRole('article', { name: 'Guía 40461' })).toBeInTheDocument()
    expect(fetch.mock.calls.some(([u]) => String(u).endsWith('/repartidor/envios/guia/40461'))).toBe(true)
  })

  it('avisa si la guía no está asignada al repartidor', async () => {
    mockFetch(() => jsonResponse({ error: { code: 'NO_ENCONTRADO', message: 'No encontrado' } }, 404))
    renderWithProviders(<BuscarGuiaSheet abierta onCerrar={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Número de guía'), '999')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La guía 999 no está asignada a ti.')
  })

  it('rechaza un texto que no es una guía sin consultar', async () => {
    const fetch = mockFetch(() => jsonResponse({}))
    renderWithProviders(<BuscarGuiaSheet abierta onCerrar={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Número de guía'), 'abc')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByText(/Ingresa solo los números de la guía/)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
