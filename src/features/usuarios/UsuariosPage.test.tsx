import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { tokenStorage } from '@/lib/api'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Cliente, UsuarioAdmin } from '@/types/api'
import { UsuariosPage } from './UsuariosPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const u = (id: string, nombre: string, rol: UsuarioAdmin['rol'], extra: Partial<UsuarioAdmin> = {}): UsuarioAdmin => ({
  id,
  nombre,
  email: `${id}@pcargo.ec`,
  rol,
  clienteId: null,
  cliente: null,
  activo: true,
  creadoEn: '2026-10-01T00:00:00.000Z',
  ...extra,
})

const usuarios = [
  u('u1', 'Administrador PCargo', 'ADMIN'),
  u('u3', 'Rider Uno', 'REPARTIDOR'),
  u('u7', 'Lucía', 'CLIENTE', { clienteId: 'c1', cliente: 'Textiles Atuntaqui' }),
  u('u8', 'Ex operador', 'OPERADOR', { activo: false }),
]

const textiles = { id: 'c1', nombre: 'Textiles Atuntaqui', telefono: '0991112233', direccion: null, envios: 3 } as Cliente

function servidor() {
  tokenStorage.set('tok')
  const llamadas: { method: string; url: string; body: unknown }[] = []
  mockFetch((url, init) => {
    const method = init?.method ?? 'GET'
    if (method !== 'GET') llamadas.push({ method, url, body: JSON.parse(init!.body as string) })
    if (url.endsWith('/auth/me')) return jsonResponse({ id: 'u1', nombre: 'Administrador PCargo', email: 'u1@pcargo.ec', rol: 'ADMIN', clienteId: null })
    if (url.endsWith('/usuarios') && method === 'POST') return jsonResponse({ ...u('u9', 'Nuevo', 'CLIENTE'), ...(llamadas.at(-1)!.body as object) }, 201)
    if (/\/usuarios\/\w+$/.test(url) && method === 'PATCH') return jsonResponse(usuarios[1])
    if (url.endsWith('/usuarios')) return jsonResponse(usuarios)
    if (url.includes('/clientes')) return jsonResponse([textiles])
    return jsonResponse([])
  })
  return llamadas
}

describe('UsuariosPage', () => {
  it('lista los usuarios con rol, empresa del portal y estado, y filtra por rol', async () => {
    servidor()
    renderWithProviders(<UsuariosPage />)
    const fila = await screen.findByRole('row', { name: /Lucía/ })
    expect(within(fila).getByText('Cliente (portal)')).toBeInTheDocument()
    expect(within(fila).getByText('Textiles Atuntaqui')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Ex operador/ })).getByText('Inactivo')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Repartidores' }))
    expect(screen.getByRole('row', { name: /Rider Uno/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Lucía/ })).not.toBeInTheDocument()
  })

  it('crear un usuario CLIENTE exige elegir la empresa con el buscador', async () => {
    const llamadas = servidor()
    const user = userEvent.setup()
    renderWithProviders(<UsuariosPage />)
    await user.click(await screen.findByRole('button', { name: 'Nuevo usuario' }))
    const dialogo = await screen.findByRole('dialog')
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Pedro Ruiz')
    await user.type(within(dialogo).getByLabelText('Correo'), 'pedro@textiles.ec')
    await user.type(within(dialogo).getByLabelText('Contraseña inicial'), 'Clave1234')
    await user.click(within(dialogo).getByRole('combobox', { name: 'Rol' }))
    await user.click(await screen.findByRole('option', { name: 'Cliente (portal)' }))

    await user.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }))
    expect(await within(dialogo).findByText('Elige el cliente de este acceso')).toBeInTheDocument()
    expect(llamadas).toHaveLength(0)

    await user.type(within(dialogo).getByRole('combobox', { name: 'Buscar cliente del acceso' }), 'texti')
    await user.click(await within(dialogo).findByRole('option', { name: /Textiles Atuntaqui/ }))
    await user.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }))
    await vi.waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]!.body).toEqual({ nombre: 'Pedro Ruiz', email: 'pedro@textiles.ec', password: 'Clave1234', rol: 'CLIENTE', clienteId: 'c1' })
  })

  it('desactivar pide confirmación y un ADMIN no puede desactivarse a sí mismo', async () => {
    const llamadas = servidor()
    const user = userEvent.setup()
    renderWithProviders(<UsuariosPage />)
    await user.click(await screen.findByRole('button', { name: 'Acciones de Administrador PCargo' }))
    expect(await screen.findByRole('menuitem', { name: 'Desactivar' })).toHaveAttribute('aria-disabled', 'true')
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: 'Acciones de Rider Uno' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Desactivar' }))
    const confirmar = await screen.findByRole('alertdialog')
    await user.click(within(confirmar).getByRole('button', { name: 'Desactivar' }))
    await vi.waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]).toMatchObject({ method: 'PATCH', body: { activo: false } })
    expect(llamadas[0]!.url).toMatch(/\/usuarios\/u3$/)
  })

  it('restablecer la contraseña propone una generada y la envía', async () => {
    const llamadas = servidor()
    const user = userEvent.setup()
    renderWithProviders(<UsuariosPage />)
    await user.click(await screen.findByRole('button', { name: 'Acciones de Rider Uno' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Restablecer contraseña' }))
    const dialogo = await screen.findByRole('dialog')
    const campo = within(dialogo).getByLabelText('Contraseña nueva') as HTMLInputElement
    expect(campo.value).toMatch(/^(?=.*\d)(?=.*[a-zA-Z]).{12}$/)
    await user.click(within(dialogo).getByRole('button', { name: 'Restablecer' }))
    await vi.waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]!.body).toEqual({ password: campo.value })
  })
})
