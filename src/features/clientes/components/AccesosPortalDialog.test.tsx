import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Cliente, UsuarioAdmin } from '@/types/api'
import { AccesosPortalDialog } from './AccesosPortalDialog'

afterEach(() => {
  vi.unstubAllGlobals()
})

const cliente: Cliente = {
  id: 'c1',
  nombre: 'Textiles Atuntaqui',
  telefono: '0991112233',
  direccion: null,
  notas: null,
  creadoEn: '2026-09-01T00:00:00.000Z',
  consentimientoEn: '2026-09-01T00:00:00.000Z',
  envios: 3,
  monto: 20,
  ultimoEnvio: null,
  accesosPortal: 1,
}

const acceso = (id: string, nombre: string, email: string, activo = true): UsuarioAdmin => ({
  id,
  nombre,
  email,
  rol: 'CLIENTE',
  clienteId: 'c1',
  cliente: 'Textiles Atuntaqui',
  activo,
  creadoEn: '2026-10-01T00:00:00.000Z',
})

describe('AccesosPortalDialog', () => {
  it('lista los accesos, crea uno nuevo y muestra la contraseña temporal una sola vez', async () => {
    const crear = vi.fn((body: { nombre: string; email: string }) =>
      jsonResponse({ usuario: acceso('u9', body.nombre, body.email), passwordTemporal: 'Ab3dE6gH9kLm' }, 201),
    )
    mockFetch((url, init) => {
      if (url.endsWith('/clientes/c1/accesos') && init?.method === 'POST') return crear(JSON.parse(init.body as string))
      if (url.endsWith('/clientes/c1/accesos')) return jsonResponse([acceso('u5', 'Lucía', 'lucia@textiles.ec')])
      return jsonResponse([])
    })
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(<AccesosPortalDialog cliente={cliente} onClose={onClose} />)

    const dialogo = await screen.findByRole('dialog')
    expect(await within(dialogo).findByText('lucia@textiles.ec')).toBeInTheDocument()
    await user.click(within(dialogo).getByRole('button', { name: 'Nuevo acceso' }))
    await user.type(within(dialogo).getByLabelText('Nombre de la persona'), 'Pedro Ruiz')
    await user.type(within(dialogo).getByLabelText('Correo'), 'Pedro@Textiles.ec')
    await user.click(within(dialogo).getByRole('button', { name: 'Crear acceso' }))

    await vi.waitFor(() => expect(crear).toHaveBeenCalledWith({ nombre: 'Pedro Ruiz', email: 'pedro@textiles.ec' }))
    expect(await within(dialogo).findByTestId('password-temporal')).toHaveTextContent('Ab3dE6gH9kLm')
    expect(within(dialogo).getByText('No se volverá a mostrar.')).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Copiar contraseña' })).toBeInTheDocument()

    // Al confirmar, la contraseña desaparece de la pantalla y no se puede volver a ver.
    await user.click(within(dialogo).getByRole('button', { name: 'Listo' }))
    expect(within(dialogo).queryByTestId('password-temporal')).not.toBeInTheDocument()
    expect(screen.queryByText('Ab3dE6gH9kLm')).not.toBeInTheDocument()
  })

  it('un correo repetido se marca en el campo', async () => {
    mockFetch((url, init) =>
      init?.method === 'POST'
        ? jsonResponse({ error: { code: 'CONFLICTO', message: 'El correo ya existe' } }, 409)
        : url.endsWith('/clientes/c1/accesos')
          ? jsonResponse([])
          : jsonResponse([]),
    )
    const user = userEvent.setup()
    renderWithProviders(<AccesosPortalDialog cliente={cliente} onClose={vi.fn()} />)
    const dialogo = await screen.findByRole('dialog')
    // Sin accesos el formulario aparece directamente.
    await user.type(await within(dialogo).findByLabelText('Nombre de la persona'), 'Pedro Ruiz')
    await user.type(within(dialogo).getByLabelText('Correo'), 'pedro@textiles.ec')
    await user.click(within(dialogo).getByRole('button', { name: 'Crear acceso' }))
    expect(await within(dialogo).findByText('Ese correo ya lo usa otro usuario')).toBeInTheDocument()
  })
})
