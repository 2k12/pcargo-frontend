import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { CajaPendiente, CierreCaja, Cobro, Pagina } from '@/types/api'
import { CajaPage } from './CajaPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const cobro = (n: number, monto: number): Cobro => ({
  id: `k${n}`,
  tipo: 'CONTRA_ENTREGA',
  monto,
  envioId: `e${n}`,
  numeroGuia: 40460 + n,
  formaPago: 'AL_COBRO',
  usuario: { id: 'u3', nombre: 'Rider Uno' },
  fecha: '2026-10-18T15:00:00.000Z',
  cierreId: null,
})

const pendiente: CajaPendiente = {
  usuario: { id: 'u3', nombre: 'Rider Uno', rol: 'REPARTIDOR' },
  total: 25,
  cantidad: 2,
  porTipo: [{ tipo: 'CONTRA_ENTREGA', cantidad: 2, monto: 25 }],
  desde: '2026-10-18T15:00:00.000Z',
}

const cierre: CierreCaja = {
  id: 'cc11aa22-0000-0000-0000-000000000000',
  usuario: pendiente.usuario,
  recibidoPor: { id: 'u2', nombre: 'Operador Ibarra' },
  fecha: '2026-10-17T22:00:00.000Z',
  esperado: 10,
  entregado: 10,
  diferencia: 0,
  cantidad: 1,
  nota: null,
  porTipo: [{ tipo: 'ORIGEN', cantidad: 1, monto: 10 }],
}

const pagina = (datos: CierreCaja[]): Pagina<CierreCaja> => ({ datos, pagina: 1, porPagina: 20, total: datos.length, totalPaginas: datos.length ? 1 : 0 })

function servidor(onCerrar = vi.fn((body: unknown) => jsonResponse({ ...cierre, ...(body as object), id: 'nuevo' }, 201))) {
  const fetch = mockFetch((url, init) => {
    const ruta = url.split('?')[0]!
    if (ruta.endsWith('/caja/pendientes')) return jsonResponse([pendiente])
    if (ruta.endsWith('/caja/pendientes/u3')) return jsonResponse({ ...pendiente, cobros: [cobro(1, 10), cobro(2, 15)] })
    if (ruta.endsWith('/caja/cierres') && init?.method === 'POST') return onCerrar(JSON.parse(init.body as string))
    if (ruta.endsWith('/caja/cierres')) return jsonResponse(pagina([cierre]))
    if (ruta.endsWith(`/caja/cierres/${cierre.id}`)) return jsonResponse({ ...cierre, cobros: [cobro(9, 10)] })
    return jsonResponse([])
  })
  return { fetch, onCerrar }
}

describe('CajaPage — pendientes', () => {
  it('muestra lo que cada persona debe entregar y, al abrir la tarjeta, sus cobros con número de guía', async () => {
    servidor()
    renderWithProviders(<CajaPage />)
    const tarjeta = await screen.findByRole('listitem', { name: 'Caja de Rider Uno' })
    expect(within(tarjeta).getAllByText(/25,00/).length).toBeGreaterThan(0)
    expect(within(tarjeta).getByText('2 cobros')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Contra entrega')).toBeInTheDocument()

    await userEvent.click(within(tarjeta).getByRole('button', { name: 'Ver cobros' }))
    expect(await within(tarjeta).findByText('Guía 40461')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Guía 40462')).toBeInTheDocument()
  })

  it('el historial lista los cierres y abre su detalle con los cobros', async () => {
    servidor()
    renderWithProviders(<CajaPage />)
    const fila = await screen.findByRole('row', { name: /Rider Uno/ })
    expect(within(fila).getByText('Cuadra')).toBeInTheDocument()
    await userEvent.click(fila)
    expect(await screen.findByText('Cierre CC11AA22')).toBeInTheDocument()
    expect(await screen.findByText('Guía 40469')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Imprimir comprobante/ })).toBeInTheDocument()
  })
})

describe('CerrarCajaDialog — nota obligatoria si no cuadra', () => {
  it('calcula la diferencia en vivo y no cierra sin nota cuando falta dinero', async () => {
    const { onCerrar } = servidor()
    const user = userEvent.setup()
    renderWithProviders(<CajaPage />)
    const tarjeta = await screen.findByRole('listitem', { name: 'Caja de Rider Uno' })
    await user.click(within(tarjeta).getByRole('button', { name: 'Cerrar caja' }))

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByTestId('cierre-esperado')).toHaveTextContent('25,00')
    await user.type(within(dialogo).getByLabelText('Monto entregado'), '20')
    const diferencia = within(dialogo).getByTestId('cierre-diferencia')
    expect(diferencia).toHaveTextContent(/Faltan .*5,00/)
    expect(diferencia).toHaveClass('text-destructive')
    expect(within(dialogo).getByText('(obligatoria: no cuadra)')).toBeInTheDocument()

    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar caja' }))
    expect(await within(dialogo).findByText(/Explica la diferencia/)).toBeInTheDocument()
    expect(onCerrar).not.toHaveBeenCalled()

    await user.type(within(dialogo).getByLabelText(/Nota/), 'Faltó el vuelto de una guía')
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar caja' }))
    await vi.waitFor(() => expect(onCerrar).toHaveBeenCalledTimes(1))
    expect(onCerrar.mock.calls[0]![0]).toEqual({ usuarioId: 'u3', montoEntregado: 20, nota: 'Faltó el vuelto de una guía' })
  })

  it('si cuadra (entrega exacta) cierra sin nota y muestra el sobrante en otro tono', async () => {
    const { onCerrar } = servidor()
    const user = userEvent.setup()
    renderWithProviders(<CajaPage />)
    const tarjeta = await screen.findByRole('listitem', { name: 'Caja de Rider Uno' })
    await user.click(within(tarjeta).getByRole('button', { name: 'Cerrar caja' }))
    const dialogo = await screen.findByRole('dialog')

    await user.type(within(dialogo).getByLabelText('Monto entregado'), '25,50')
    expect(within(dialogo).getByTestId('cierre-diferencia')).toHaveTextContent(/Sobran .*0,50/)
    await user.clear(within(dialogo).getByLabelText('Monto entregado'))
    await user.click(within(dialogo).getByRole('button', { name: 'Entrega exacta' }))
    expect(within(dialogo).getByTestId('cierre-diferencia')).toHaveTextContent('Cuadra')
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar caja' }))
    await vi.waitFor(() => expect(onCerrar).toHaveBeenCalledWith({ usuarioId: 'u3', montoEntregado: 25 }))
  })
})
