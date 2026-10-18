import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { tokenStorage, UNAUTHORIZED_EVENT } from '@/lib/api'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Usuario } from '@/types/api'
import { PerfilPage } from './PerfilPage'
import { cambiosPerfil, contrasenaSchema } from './schema'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const operador: Usuario = { id: 'u2', nombre: 'Operador Ibarra', email: 'operador@pcargo.ec', rol: 'OPERADOR', clienteId: null }

type Handler = Parameters<typeof mockFetch>[0]

async function renderizar(handler: Handler) {
  tokenStorage.set('token-viejo')
  const fetchMock = mockFetch((url, init) => (url.endsWith('/auth/me') && (init?.method ?? 'GET') === 'GET' ? jsonResponse(operador) : handler(url, init)))
  renderWithProviders(
    <>
      <PerfilPage />
      <Toaster />
    </>,
    { route: '/perfil', path: '/perfil' },
  )
  await screen.findByRole('heading', { name: 'Mi perfil' })
  return fetchMock
}

const llamadas = (fetchMock: ReturnType<typeof mockFetch>, metodo: string, ruta: string) =>
  fetchMock.mock.calls.filter(([u, i]) => String(u).endsWith(ruta) && i?.method === metodo)

describe('PerfilPage — datos personales', () => {
  it('guarda solo lo que cambió y reemplaza token y usuario de la sesión', async () => {
    const actualizado = { ...operador, nombre: 'Ana Operadora' }
    const fetchMock = await renderizar((url, init) =>
      url.endsWith('/auth/me') && init?.method === 'PATCH' ? jsonResponse({ token: 'token-nuevo', usuario: actualizado }) : jsonResponse({}),
    )
    const datos = screen.getByRole('form', { name: 'Datos personales' })
    const guardar = within(datos).getByRole('button', { name: 'Guardar cambios' })
    expect(guardar).toBeDisabled()

    const nombre = within(datos).getByLabelText('Nombre')
    await userEvent.clear(nombre)
    await userEvent.type(nombre, 'Ana Operadora')
    await userEvent.click(guardar)

    await waitFor(() => expect(llamadas(fetchMock, 'PATCH', '/auth/me')).toHaveLength(1))
    expect(JSON.parse(String(llamadas(fetchMock, 'PATCH', '/auth/me')[0]![1]!.body))).toEqual({ nombre: 'Ana Operadora' })
    expect(await screen.findByText('Perfil actualizado')).toBeInTheDocument()
    expect(tokenStorage.get()).toBe('token-nuevo')
    // El encabezado de la página toma el usuario nuevo del AuthProvider.
    expect(screen.getAllByText('Ana Operadora').length).toBeGreaterThan(0)
  })

  it('valida el correo antes de enviarlo', async () => {
    const fetchMock = await renderizar(() => jsonResponse({}))
    const datos = screen.getByRole('form', { name: 'Datos personales' })
    const correo = within(datos).getByLabelText('Correo')
    await userEvent.clear(correo)
    await userEvent.type(correo, 'no-es-correo')
    await userEvent.click(within(datos).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(datos).findByText('Correo inválido')).toBeInTheDocument()
    expect(llamadas(fetchMock, 'PATCH', '/auth/me')).toHaveLength(0)
  })

  it('409: el correo ya es de otro usuario → error en el campo', async () => {
    await renderizar((_url, init) =>
      init?.method === 'PATCH' ? jsonResponse({ error: { code: 'CONFLICTO', message: 'El correo ya existe' } }, 409) : jsonResponse({}),
    )
    const datos = screen.getByRole('form', { name: 'Datos personales' })
    const correo = within(datos).getByLabelText('Correo')
    await userEvent.clear(correo)
    await userEvent.type(correo, 'Admin@PCargo.ec')
    await userEvent.click(within(datos).getByRole('button', { name: 'Guardar cambios' }))

    expect(await within(datos).findByText('Ese correo ya lo usa otro usuario')).toBeInTheDocument()
    expect(correo).toHaveAttribute('aria-invalid', 'true')
    expect(tokenStorage.get()).toBe('token-viejo')
  })
})

describe('PerfilPage — cambiar contraseña', () => {
  const llenar = async (actual: string, nueva: string, confirmar = nueva) => {
    const form = screen.getByRole('form', { name: 'Cambiar contraseña' })
    await userEvent.type(within(form).getByLabelText('Contraseña actual'), actual)
    await userEvent.type(within(form).getByLabelText('Nueva contraseña'), nueva)
    await userEvent.type(within(form).getByLabelText('Confirmar nueva contraseña'), confirmar)
    await userEvent.click(within(form).getByRole('button', { name: 'Cambiar contraseña' }))
    return form
  }

  it('envía { actual, nueva } con PUT y limpia el formulario', async () => {
    const fetchMock = await renderizar((url, init) =>
      url.endsWith('/auth/me/password') && init?.method === 'PUT' ? new Response(null, { status: 204 }) : jsonResponse({}),
    )
    const form = await llenar('Operador123!', 'NuevaClave2026')
    await waitFor(() => expect(llamadas(fetchMock, 'PUT', '/auth/me/password')).toHaveLength(1))
    expect(JSON.parse(String(llamadas(fetchMock, 'PUT', '/auth/me/password')[0]![1]!.body))).toEqual({
      actual: 'Operador123!',
      nueva: 'NuevaClave2026',
    })
    expect(await screen.findByText('Contraseña actualizada')).toBeInTheDocument()
    expect(within(form).getByLabelText('Contraseña actual')).toHaveValue('')
  })

  it('422 CONTRASENA_INCORRECTA: error en «actual» y la sesión sigue abierta', async () => {
    const salir = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, salir)
    await renderizar((_url, init) =>
      init?.method === 'PUT'
        ? jsonResponse({ error: { code: 'CONTRASENA_INCORRECTA', message: 'Contraseña incorrecta' } }, 422)
        : jsonResponse({}),
    )
    const form = await llenar('equivocada1', 'NuevaClave2026')

    expect(await within(form).findByText('La contraseña actual no es correcta')).toBeInTheDocument()
    expect(within(form).getByLabelText('Contraseña actual')).toHaveAttribute('aria-invalid', 'true')
    expect(tokenStorage.get()).toBe('token-viejo')
    expect(salir).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()
    window.removeEventListener(UNAUTHORIZED_EVENT, salir)
  })

  it('valida en el cliente: confirmación distinta', async () => {
    const fetchMock = await renderizar(() => jsonResponse({}))
    const form = await llenar('Operador123!', 'NuevaClave2026', 'OtraClave2026')
    expect(await within(form).findByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(llamadas(fetchMock, 'PUT', '/auth/me/password')).toHaveLength(0)
  })
})

describe('reglas del perfil', () => {
  const error = (v: { actual: string; nueva: string; confirmar?: string }) =>
    contrasenaSchema.safeParse({ confirmar: v.nueva, ...v }).error?.issues.map((i) => i.message)[0]

  it('nueva contraseña: 8–72, con letra y número, distinta de la actual', () => {
    expect(error({ actual: 'Vieja123', nueva: 'Nueva2026' })).toBeUndefined()
    expect(error({ actual: 'Vieja123', nueva: 'Ab1' })).toMatch(/Entre 8 y 72/)
    expect(error({ actual: 'Vieja123', nueva: '12345678' })).toMatch(/letra y un número/)
    expect(error({ actual: 'Vieja123', nueva: 'abcdefgh' })).toMatch(/letra y un número/)
    expect(error({ actual: 'Vieja123', nueva: `a1${'x'.repeat(71)}` })).toMatch(/Entre 8 y 72/)
    expect(error({ actual: 'Igual2026', nueva: 'Igual2026' })).toBe('Debe ser distinta de la actual')
  })

  it('cambiosPerfil solo incluye los campos modificados (correo en minúsculas)', () => {
    expect(cambiosPerfil(operador, { nombre: ' Operador Ibarra ', email: 'OPERADOR@pcargo.ec' })).toEqual({})
    expect(cambiosPerfil(operador, { nombre: 'Ana', email: ' Ana@PCargo.ec ' })).toEqual({ nombre: 'Ana', email: 'ana@pcargo.ec' })
  })
})
