import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders, tipoCargaFixture } from '@/test/utils'
import type { Cliente, TipoCarga } from '@/types/api'
import { TIPOS_CARGA_DEFAULT } from '../domain'
import { crearEnvioSchema, MENSAJE_CONSENTIMIENTO, toNuevoEnvio, type EnvioFormValues } from '../schema'
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
  consentimientoEn: '2026-10-08T15:00:00.000Z',
  envios: 7,
  monto: 50,
  ultimoEnvio: null,
  accesosPortal: 0,
}

async function abrir(props: Parameters<typeof NuevoEnvioDialog>[0] = {}, tipos: TipoCarga[] = TIPOS_CARGA_DEFAULT) {
  mockFetch((url) =>
    url.includes('/clientes') ? jsonResponse([tienda]) : url.endsWith('/tipos-carga') ? jsonResponse(tipos) : jsonResponse([]),
  )
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
    // LOPDP: guardar exige el consentimiento, que nunca viene marcado de antemano.
    expect(within(dialogo).getByRole('checkbox', { name: 'El cliente aceptó que guardemos sus datos' })).not.toBeChecked()
  })

  it('la casilla de consentimiento solo aparece al guardar al cliente', async () => {
    const dialogo = await abrir()
    await within(dialogo).findByRole('combobox', { name: 'Buscar cliente remitente' })
    expect(within(dialogo).queryByRole('checkbox', { name: /aceptó que guardemos/ })).not.toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('switch', { name: 'Guardar como cliente frecuente' }))
    expect(within(dialogo).getByRole('checkbox', { name: /aceptó que guardemos/ })).toBeInTheDocument()
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

describe('NuevoEnvioDialog — dirección del remitente (contrato v9)', () => {
  it('ofrece el campo opcional y lo autocompleta con la dirección del cliente frecuente', async () => {
    const dialogo = await abrir()
    const campo = within(dialogo).getByLabelText('Dirección del remitente (opcional)')
    expect(campo).toHaveValue('')
    await userEvent.type(campo, 'Sucre 5-12')
    expect(campo).toHaveValue('Sucre 5-12')

    await userEvent.clear(campo)
    await userEvent.type(await within(dialogo).findByRole('combobox', { name: 'Buscar cliente remitente' }), 'esq')
    await userEvent.click(await within(dialogo).findByRole('option', { name: /Tienda La Esquina/ }))
    expect(within(dialogo).getByLabelText('Dirección del remitente (opcional)')).toHaveValue('Bolívar 3-20, Ibarra')
  })
})

describe('NuevoEnvioDialog — zona de entrega', () => {
  it('ofrece Urbana/Rural como grupo de radio, con Urbana por defecto', async () => {
    const dialogo = await abrir()
    const grupo = within(dialogo).getByRole('radiogroup', { name: 'Zona de entrega' })
    const urbana = within(grupo).getByRole('radio', { name: 'Urbana' })
    const rural = within(grupo).getByRole('radio', { name: 'Rural' })
    expect(urbana).toHaveAttribute('aria-checked', 'true')
    expect(rural).toHaveAttribute('aria-checked', 'false')
    expect(await within(dialogo).findByText('Solo cambia el precio de: rollos de tela.')).toBeInTheDocument()
    await userEvent.click(rural)
    expect(rural).toHaveAttribute('aria-checked', 'true')
    expect(urbana).toHaveAttribute('aria-checked', 'false')
  })
})

describe('NuevoEnvioDialog — catálogo configurable (contrato v11)', () => {
  const cajaGrande = tipoCargaFixture({ codigo: 'CAJA_GRANDE', nombre: 'Caja grande', precio: 6, pesoMaxKg: 40, orden: 2 })
  const valijaInactiva = tipoCargaFixture({ codigo: 'VALIJA', nombre: 'Valija', precio: 3, pesoMaxKg: 25, activo: false, orden: 3 })
  const sobre = tipoCargaFixture({ codigo: 'SOBRE', nombre: 'Sobre', precio: 3, pesoMaxKg: 0.5, orden: 1 })

  it('un tipo nuevo aparece en el selector de ítems y uno inactivo no', async () => {
    const dialogo = await abrir({}, [sobre, cajaGrande, valijaInactiva])
    // Espera a que llegue el catálogo real (mientras tanto se muestra la semilla).
    await within(dialogo).findByText('Hoy ningún tipo de carga cambia de precio según la zona.')
    await userEvent.click(within(dialogo).getByRole('combobox', { name: 'Tipo del ítem 1' }))
    const opciones = await screen.findAllByRole('option')
    const nombres = opciones.map((o) => o.textContent ?? '')
    expect(nombres.some((n) => n.includes('Caja grande') && n.includes('hasta 40 kg'))).toBe(true)
    expect(nombres.some((n) => n.includes('Sobre'))).toBe(true)
    expect(nombres.some((n) => n.includes('Valija'))).toBe(false)
    expect(nombres.some((n) => n.includes('Rollo de tela'))).toBe(false)
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
    zona: 'URBANA',
  } as EnvioFormValues

  it('incluye la dirección del remitente solo si se escribió (contrato v9)', () => {
    expect(toNuevoEnvio({ ...base, remitenteDireccion: ' Sucre 5-12 ' }).remitente).toEqual({
      nombre: 'Ana',
      telefono: '0991112233',
      direccion: 'Sucre 5-12',
    })
    expect(toNuevoEnvio({ ...base, remitenteDireccion: '   ' }).remitente).not.toHaveProperty('direccion')
    expect(toNuevoEnvio(base).remitente).not.toHaveProperty('direccion')
    const schema = crearEnvioSchema(TIPOS_CARGA_DEFAULT)
    const error = schema.safeParse({ ...base, remitenteDireccion: 'x'.repeat(201) }).error?.issues.find(
      (i) => i.path[0] === 'remitenteDireccion',
    )
    expect(error?.message).toBe('Máximo 200 caracteres')
  })

  it('envía la zona de entrega (contrato v8)', () => {
    expect(toNuevoEnvio(base).zona).toBe('URBANA')
    expect(toNuevoEnvio({ ...base, zona: 'RURAL' }).zona).toBe('RURAL')
  })

  it('envía el cliente elegido, o pide guardarlo, nunca ambos', () => {
    expect(toNuevoEnvio({ ...base, clienteId: 'c1', guardarCliente: true })).toMatchObject({ clienteId: 'c1' })
    expect(toNuevoEnvio({ ...base, clienteId: 'c1', guardarCliente: true })).not.toHaveProperty('guardarCliente')
    expect(toNuevoEnvio({ ...base, clienteId: '', guardarCliente: true })).toMatchObject({ guardarCliente: true })
    const sinCliente = toNuevoEnvio({ ...base, clienteId: '', guardarCliente: false })
    expect(sinCliente).not.toHaveProperty('clienteId')
    expect(sinCliente).not.toHaveProperty('guardarCliente')
  })

  it('envía el consentimiento tal como lo marcó el operador', () => {
    expect(toNuevoEnvio({ ...base, clienteId: '', guardarCliente: true, consentimientoCliente: true })).toMatchObject({
      guardarCliente: true,
      consentimientoCliente: true,
    })
    expect(toNuevoEnvio({ ...base, clienteId: '', guardarCliente: true })).toMatchObject({ consentimientoCliente: false })
    expect(toNuevoEnvio({ ...base, clienteId: 'c1', consentimientoCliente: true })).not.toHaveProperty('consentimientoCliente')
  })

  it('el formulario no deja guardar al cliente sin su consentimiento (LOPDP)', () => {
    const schema = crearEnvioSchema(TIPOS_CARGA_DEFAULT)
    const errores = (v: Partial<EnvioFormValues>) =>
      (schema.safeParse({ ...base, ...v }).error?.issues ?? []).filter((i) => i.path[0] === 'consentimientoCliente')
    expect(errores({ guardarCliente: true })[0]?.message).toBe(MENSAJE_CONSENTIMIENTO)
    expect(errores({ guardarCliente: true, consentimientoCliente: true })).toHaveLength(0)
    expect(errores({ guardarCliente: true, clienteId: 'c1' })).toHaveLength(0)
    expect(errores({ guardarCliente: false })).toHaveLength(0)
  })
})
