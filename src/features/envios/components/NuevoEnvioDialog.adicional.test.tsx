import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Ruta } from '@/types/api'
import { TIPOS_CARGA_DEFAULT } from '../domain'
import { crearEnvioSchema, toNuevoEnvio, type EnvioFormValues } from '../schema'
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

describe('costo adicional — esquema del formulario (contrato v15)', () => {
  const schema = crearEnvioSchema(TIPOS_CARGA_DEFAULT)
  const error = (costoAdicional: string | undefined) =>
    schema.safeParse({ ...base, costoAdicional }).error?.issues.find((i) => i.path[0] === 'costoAdicional')?.message

  it('acepta vacío, entero y decimal con punto o coma', () => {
    for (const v of [undefined, '', '  ', '2', '0', '1,50', '1.5', '9999.99']) expect(error(v)).toBeUndefined()
  })

  it('rechaza negativos, más de 2 decimales, más de 9999.99 y texto', () => {
    expect(error('-1')).toBe('No puede ser negativo')
    expect(error('1,555')).toBe('Máximo 2 decimales')
    expect(error('10000')).toBe('Máximo $9.999,99')
    expect(error('abc')).toBe('Escribe un monto, p. ej. 2 o 1,50')
  })

  it('se envía como número; vacío o 0 se omite', () => {
    expect(toNuevoEnvio({ ...base, costoAdicional: '1,50' }).costoAdicional).toBe(1.5)
    expect(toNuevoEnvio({ ...base, costoAdicional: '2' }).costoAdicional).toBe(2)
    expect(toNuevoEnvio({ ...base, costoAdicional: '' })).not.toHaveProperty('costoAdicional')
    expect(toNuevoEnvio({ ...base, costoAdicional: '0' })).not.toHaveProperty('costoAdicional')
    expect(toNuevoEnvio(base)).not.toHaveProperty('costoAdicional')
  })
})

const ciudad = (id: number, nombre: string) => ({ id, nombre, activa: true })
const rutas: Ruta[] = [{ id: 7, origen: ciudad(1, 'Ibarra'), destino: ciudad(4, 'Quito'), tiempoEstimadoMin: 150, activa: true, operativa: true }]

function servidor() {
  const crear = vi.fn((_body: unknown) => jsonResponse({ id: 'e1', numeroGuia: 40461, costo: 7.5, costoAdicional: 1.5 }, 201))
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

describe('NuevoEnvioDialog — costo adicional', () => {
  it('suma el adicional al total en vivo y lo manda como número en costoAdicional', async () => {
    const { crear } = servidor()
    const user = userEvent.setup()
    renderWithProviders(<NuevoEnvioDialog />)
    await user.click(screen.getByRole('button', { name: 'Nuevo envío' }))
    const dialogo = await screen.findByRole('dialog')

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

    expect(await within(dialogo).findByTestId('cotizacion-total')).toHaveTextContent('6,00')
    expect(within(dialogo).queryByTestId('cotizacion-suma')).not.toBeInTheDocument()

    const campo = within(dialogo).getByLabelText('Costo adicional (USD)')
    await user.type(campo, '1,50')
    expect(within(dialogo).getByTestId('cotizacion-suma')).toHaveTextContent('Tarifa $6,00 + adicional $1,50 = Total $7,50')
    expect(within(dialogo).getByTestId('cotizacion-total')).toHaveTextContent('7,50')

    // Un monto inválido no se suma y se explica al enviar.
    await user.clear(campo)
    await user.type(campo, '1,555')
    expect(within(dialogo).queryByTestId('cotizacion-suma')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Registrar envío' }))
    expect(await within(dialogo).findByText('Máximo 2 decimales')).toBeInTheDocument()
    expect(crear).not.toHaveBeenCalled()

    await user.clear(campo)
    await user.type(campo, '1,50')
    await user.click(screen.getByRole('button', { name: 'Registrar envío' }))
    await vi.waitFor(() => expect(crear).toHaveBeenCalledTimes(1))
    expect(crear.mock.calls[0]![0]).toMatchObject({ rutaId: 7, formaPago: 'PAGADO', costoAdicional: 1.5 })
  }, 30_000)
})
