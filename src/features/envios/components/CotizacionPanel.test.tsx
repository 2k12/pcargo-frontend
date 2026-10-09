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

  it('consulta /envios/cotizar con varios ítems y zona, y muestra total y desglose sin factor ni recargo', async () => {
    const request: CotizacionRequest = {
      rutaId: 5,
      zona: 'RURAL',
      items: [
        { tipoCarga: 'PAQUETE', cantidad: 5, pesoKg: 2 },
        { tipoCarga: 'TELA', cantidad: 20, pesoKg: 8 },
      ],
    }
    const fetchMock = mockFetch(() =>
      jsonResponse({
        costo: 45,
        zona: 'RURAL',
        totalPiezas: 25,
        pesoTotalKg: 170,
        items: [
          { tipoCarga: 'PAQUETE', cantidad: 5, pesoKg: 2, costoUnitario: 3, subtotal: 15, mayoreo: false },
          { tipoCarga: 'TELA', cantidad: 20, pesoKg: 8, costoUnitario: 1.5, subtotal: 30, mayoreo: false },
        ],
      }),
    )
    renderPanel(request)

    expect(await screen.findByTestId('cotizacion-total')).toHaveTextContent(/45,00/)
    expect(screen.getByText(/25 piezas · 170 kg · zona rural/)).toBeInTheDocument()
    const desglose = screen.getByRole('list', { name: 'Desglose de la cotización' })
    expect(desglose).toHaveTextContent('5 paquetes de 2 kg × $3,00')
    // Zona rural: el rollo de tela a $1,50.
    expect(desglose).toHaveTextContent('20 rollos de tela de 8 kg × $1,50')
    expect(desglose).toHaveTextContent('$30,00')
    expect(screen.queryByText(/tarifa base|factor|recargo/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('cotizacion-mayoreo')).not.toBeInTheDocument()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/envios/cotizar')
    expect(init!.method).toBe('POST')
    expect(JSON.parse(init!.body as string)).toEqual(request)
  })

  it('indica el precio por volumen cuando el envío lleva más de 50 rollos', async () => {
    mockFetch(() =>
      jsonResponse({
        costo: 60,
        zona: 'URBANA',
        totalPiezas: 60,
        pesoTotalKg: 120,
        items: [
          { tipoCarga: 'TELA', cantidad: 40, pesoKg: 2, costoUnitario: 1, subtotal: 40, mayoreo: true },
          { tipoCarga: 'TELA', cantidad: 20, pesoKg: 2, costoUnitario: 1, subtotal: 20, mayoreo: true },
        ],
      }),
    )
    renderPanel({
      rutaId: 5,
      items: [
        { tipoCarga: 'TELA', cantidad: 40, pesoKg: 2 },
        { tipoCarga: 'TELA', cantidad: 20, pesoKg: 2 },
      ],
    })
    expect(await screen.findByTestId('cotizacion-mayoreo')).toHaveTextContent('Más de 50 rollos de tela: $1,00 c/u')
    expect(screen.getAllByText('por volumen')).toHaveLength(2)
    expect(screen.getByTestId('cotizacion-total')).toHaveTextContent(/60,00/)
  })

  it('muestra el error de validación del backend', async () => {
    mockFetch(() => jsonResponse({ error: { code: 'PESO_EXCEDIDO', message: 'Peso máximo excedido' } }, 422))
    renderPanel({ rutaId: 5, items: [{ tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 0.4 }] })
    expect(await screen.findByText('Peso máximo excedido')).toBeInTheDocument()
  })
})
