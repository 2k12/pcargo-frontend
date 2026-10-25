import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TIPOS_CARGA_DEFAULT } from '@/features/envios/domain'
import { hoyEC, sumarDias } from '@/features/envios/fechaGuia'
import { tokenStorage } from '@/lib/api'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { GuiaTalonario, Ruta, Talonario, TalonarioResumen } from '@/types/api'
import { TalonarioDetallePage } from './TalonarioDetallePage'
import { TalonariosPage } from './TalonariosPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const DIA_MS = 86_400_000
// Talonario de hace tres días: sus guías admiten fecha desde ese día.
const creadoEn = new Date(Date.now() - 3 * DIA_MS).toISOString()
const diaTalonario = hoyEC(Date.parse(creadoEn))

const resumen = (extra: Partial<TalonarioResumen> = {}): TalonarioResumen => ({
  id: 't1',
  desde: 40500,
  hasta: 40503,
  cantidad: 4,
  nota: 'Camión Quito – sábado',
  creadoEn,
  creadoPor: 'Operador Ibarra',
  disponibles: 2,
  usadas: 1,
  anuladas: 1,
  ...extra,
})

const guia = (numeroGuia: number, estado: GuiaTalonario['estado'], extra: Partial<GuiaTalonario> = {}): GuiaTalonario => ({
  numeroGuia,
  estado,
  envioId: null,
  motivo: null,
  actualizadoEn: null,
  ...extra,
})

const talonario: Talonario = {
  ...resumen(),
  guias: [
    guia(40500, 'USADA', { envioId: 'e1', actualizadoEn: creadoEn }),
    guia(40501, 'DISPONIBLE'),
    guia(40502, 'ANULADA', { motivo: 'Se mojó y no se lee', actualizadoEn: creadoEn }),
    guia(40503, 'DISPONIBLE'),
  ],
}

const pagina = (datos: TalonarioResumen[]) => jsonResponse({ datos, pagina: 1, porPagina: 20, total: datos.length, totalPaginas: datos.length ? 1 : 0 })

const ciudad = (id: number, nombre: string) => ({ id, nombre, activa: true })
const rutas: Ruta[] = [{ id: 7, origen: ciudad(1, 'Ibarra'), destino: ciudad(4, 'Quito'), tiempoEstimadoMin: 150, activa: true, operativa: true }]

interface Llamada {
  method: string
  url: string
  body: unknown
}

function servidor({ lista = [resumen()], crearEnvio }: { lista?: TalonarioResumen[]; crearEnvio?: () => Response } = {}) {
  tokenStorage.set('tok')
  const llamadas: Llamada[] = []
  const fetch = mockFetch((url, init) => {
    const method = init?.method ?? 'GET'
    if (method !== 'GET') llamadas.push({ method, url, body: JSON.parse(init!.body as string) })
    if (url.endsWith('/auth/me')) return jsonResponse({ id: 'u2', nombre: 'Operador Ibarra', email: 'op@pcargo.ec', rol: 'OPERADOR', clienteId: null })
    if (url.endsWith('/talonarios') && method === 'POST') {
      return jsonResponse({ ...resumen({ id: 't2', desde: 40600, hasta: 40609, cantidad: 10, disponibles: 10, usadas: 0, anuladas: 0, nota: 'Ruta norte' }), guias: [] }, 201)
    }
    if (url.endsWith('/talonarios/t1/anular')) {
      return jsonResponse({
        ...talonario,
        disponibles: 1,
        anuladas: 2,
        guias: talonario.guias.map((g) => (g.numeroGuia === 40503 ? guia(40503, 'ANULADA', { motivo: 'Guía rota' }) : g)),
      })
    }
    if (url.includes('/talonarios?')) return pagina(lista)
    if (url.endsWith('/talonarios/t1')) return jsonResponse(talonario)
    if (url.includes('/clientes')) return jsonResponse([])
    if (url.endsWith('/tipos-carga')) return jsonResponse(TIPOS_CARGA_DEFAULT)
    if (url.includes('/rutas')) return jsonResponse(rutas)
    if (url.endsWith('/envios/cotizar')) {
      return jsonResponse({
        costo: 6,
        zona: 'URBANA',
        totalPiezas: 2,
        pesoTotalKg: 6,
        items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3, costoUnitario: 3, subtotal: 6, mayoreo: false }],
      })
    }
    if (url.endsWith('/envios') && method === 'POST') {
      return crearEnvio ? crearEnvio() : jsonResponse({ id: 'e9', numeroGuia: 40501, costo: 6, costoAdicional: 0 }, 201)
    }
    return jsonResponse([])
  })
  return { llamadas, fetch }
}

describe('TalonariosPage — lista (contrato v20)', () => {
  it('muestra rango, nota, quién lo creó y el uso; filtra abiertos/todos', async () => {
    const { fetch } = servidor()
    renderWithProviders(<TalonariosPage />, { route: '/talonarios', path: '/talonarios' })
    const fila = await screen.findByRole('row', { name: /0040500–0040503/ })
    expect(within(fila).getByText('Camión Quito – sábado')).toBeInTheDocument()
    expect(within(fila).getByText('Operador Ibarra')).toBeInTheDocument()
    expect(within(fila).getByText('2 disponibles · 1 registrada · 1 anulada')).toBeInTheDocument()
    expect(within(fila).getByRole('link', { name: '0040500–0040503' })).toHaveAttribute('href', '/talonarios/t1')
    expect(fetch.mock.calls.some(([u]) => String(u).includes('/talonarios?') && String(u).includes('estado=abiertos'))).toBe(true)

    await userEvent.click(screen.getByRole('tab', { name: 'Todos' }))
    await vi.waitFor(() => expect(fetch.mock.calls.some(([u]) => String(u).includes('estado=todos'))).toBe(true))
  })

  it('sin talonarios abiertos lo dice y sugiere crear uno', async () => {
    servidor({ lista: [] })
    renderWithProviders(<TalonariosPage />, { route: '/talonarios', path: '/talonarios' })
    expect(await screen.findByText('No hay talonarios abiertos')).toBeInTheDocument()
    expect(screen.getByText(/Reserva uno con «Nuevo talonario»/)).toBeInTheDocument()
  })

  it('«Nuevo talonario»: 10 por defecto, valida 1–50 y, al crearlo, ofrece imprimir o descargar', async () => {
    const { llamadas } = servidor()
    const user = userEvent.setup()
    renderWithProviders(<TalonariosPage />, { route: '/talonarios', path: '/talonarios' })
    await user.click(screen.getByRole('button', { name: 'Nuevo talonario' }))
    const dialogo = await screen.findByRole('dialog')
    const cantidad = within(dialogo).getByLabelText('Cantidad de guías')
    expect(cantidad).toHaveValue(10)

    await user.clear(cantidad)
    await user.type(cantidad, '60')
    await user.click(within(dialogo).getByRole('button', { name: 'Reservar números' }))
    expect(await within(dialogo).findByText('Máximo 50 guías por talonario')).toBeInTheDocument()
    expect(llamadas).toHaveLength(0)

    await user.clear(cantidad)
    await user.type(cantidad, '10')
    await user.type(within(dialogo).getByLabelText('Nota (opcional)'), 'Ruta norte')
    await user.click(within(dialogo).getByRole('button', { name: 'Reservar números' }))

    expect(await within(dialogo).findByText('Talonario reservado')).toBeInTheDocument()
    expect(llamadas[0]).toMatchObject({ method: 'POST', body: { cantidad: 10, nota: 'Ruta norte' } })
    expect(within(dialogo).getByText('0040600–0040609')).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Imprimir guías' })).toBeEnabled()
    expect(within(dialogo).getByRole('button', { name: 'Descargar PDF' })).toBeEnabled()
    expect(within(dialogo).getByRole('link', { name: 'Ver talonario' })).toHaveAttribute('href', '/talonarios/t2')
  })
})

describe('TalonarioDetallePage', () => {
  const abrir = () => renderWithProviders(<TalonarioDetallePage />, { route: '/talonarios/t1', path: '/talonarios/:id' })

  it('muestra el estado de cada número: registrada con enlace al envío, anulada con su motivo, disponibles con acciones', async () => {
    servidor()
    abrir()
    expect(await screen.findByRole('heading', { name: '0040500–0040503' })).toBeInTheDocument()
    expect(screen.getByText('Camión Quito – sábado')).toBeInTheDocument()

    const usada = screen.getByRole('row', { name: /0040500/ })
    expect(within(usada).getByText('Registrada')).toBeInTheDocument()
    expect(within(usada).getByRole('link', { name: 'Ver envío de la guía 0040500' })).toHaveAttribute('href', '/envios?guia=40500')

    const anulada = screen.getByRole('row', { name: /0040502/ })
    expect(within(anulada).getByText('Anulada')).toBeInTheDocument()
    expect(within(anulada).getByText('Se mojó y no se lee')).toBeInTheDocument()
    expect(within(anulada).queryByRole('button')).not.toBeInTheDocument()

    const disponible = screen.getByRole('row', { name: /0040501/ })
    expect(within(disponible).getByRole('button', { name: 'Registrar guía 0040501' })).toBeInTheDocument()
    expect(within(disponible).getByRole('button', { name: 'Anular guía 0040501' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Imprimir disponibles (2)' })).toBeEnabled()
  })

  it('anular pide un motivo (mínimo 3) y confirma', async () => {
    const { llamadas } = servidor()
    const user = userEvent.setup()
    abrir()
    await user.click(await screen.findByRole('button', { name: 'Anular guía 0040503' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Anular la guía 0040503?' })
    expect(within(dialogo).getByText(/no se puede deshacer/)).toBeInTheDocument()

    await user.type(within(dialogo).getByLabelText('Motivo'), 'ab')
    await user.click(within(dialogo).getByRole('button', { name: 'Anular guía' }))
    expect(await within(dialogo).findByText(/mínimo 3 caracteres/)).toBeInTheDocument()
    expect(llamadas).toHaveLength(0)

    await user.clear(within(dialogo).getByLabelText('Motivo'))
    await user.type(within(dialogo).getByLabelText('Motivo'), 'Guía rota')
    await user.click(within(dialogo).getByRole('button', { name: 'Anular guía' }))
    await vi.waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]).toEqual({ method: 'POST', url: expect.stringContaining('/talonarios/t1/anular'), body: { numeroGuia: 40503, motivo: 'Guía rota' } })
    expect(await screen.findByText('Guía rota')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  /** Llena el formulario del envío (sin tocar el número ni la fecha). */
  async function llenarEnvio(user: ReturnType<typeof userEvent.setup>, dialogo: HTMLElement) {
    await user.type(within(dialogo).getByLabelText('Nombre', { selector: '#remitenteNombre' }), 'Ana Pérez')
    await user.type(within(dialogo).getByLabelText('Teléfono', { selector: '#remitenteTelefono' }), '0991112233')
    await user.type(within(dialogo).getByLabelText('Nombre', { selector: '#destinatarioNombre' }), 'Luis Mora')
    await user.type(within(dialogo).getByLabelText('Teléfono', { selector: '#destinatarioTelefono' }), '0994445566')
    await user.type(within(dialogo).getByLabelText('Dirección de entrega'), 'Av. 10 de Agosto N20-15')
    await user.click(within(dialogo).getByRole('combobox', { name: 'Ruta' }))
    await user.click(await screen.findByRole('option', { name: /Ibarra.*Quito/ }))
    await user.click(within(dialogo).getByRole('combobox', { name: 'Tipo del ítem 1' }))
    await user.click(await screen.findByRole('option', { name: /Paquete/ }))
    await user.clear(within(dialogo).getByLabelText('Cantidad del ítem 1'))
    await user.type(within(dialogo).getByLabelText('Cantidad del ítem 1'), '2')
    await user.type(within(dialogo).getByLabelText('Peso por unidad del ítem 1'), '3')
    await user.click(within(dialogo).getByRole('radio', { name: /Pagado/ }))
  }

  it('«Registrar» abre el formulario con el número fijo y permite la fecha desde el día del talonario', async () => {
    const { llamadas } = servidor()
    const user = userEvent.setup()
    abrir()
    await user.click(await screen.findByRole('button', { name: 'Registrar guía 0040501' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar guía 0040501' })
    const numero = within(dialogo).getByLabelText('N.º de guía')
    expect(numero).toHaveValue('0040501')
    expect(numero).toHaveAttribute('readonly')
    const fecha = within(dialogo).getByLabelText('Fecha de la guía')
    expect(fecha).toHaveAttribute('min', diaTalonario)
    expect(fecha).toHaveAttribute('max', sumarDias(hoyEC(), 90))

    await llenarEnvio(user, dialogo)
    // Antes del día del talonario: no se envía.
    fireEvent.change(fecha, { target: { value: sumarDias(diaTalonario, -1) } })
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar envío' }))
    expect(await within(dialogo).findByText(/no puede ser anterior al día del talonario/)).toBeInTheDocument()
    expect(llamadas.filter((l) => l.url.endsWith('/envios'))).toHaveLength(0)

    // Fecha pasada pero desde el día del talonario: permitida.
    const pasada = sumarDias(hoyEC(), -2)
    fireEvent.change(fecha, { target: { value: pasada } })
    expect(await within(dialogo).findByText(/Guía con fecha anterior:/)).toBeInTheDocument()
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar envío' }))
    await vi.waitFor(() => expect(llamadas.filter((l) => l.url.endsWith('/envios'))).toHaveLength(1))
    expect(llamadas.find((l) => l.url.endsWith('/envios'))!.body).toMatchObject({ numeroGuia: '40501', fechaGuia: pasada, rutaId: 7 })
  }, 30_000)

  it('si el servidor responde GUIA_ANULADA lo explica en el número de guía', async () => {
    servidor({ crearEnvio: () => jsonResponse({ error: { code: 'GUIA_ANULADA', message: 'Guía anulada' } }, 422) })
    const user = userEvent.setup()
    abrir()
    await user.click(await screen.findByRole('button', { name: 'Registrar guía 0040501' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar guía 0040501' })
    await llenarEnvio(user, dialogo)
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar envío' }))
    expect(await within(dialogo).findByText(/Esta guía está anulada en su talonario/)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Registrar guía 0040501' })).toBeInTheDocument()
  }, 30_000)
})
