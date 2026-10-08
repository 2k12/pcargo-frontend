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
    expect(screen.getByText(/Completa ruta, tipo y peso/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('consulta /envios/cotizar y muestra el total y desglose', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ costo: 9.4, tarifaBase: 6, factor: 1.4, recargoPeso: 1 }))
    renderPanel({ rutaId: 5, tipoCarga: 'PAQUETE', pesoKg: 4 })

    expect(await screen.findByTestId('cotizacion-total')).toHaveTextContent(/9,40/)
    expect(screen.getByText('×1.4')).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/envios/cotizar')
    expect(init!.method).toBe('POST')
    expect(JSON.parse(init!.body as string)).toEqual({ rutaId: 5, tipoCarga: 'PAQUETE', pesoKg: 4 })
  })

  it('muestra el error de validación del backend', async () => {
    mockFetch(() => jsonResponse({ error: { code: 'PESO_EXCEDIDO', message: 'Peso máximo excedido' } }, 422))
    renderPanel({ rutaId: 5, tipoCarga: 'SOBRE', pesoKg: 0.4 })
    expect(await screen.findByText('Peso máximo excedido')).toBeInTheDocument()
  })
})
