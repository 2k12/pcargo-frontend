import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '@/test/utils'
import type { CotizacionRequest } from '@/types/api'
import { CotizacionPanel } from './CotizacionPanel'

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPanel(request: CotizacionRequest | null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CotizacionPanel request={request} />
    </QueryClientProvider>,
  )
}

describe('CotizacionPanel', () => {
  it('pide completar datos cuando no hay solicitud', () => {
    const fetchMock = mockFetch(() => jsonResponse({}))
    renderPanel(null)
    expect(screen.getByText(/Completa la ruta y los ítems/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('consulta /envios/cotizar con varios ítems y muestra total y desglose por línea', async () => {
    const request: CotizacionRequest = {
      rutaId: 5,
      items: [
        { tipoCarga: 'PAQUETE', cantidad: 5, pesoKg: 2 },
        { tipoCarga: 'CARTON', cantidad: 20, pesoKg: 8 },
      ],
    }
    const fetchMock = mockFetch(() =>
      jsonResponse({
        costo: 157.5,
        tarifaBase: 2.5,
        totalPiezas: 25,
        pesoTotalKg: 170,
        items: [
          { tipoCarga: 'PAQUETE', cantidad: 5, pesoKg: 2, factor: 1.4, recargoPeso: 0, costoUnitario: 3.5, subtotal: 17.5 },
          { tipoCarga: 'CARTON', cantidad: 20, pesoKg: 8, factor: 1.6, recargoPeso: 3, costoUnitario: 7, subtotal: 140 },
        ],
      }),
    )
    renderPanel(request)

    expect(await screen.findByTestId('cotizacion-total')).toHaveTextContent(/157,50/)
    expect(screen.getByText(/25 piezas · 170 kg/)).toBeInTheDocument()
    const desglose = screen.getByRole('list', { name: 'Desglose de la cotización' })
    expect(desglose).toHaveTextContent('5 paquetes de 2 kg × $3,50')
    expect(desglose).toHaveTextContent('20 cartones de 8 kg × $7,00')
    expect(desglose).toHaveTextContent('$140,00')

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/envios/cotizar')
    expect(init!.method).toBe('POST')
    expect(JSON.parse(init!.body as string)).toEqual(request)
  })

  it('muestra el error de validación del backend', async () => {
    mockFetch(() => jsonResponse({ error: { code: 'PESO_EXCEDIDO', message: 'Peso máximo excedido' } }, 422))
    renderPanel({ rutaId: 5, items: [{ tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 0.4 }] })
    expect(await screen.findByText('Peso máximo excedido')).toBeInTheDocument()
  })
})
