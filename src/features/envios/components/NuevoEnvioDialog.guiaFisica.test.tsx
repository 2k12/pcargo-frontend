import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Ruta } from '@/types/api'
import { TIPOS_CARGA_DEFAULT } from '../domain'
import { MENSAJE_GUIA_INVALIDA } from '../guia'
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

describe('guía física — esquema del formulario (contrato v21)', () => {
  const schema = crearEnvioSchema(TIPOS_CARGA_DEFAULT)
  const error = (guiaFisica: string | undefined) =>
    schema.safeParse({ ...base, guiaFisica }).error?.issues.find((i) => i.path[0] === 'guiaFisica')?.message

  it('acepta vacío y dígitos con ceros a la izquierda; rechaza texto', () => {
    for (const v of [undefined, '', '0040425', '40425', ' 40 425 ']) expect(error(v)).toBeUndefined()
    expect(error('A12')).toBe(MENSAJE_GUIA_INVALIDA)
  })

  it('se envía como guiaFisica sin ceros; vacío se omite y no toca numeroGuia', () => {
    const conFisica = toNuevoEnvio({ ...base, guiaFisica: '0040425' })
    expect(conFisica.guiaFisica).toBe('40425')
    expect(conFisica).not.toHaveProperty('numeroGuia')
    expect(toNuevoEnvio({ ...base, guiaFisica: '' })).not.toHaveProperty('guiaFisica')
    expect(toNuevoEnvio(base)).not.toHaveProperty('guiaFisica')
  })
})

const ciudad = (id: number, nombre: string) => ({ id, nombre, activa: true })
const rutas: Ruta[] = [{ id: 7, origen: ciudad(1, 'Ibarra'), destino: ciudad(4, 'Quito'), tiempoEstimadoMin: 150, activa: true, operativa: true }]

function servidor(respuesta: () => Response) {
  const crear = vi.fn((_body: unknown) => respuesta())
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

async function llenar(dialogo: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
  await user.type(within(dialogo).getByLabelText('Nombre', { selector: '#remitenteNombre' }), 'Ana Pérez')
  await user.type(within(dialogo).getByLabelText('Teléfono', { selector: '#remitenteTelefono' }), '0991112233')
  await user.type(within(dialogo).getByLabelText('Nombre', { selector: '#destinatarioNombre' }), 'Luis Mora')
  await user.type(within(dialogo).getByLabelText('Teléfono', { selector: '#destinatarioTelefono' }), '0994445566')
  await user.type(within(dialogo).getByLabelText('Dirección de entrega'), 'Av. 10 de Agosto N20-15')
  await user.click(within(dialogo).getByRole('combobox', { name: 'Ruta' }))
  await user.click(await screen.findByRole('option', { name: /Ibarra.*Quito/ }))
  await user.click(within(dialogo).getByRole('combobox', { name: 'Tipo del ítem 1' }))
  await user.click(await screen.findByRole('option', { name: /Paquete/ }))
  await user.type(within(dialogo).getByLabelText('Peso por unidad del ítem 1'), '3')
  await user.click(within(dialogo).getByRole('radio', { name: /Pagado/ }))
}

describe('NuevoEnvioDialog — guía física (contrato v21)', () => {
  it('muestra el campo de guía física con su ayuda y lo envía como guiaFisica', async () => {
    const { crear } = servidor(() => jsonResponse({ id: 'e1', numeroGuia: 12, guiaFisica: 40425, costo: 3 }, 201))
    const user = userEvent.setup()
    renderWithProviders(<NuevoEnvioDialog />)
    await user.click(screen.getByRole('button', { name: 'Nuevo envío' }))
    const dialogo = await screen.findByRole('dialog')

    expect(within(dialogo).queryByLabelText(/^N\.º de guía$/)).not.toBeInTheDocument()
    const campo = within(dialogo).getByLabelText('N.º de guía física (opcional)')
    expect(campo).toHaveAccessibleDescription('Solo si usas una guía de papel antigua. El número del sistema se asigna solo.')

    await llenar(dialogo, user)
    await user.type(campo, '0040425')
    await user.click(screen.getByRole('button', { name: 'Registrar envío' }))
    await vi.waitFor(() => expect(crear).toHaveBeenCalledTimes(1))
    const body = crear.mock.calls[0]![0] as Record<string, unknown>
    expect(body.guiaFisica).toBe('40425')
    expect(body).not.toHaveProperty('numeroGuia')
  }, 30_000)

  it('un 409 de la guía física se muestra en su campo', async () => {
    servidor(() => jsonResponse({ error: { code: 'CONFLICTO', message: 'La guía física 40425 ya está registrada' } }, 409))
    const user = userEvent.setup()
    renderWithProviders(<NuevoEnvioDialog />)
    await user.click(screen.getByRole('button', { name: 'Nuevo envío' }))
    const dialogo = await screen.findByRole('dialog')
    await llenar(dialogo, user)
    const campo = within(dialogo).getByLabelText('N.º de guía física (opcional)')
    await user.type(campo, '40425')
    await user.click(screen.getByRole('button', { name: 'Registrar envío' }))

    expect(await within(dialogo).findByText('La guía física 40425 ya está registrada')).toBeInTheDocument()
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  }, 30_000)

  it('con guía de talonario muestra el número fijo y no ofrece guía física', async () => {
    const { crear } = servidor(() => jsonResponse({ id: 'e2', numeroGuia: 501, guiaFisica: null, costo: 3 }, 201))
    const user = userEvent.setup()
    renderWithProviders(
      <NuevoEnvioDialog abierto onAbiertoChange={() => {}} guiaTalonario={{ numeroGuia: 501, fechaMinima: '2026-10-01' }} />,
    )
    const dialogo = await screen.findByRole('dialog')
    const numero = within(dialogo).getByLabelText('N.º de guía')
    expect(numero).toHaveAttribute('readonly')
    expect(within(dialogo).queryByLabelText('N.º de guía física (opcional)')).not.toBeInTheDocument()

    await llenar(dialogo, user)
    await user.click(screen.getByRole('button', { name: 'Registrar envío' }))
    await vi.waitFor(() => expect(crear).toHaveBeenCalledTimes(1))
    const body = crear.mock.calls[0]![0] as Record<string, unknown>
    expect(body.numeroGuia).toBe('501')
    expect(body).not.toHaveProperty('guiaFisica')
  }, 30_000)
})
