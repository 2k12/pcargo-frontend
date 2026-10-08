import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { tokenStorage } from '@/lib/api'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import { LoginPage } from './LoginPage'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LoginPage', () => {
  it('muestra el error del backend con credenciales inválidas', async () => {
    mockFetch(() => jsonResponse({ error: { code: 'CREDENCIALES_INVALIDAS', message: 'Correo o contraseña incorrectos' } }, 401))
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })

    await user.type(screen.getByLabelText('Correo'), 'admin@pcargo.ec')
    await user.type(screen.getByLabelText('Contraseña'), 'mala')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos')
    expect(tokenStorage.get()).toBeNull()
  })

  it('valida el formulario antes de enviar', async () => {
    const fetchMock = mockFetch(() => jsonResponse({}))
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Ingresa un correo válido')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('guarda el token y navega al panel al iniciar sesión', async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({ token: 'jwt-ok', usuario: { id: 'u1', nombre: 'Admin', email: 'admin@pcargo.ec', rol: 'ADMIN' } }),
    )
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, {
      route: '/login',
      path: '/login',
      extraRoutes: [{ path: '/panel', element: <p>Panel principal</p> }],
    })

    await user.type(screen.getByLabelText('Correo'), 'admin@pcargo.ec')
    await user.type(screen.getByLabelText('Contraseña'), 'Admin123!')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Panel principal')).toBeInTheDocument()
    await waitFor(() => expect(tokenStorage.get()).toBe('jwt-ok'))
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/auth/login')
    expect(JSON.parse(init!.body as string)).toEqual({ email: 'admin@pcargo.ec', password: 'Admin123!' })
  })
})
