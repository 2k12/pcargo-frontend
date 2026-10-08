import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Cliente } from '@/types/api'
import { toNuevoEnvio, type EnvioFormValues } from '../schema'
import { NuevoEnvioDialog } from './NuevoEnvioDialog'

afterEach(() => {
  vi.unstubAllGlobals()
})

const tienda: Cliente = {
  id: 'c1',
  nombre: 'Tienda La Esquina',
  telefono: '062 950 111',
  direccion: 'Bolívar 3-20, Ibarra',
  notas: null,
  creadoEn: '2026-09-01T00:00:00.000Z',
  envios: 7,
  monto: 50,
  ultimoEnvio: null,
}

async function abrir(props: Parameters<typeof NuevoEnvioDialog>[0] = {}) {
  mockFetch((url) => (url.includes('/clientes') ? jsonResponse([tienda]) : jsonResponse([])))
  renderWithProviders(<NuevoEnvioDialog {...props} />)
  await userEvent.click(screen.getByRole('button', { name: props?.label ?? 'Nuevo envío' }))
  return screen.findByRole('dialog')
}

describe('NuevoEnvioDialog — clientes frecuentes', () => {
  it('al elegir un cliente completa el remitente y lo muestra como ficha', async () => {
    const dialogo = await abrir()
    await userEvent.type(await within(dialogo).findByRole('combobox', { name: 'Buscar cliente remitente' }), 'esq')
    await userEvent.click(await within(dialogo).findByRole('option', { name: /Tienda La Esquina/ }))

    expect(within(dialogo).getByLabelText('Nombre', { selector: '#remitenteNombre' })).toHaveValue('Tienda La Esquina')
    expect(within(dialogo).getByLabelText('Teléfono', { selector: '#remitenteTelefono' })).toHaveValue('062 950 111')
    expect(within(dialogo).getByText(/Cliente frecuente · 7 envíos/)).toBeInTheDocument()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cambiar' }))
    expect(within(dialogo).getByLabelText('Nombre', { selector: '#remitenteNombre' })).toHaveValue('')
  })

  it('si el cliente no existe ofrece registrarlo con lo escrito y activa "guardar como cliente"', async () => {
    const dialogo = await abrir()
    await userEvent.type(await within(dialogo).findByRole('combobox', { name: 'Buscar cliente remitente' }), 'Pedro Ruiz')
    await userEvent.click(await within(dialogo).findByRole('option', { name: /Registrar «Pedro Ruiz»/ }))

    expect(within(dialogo).getByLabelText('Nombre', { selector: '#remitenteNombre' })).toHaveValue('Pedro Ruiz')
    expect(within(dialogo).getByRole('switch', { name: 'Guardar como cliente frecuente' })).toBeChecked()
  })

  it('reconoce a un cliente por el teléfono escrito a mano', async () => {
    const dialogo = await abrir()
    await within(dialogo).findByRole('combobox', { name: 'Buscar cliente remitente' })
    await userEvent.type(within(dialogo).getByLabelText('Teléfono', { selector: '#remitenteTelefono' }), '062950111')
    expect(within(dialogo).getByText(/el envío se suma a su historial/)).toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Usar sus datos' }))
    expect(within(dialogo).getByText(/Cliente frecuente · 7 envíos/)).toBeInTheDocument()
  })

  it('autocompleta el destinatario desde un cliente, con su dirección', async () => {
    const dialogo = await abrir()
    await userEvent.type(await within(dialogo).findByRole('combobox', { name: 'Buscar cliente destinatario' }), 'tienda')
    await userEvent.keyboard('{Enter}')
    expect(within(dialogo).getByLabelText('Dirección de entrega')).toHaveValue('Bolívar 3-20, Ibarra')
  })

  it('abre con el cliente ya elegido desde su ficha', async () => {
    const dialogo = await abrir({ cliente: tienda, label: 'Enviar' })
    expect(await within(dialogo).findByText(/Cliente frecuente/)).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Nombre', { selector: '#remitenteNombre' })).toHaveValue('Tienda La Esquina')
  })
})

describe('toNuevoEnvio', () => {
  const base = {
    remitenteNombre: 'Ana',
    remitenteTelefono: '0991112233',
    destinatarioNombre: 'Luis',
    destinatarioTelefono: '0994445566',
    destinatarioDireccion: 'Quito centro',
    rutaId: '11',
    items: [{ tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 0.2 }],
    formaPago: 'PAGADO',
  } as EnvioFormValues

  it('envía el cliente elegido, o pide guardarlo, nunca ambos', () => {
    expect(toNuevoEnvio({ ...base, clienteId: 'c1', guardarCliente: true })).toMatchObject({ clienteId: 'c1' })
    expect(toNuevoEnvio({ ...base, clienteId: 'c1', guardarCliente: true })).not.toHaveProperty('guardarCliente')
    expect(toNuevoEnvio({ ...base, clienteId: '', guardarCliente: true })).toMatchObject({ guardarCliente: true })
    const sinCliente = toNuevoEnvio({ ...base, clienteId: '', guardarCliente: false })
    expect(sinCliente).not.toHaveProperty('clienteId')
    expect(sinCliente).not.toHaveProperty('guardarCliente')
  })
})
