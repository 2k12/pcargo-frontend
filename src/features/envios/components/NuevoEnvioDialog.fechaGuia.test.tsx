import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Envio, Ruta } from '@/types/api'
import { TIPOS_CARGA_DEFAULT } from '../domain'
import { hoyEC, sumarDias } from '../fechaGuia'
import { crearEnvioSchema, toNuevoEnvio, type EnvioFormValues } from '../schema'
import { FechaGuiaTexto } from './FechaGuiaTexto'
import { NuevoEnvioDialog } from './NuevoEnvioDialog'

afterEach(() => {
  vi.unstubAllGlobals()
})

const base = {
  remitenteNombre: 'Ana',
  remitenteTelefono: '0991112233',
  destinatarioNombre: 'Luis',
  destinatarioTelefono: '0994445566',
  destinatarioDireccion: 'Quito centro',
  rutaId: '7',
  items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3 }],
  formaPago: 'PAGADO',
  zona: 'URBANA',
} as EnvioFormValues

describe('fecha de la guía — esquema del formulario (contrato v18)', () => {
  const schema = crearEnvioSchema(TIPOS_CARGA_DEFAULT)
  const error = (fechaGuia: string | undefined) =>
    schema.safeParse({ ...base, fechaGuia }).error?.issues.find((i) => i.path[0] === 'fechaGuia')?.message

  it('acepta vacío, hoy y hasta hoy + 90; rechaza fechas pasadas y más lejanas', () => {
    const hoy = hoyEC()
    for (const v of [undefined, '', hoy, sumarDias(hoy, 1), sumarDias(hoy, 90)]) expect(error(v)).toBeUndefined()
    expect(error(sumarDias(hoy, -1))).toBe('La fecha de la guía no puede ser anterior a hoy')
    expect(error(sumarDias(hoy, 91))).toMatch(/como máximo 90 días/)
  })

  it('siempre envía fechaGuia (vacío → null, el servidor usa hoy)', () => {
    expect(toNuevoEnvio({ ...base, fechaGuia: '2026-11-02' }).fechaGuia).toBe('2026-11-02')
    expect(toNuevoEnvio({ ...base, fechaGuia: '' }).fechaGuia).toBeNull()
    expect(toNuevoEnvio(base).fechaGuia).toBeNull()
  })
})

const ciudad = (id: number, nombre: string) => ({ id, nombre, activa: true })
const rutas: Ruta[] = [{ id: 7, origen: ciudad(1, 'Ibarra'), destino: ciudad(4, 'Quito'), tiempoEstimadoMin: 150, activa: true, operativa: true }]

function servidor() {
  const crear = vi.fn((_body: unknown) => jsonResponse({ id: 'e1', numeroGuia: 40461, costo: 6, costoAdicional: 0 }, 201))
  mockFetch((url, init) => {
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
    if (url.endsWith('/envios') && init?.method === 'POST') return crear(JSON.parse(init.body as string))
    return jsonResponse([])
  })
  return { crear }
}

describe('NuevoEnvioDialog — fecha de la guía', () => {
  it('arranca en hoy, avisa una fecha posterior, rechaza una pasada y envía fechaGuia', async () => {
    const { crear } = servidor()
    const user = userEvent.setup()
    renderWithProviders(<NuevoEnvioDialog />)
    await user.click(screen.getByRole('button', { name: 'Nuevo envío' }))
    const dialogo = await screen.findByRole('dialog')

    const hoy = hoyEC()
    const campo = within(dialogo).getByLabelText('Fecha de la guía')
    expect(campo).toHaveAttribute('type', 'date')
    expect(campo).toHaveValue(hoy)
    expect(campo).toHaveAttribute('min', hoy)
    expect(campo).toHaveAttribute('max', sumarDias(hoy, 90))
    expect(within(dialogo).queryByText(/Guía con fecha posterior/)).not.toBeInTheDocument()

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

    // Fecha pasada: no se envía.
    fireEvent.change(campo, { target: { value: sumarDias(hoy, -1) } })
    await user.click(screen.getByRole('button', { name: 'Registrar envío' }))
    expect(await within(dialogo).findByText('La fecha de la guía no puede ser anterior a hoy')).toBeInTheDocument()
    expect(crear).not.toHaveBeenCalled()

    // Fecha posterior: se avisa y se envía.
    const posterior = sumarDias(hoy, 3)
    fireEvent.change(campo, { target: { value: posterior } })
    expect(await within(dialogo).findByText(/Guía con fecha posterior:/)).toBeInTheDocument()
    expect(within(dialogo).queryByText('La fecha de la guía no puede ser anterior a hoy')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Registrar envío' }))
    await vi.waitFor(() => expect(crear).toHaveBeenCalledTimes(1))
    expect(crear.mock.calls[0]![0]).toMatchObject({ rutaId: 7, fechaGuia: posterior })
  }, 30_000)
})

describe('FechaGuiaTexto', () => {
  const registro = { fecha: '2026-10-08T03:24:55.786Z', operador: null }
  it('muestra la fecha de la guía y marca discretamente si difiere del registro', () => {
    const { rerender } = renderWithProviders(<FechaGuiaTexto envio={{ registro, fechaGuia: '2026-10-07' } as Envio} />)
    expect(screen.getByText(/7 oct 2026/)).toBeInTheDocument()
    expect(screen.queryByText(/fecha de la guía;/)).not.toBeInTheDocument()
    rerender(<FechaGuiaTexto envio={{ registro, fechaGuia: '2026-10-15' } as Envio} />)
    expect(screen.getByText(/15 oct 2026/)).toBeInTheDocument()
    expect(screen.getByText(/fecha de la guía; registrada el/)).toBeInTheDocument()
  })
})
