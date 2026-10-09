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

const catalogo = {
  ciudades: [
    { id: 1, nombre: 'Ibarra', activa: true },
    { id: 5, nombre: 'Cotacachi', activa: true },
  ],
  tiposCarga: [],
  rutas: [],
}

/** Responde el catálogo público por si alguien lo consulta; el resto lo decide `login`. */
function mockConCatalogo(login: (url: string, init?: RequestInit) => Response) {
  return mockFetch((url, init) => (url.endsWith('/publico/catalogo') ? jsonResponse(catalogo) : login(url, init)))
}

const llamadasA = (fetchMock: ReturnType<typeof mockFetch>, ruta: string) =>
  fetchMock.mock.calls.filter(([url]) => String(url).endsWith(ruta))

describe('LoginPage', () => {
  it('muestra el error del backend con credenciales inválidas', async () => {
    mockConCatalogo(() => jsonResponse({ error: { code: 'CREDENCIALES_INVALIDAS', message: 'Correo o contraseña incorrectos' } }, 401))
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })

    await user.type(screen.getByLabelText('Correo'), 'admin@pcargo.ec')
    await user.type(screen.getByLabelText('Contraseña'), 'mala')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos')
    expect(tokenStorage.get()).toBeNull()
  })

  it('muestra solo el título, sin textos de encomiendas ni descripción del panel', async () => {
    const fetchMock = mockConCatalogo(() => jsonResponse({}))
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument()
    expect(screen.queryByText(/Encomiendas/)).not.toBeInTheDocument()
    expect(screen.queryByText('Accede al panel de operaciones')).not.toBeInTheDocument()
    // Ya no consulta el catálogo público solo para un subtítulo.
    expect(llamadasA(fetchMock, '/publico/catalogo')).toHaveLength(0)
  })

  it('el ojo muestra y oculta la contraseña', async () => {
    mockConCatalogo(() => jsonResponse({}))
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })

    const password = screen.getByLabelText('Contraseña')
    await user.type(password, 'Admin123!')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('Admin123!')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('valida el formulario antes de enviar', async () => {
    const fetchMock = mockConCatalogo(() => jsonResponse({}))
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Ingresa un correo válido')).toBeInTheDocument()
    expect(llamadasA(fetchMock, '/auth/login')).toHaveLength(0)
  })

  it('guarda el token y navega al panel al iniciar sesión', async () => {
    const fetchMock = mockConCatalogo(() =>
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
    const [[url, init]] = llamadasA(fetchMock, '/auth/login') as [[string, RequestInit]]
    expect(url).toBe('/api/auth/login')
    expect(JSON.parse(init.body as string)).toEqual({ email: 'admin@pcargo.ec', password: 'Admin123!' })
  })
})

describe('LoginPage — seguridad', () => {
  it('no muestra credenciales de ningún usuario', () => {
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })
    expect(screen.queryByText(/Admin123|Operador123|credenciales de demostración/i)).not.toBeInTheDocument()
  })
})
