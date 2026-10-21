import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { tokenStorage, UNAUTHORIZED_EVENT } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { CodigoAcceso, Usuario } from '@/types/api'
import { CodigoAccesoForm } from './CodigoAccesoForm'
import { codigoAccesoSchema } from './schema'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const repartidor: Usuario = { id: 'u3', nombre: 'Rita Repartidora', email: 'rita@pcargo.ec', rol: 'REPARTIDOR', clienteId: null }
const INACTIVO: CodigoAcceso = { activo: false, actualizadoEn: null }
const ACTIVO: CodigoAcceso = { activo: true, actualizadoEn: '2026-10-15T15:30:00.000Z' }

type Handler = Parameters<typeof mockFetch>[0]

async function renderizar(estado: CodigoAcceso, handler: Handler = () => jsonResponse({})) {
  tokenStorage.set('token-sesion')
  const fetchMock = mockFetch((url, init) => {
    const metodo = init?.method ?? 'GET'
    if (url.endsWith('/auth/me') && metodo === 'GET') return jsonResponse(repartidor)
    if (url.endsWith('/auth/me/codigo') && metodo === 'GET') return jsonResponse(estado)
    return handler(url, init)
  })
  renderWithProviders(
    <>
      <CodigoAccesoForm />
      <Toaster />
    </>,
    { route: '/perfil', path: '/perfil' },
  )
  const form = screen.getByRole('form', { name: 'Código único de acceso' })
  await within(form).findByText(estado.activo ? 'Activo' : 'No activado')
  return { fetchMock, form }
}

const llamadas = (fetchMock: ReturnType<typeof mockFetch>, metodo: string, ruta: string) =>
  fetchMock.mock.calls.filter(([u, i]) => String(u).endsWith(ruta) && i?.method === metodo)

async function llenar(form: HTMLElement, codigo: string, password: string, confirmar = codigo) {
  await userEvent.type(within(form).getByLabelText(/^(Nuevo código|Código)$/), codigo)
  await userEvent.type(within(form).getByLabelText('Confirmar código'), confirmar)
  await userEvent.type(within(form).getByLabelText('Tu contraseña actual'), password)
}

describe('CodigoAccesoForm', () => {
  it('explica para qué sirve y que no debe compartirse', async () => {
    await renderizar(INACTIVO)
    expect(screen.getByText(/sin correo ni\s+contraseña/)).toBeInTheDocument()
    expect(screen.getByText(/no lo compartas/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument()
  })

  it('activa el código con PUT { password, codigo } y muestra «Activo desde»', async () => {
    const { fetchMock, form } = await renderizar(INACTIVO, (url, init) =>
      url.endsWith('/auth/me/codigo') && init?.method === 'PUT' ? jsonResponse(ACTIVO) : jsonResponse({}),
    )
    await llenar(form, 'Rita#2026', 'Repartidor123!')
    await userEvent.click(within(form).getByRole('button', { name: 'Activar código' }))

    await waitFor(() => expect(llamadas(fetchMock, 'PUT', '/auth/me/codigo')).toHaveLength(1))
    expect(JSON.parse(String(llamadas(fetchMock, 'PUT', '/auth/me/codigo')[0]![1]!.body))).toEqual({
      codigo: 'Rita#2026',
      password: 'Repartidor123!',
    })
    expect(await screen.findByText('Código activado')).toBeInTheDocument()
    expect(within(form).getByText(`Activo desde ${formatDate(ACTIVO.actualizadoEn!)}`)).toBeInTheDocument()
    expect(within(form).getByRole('button', { name: 'Cambiar código' })).toBeInTheDocument()
    expect(within(form).getByLabelText('Nuevo código')).toHaveValue('')
  })

  it('409 CONFLICTO: el código lo usa otro usuario → error en el campo código', async () => {
    const { form } = await renderizar(INACTIVO, (_url, init) =>
      init?.method === 'PUT'
        ? jsonResponse({ error: { code: 'CONFLICTO', message: 'Ese código no está disponible, elige otro' } }, 409)
        : jsonResponse({}),
    )
    await llenar(form, '123456', 'Repartidor123!')
    await userEvent.click(within(form).getByRole('button', { name: 'Activar código' }))

    expect(await within(form).findByText('Ese código no está disponible, elige otro')).toBeInTheDocument()
    expect(within(form).getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true')
    expect(within(form).getByLabelText('Tu contraseña actual')).toHaveAttribute('aria-invalid', 'false')
  })

  it('422 CONTRASENA_INCORRECTA: error en la contraseña y la sesión sigue abierta', async () => {
    const salir = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, salir)
    const { form } = await renderizar(ACTIVO, (_url, init) =>
      init?.method === 'PUT'
        ? jsonResponse({ error: { code: 'CONTRASENA_INCORRECTA', message: 'Contraseña incorrecta' } }, 422)
        : jsonResponse({}),
    )
    await llenar(form, 'NuevoCodigo', 'equivocada')
    await userEvent.click(within(form).getByRole('button', { name: 'Cambiar código' }))

    expect(await within(form).findByText('La contraseña actual no es correcta')).toBeInTheDocument()
    expect(within(form).getByLabelText('Tu contraseña actual')).toHaveAttribute('aria-invalid', 'true')
    expect(tokenStorage.get()).toBe('token-sesion')
    expect(salir).not.toHaveBeenCalled()
    window.removeEventListener(UNAUTHORIZED_EVENT, salir)
  })

  it('valida en el cliente antes de enviar (confirmación distinta)', async () => {
    const { fetchMock, form } = await renderizar(INACTIVO)
    await llenar(form, 'Rita#2026', 'Repartidor123!', 'Rita#2027')
    await userEvent.click(within(form).getByRole('button', { name: 'Activar código' }))
    expect(await within(form).findByText('Los códigos no coinciden')).toBeInTheDocument()
    expect(llamadas(fetchMock, 'PUT', '/auth/me/codigo')).toHaveLength(0)
  })

  it('desactiva tras confirmar en el diálogo (DELETE) y vuelve a «No activado»', async () => {
    const { fetchMock, form } = await renderizar(ACTIVO, (url, init) =>
      url.endsWith('/auth/me/codigo') && init?.method === 'DELETE' ? new Response(null, { status: 204 }) : jsonResponse({}),
    )
    expect(within(form).getByText(`Activo desde ${formatDate(ACTIVO.actualizadoEn!)}`)).toBeInTheDocument()

    await userEvent.click(within(form).getByRole('button', { name: 'Desactivar' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(within(dialogo).getByText('¿Desactivar el código único?')).toBeInTheDocument()
    expect(llamadas(fetchMock, 'DELETE', '/auth/me/codigo')).toHaveLength(0)

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desactivar código' }))
    await waitFor(() => expect(llamadas(fetchMock, 'DELETE', '/auth/me/codigo')).toHaveLength(1))
    expect(await screen.findByText('Código desactivado')).toBeInTheDocument()
    expect(await within(form).findByText('No activado')).toBeInTheDocument()
    expect(within(form).getByRole('button', { name: 'Activar código' })).toBeInTheDocument()
  })

  it('cancelar el diálogo no desactiva nada', async () => {
    const { fetchMock, form } = await renderizar(ACTIVO)
    await userEvent.click(within(form).getByRole('button', { name: 'Desactivar' }))
    const dialogo = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(llamadas(fetchMock, 'DELETE', '/auth/me/codigo')).toHaveLength(0)
  })
})

describe('reglas del código único', () => {
  const error = (v: { codigo: string; password?: string; confirmar?: string }) =>
    codigoAccesoSchema.safeParse({ password: 'Clave2026', confirmar: v.codigo, ...v }).error?.issues.map((i) => i.message)[0]

  it('6–32 caracteres sin espacios; letras, números o símbolos; distinto de la contraseña', () => {
    expect(error({ codigo: '123456' })).toBeUndefined()
    expect(error({ codigo: 'abcdef' })).toBeUndefined()
    expect(error({ codigo: '#$%&*!' })).toBeUndefined()
    expect(error({ codigo: 'Ab#12ñ' })).toBeUndefined()
    expect(error({ codigo: 'x'.repeat(32) })).toBeUndefined()
    expect(error({ codigo: '12345' })).toBe('Mínimo 6 caracteres')
    expect(error({ codigo: 'x'.repeat(33) })).toBe('Máximo 32 caracteres')
    expect(error({ codigo: 'abc 123' })).toBe('No puede tener espacios')
    expect(error({ codigo: 'Clave2026' })).toBe('No puede ser igual a tu contraseña')
    // Distingue mayúsculas: no es igual a la contraseña.
    expect(error({ codigo: 'clave2026' })).toBeUndefined()
  })
})
