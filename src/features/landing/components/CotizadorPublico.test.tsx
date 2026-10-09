import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TIPOS_CARGA_DEFAULT } from '@/features/envios/domain'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { CatalogoPublico, CotizacionRequest } from '@/types/api'
import { CotizadorPublico } from './CotizadorPublico'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ibarra = { id: 1, nombre: 'Ibarra', activa: true }
const catalogo: CatalogoPublico = {
  ciudades: [ibarra],
  tiposCarga: TIPOS_CARGA_DEFAULT,
  rutas: [{ id: 1, origen: ibarra, destino: ibarra, tiempoEstimadoMin: 40, activa: true, operativa: true }],
}

/** Backend simulado con la regla v8 para una sola línea (solo para verificar lo que muestra la UI). */
function cotizarV8(req: CotizacionRequest) {
  const { tipoCarga, cantidad, pesoKg } = req.items[0]!
  const tipo = TIPOS_CARGA_DEFAULT.find((t) => t.codigo === tipoCarga)!
  const mayoreo = !!tipo.mayoreo && cantidad > tipo.mayoreo.minimoExclusivo
  const costoUnitario = mayoreo ? tipo.mayoreo!.precio : req.zona === 'RURAL' && tipo.precioRural ? tipo.precioRural : tipo.precio
  const subtotal = Math.round(costoUnitario * cantidad * 100) / 100
  return {
    costo: subtotal,
    zona: req.zona ?? 'URBANA',
    totalPiezas: cantidad,
    pesoTotalKg: cantidad * pesoKg,
    items: [{ tipoCarga, cantidad, pesoKg, costoUnitario, subtotal, mayoreo }],
  }
}

async function preparar() {
  const user = userEvent.setup()
  const fetchMock = mockFetch((url, init) =>
    url.endsWith('/publico/cotizar') ? jsonResponse(cotizarV8(JSON.parse(String(init!.body)))) : jsonResponse({}, 404),
  )
  renderWithProviders(<CotizadorPublico catalogo={catalogo} />)
  for (const nombre of ['Ciudad de origen', 'Ciudad de destino']) {
    await user.click(screen.getByRole('combobox', { name: nombre }))
    await user.click(await screen.findByRole('option', { name: 'Ibarra' }))
  }
  const ultimaSolicitud = () => {
    const llamadas = fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/publico/cotizar'))
    return JSON.parse(String(llamadas.at(-1)![1]!.body)) as CotizacionRequest
  }
  return { user, ultimaSolicitud }
}

describe('CotizadorPublico (contrato v8)', () => {
  it('muestra los 7 tipos y pide la zona solo para la tela', async () => {
    const { user } = await preparar()
    expect(screen.getAllByRole('radio')).toHaveLength(7)
    await user.click(screen.getByRole('radio', { name: /Paquete/ }))
    expect(screen.queryByRole('radiogroup', { name: 'Zona de entrega' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Rollo de tela/ }))
    expect(screen.getByRole('radiogroup', { name: 'Zona de entrega' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Urbana' })).toHaveAttribute('aria-checked', 'true')
  })

  it('la zona rural cambia el precio de la tela y se envía en la solicitud', async () => {
    const { user, ultimaSolicitud } = await preparar()
    await user.click(screen.getByRole('radio', { name: /Rollo de tela/ }))
    await user.clear(screen.getByLabelText('Cantidad'))
    await user.type(screen.getByLabelText('Cantidad'), '10')
    await user.type(screen.getByLabelText('Peso por unidad (kg)'), '5')
    await waitFor(() => expect(screen.getByTestId('cotizador-piezas')).toHaveTextContent('$1,25 c/u'))
    expect(screen.getByText('$12,50')).toBeInTheDocument()
    expect(ultimaSolicitud().zona).toBe('URBANA')

    await user.click(screen.getByRole('radio', { name: 'Rural' }))
    await waitFor(() => expect(screen.getByTestId('cotizador-piezas')).toHaveTextContent('$1,50 c/u · zona rural'))
    expect(screen.getByText('$15,00')).toBeInTheDocument()
    expect(ultimaSolicitud()).toMatchObject({ rutaId: 1, zona: 'RURAL', items: [{ tipoCarga: 'TELA', cantidad: 10, pesoKg: 5 }] })
    expect(screen.getByText(/Valor referencial/)).toBeInTheDocument()
  })

  it('con más de 50 rollos indica el precio por volumen ($1,00 c/u en cualquier zona)', async () => {
    const { user } = await preparar()
    await user.click(screen.getByRole('radio', { name: /Rollo de tela/ }))
    await user.click(screen.getByRole('radio', { name: 'Rural' }))
    await user.clear(screen.getByLabelText('Cantidad'))
    await user.type(screen.getByLabelText('Cantidad'), '60')
    await user.type(screen.getByLabelText('Peso por unidad (kg)'), '2')
    expect(await screen.findByTestId('cotizador-mayoreo')).toHaveTextContent('Más de 50 rollos de tela: $1,00 c/u')
    expect(screen.getByText('$60,00')).toBeInTheDocument()
  })
})
