import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/features/auth/LoginPage'
import { tokenStorage } from '@/lib/api'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Rol } from '@/types/api'
import { AppRoutes } from './routes'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const usuario = (rol: Rol) => ({ id: 'u1', nombre: `Usuario ${rol}`, email: 'x@pcargo.ec', rol, clienteId: rol === 'CLIENTE' ? 'c1' : null })

const resumenPortal = {
  cliente: { id: 'c1', nombre: 'Textiles Atuntaqui', telefono: '0991112233', direccion: null },
  desde: '2026-10-01',
  hasta: '2026-10-18',
  envios: 3,
  monto: 9,
  enCurso: 1,
  entregados: 2,
  porCobrar: 0,
  porEstado: {},
  porFormaPago: [],
  porDia: [],
}

/** Sesión abierta con ese rol y un servidor que responde lo mínimo a cada espacio. */
function sesion(rol: Rol) {
  tokenStorage.set('tok')
  mockFetch((url) => {
    if (url.endsWith('/auth/me')) return jsonResponse(usuario(rol))
    if (url.includes('/repartidor/envios')) return jsonResponse([])
    if (url.includes('/portal/resumen')) return jsonResponse(resumenPortal)
    return jsonResponse([])
  })
}

const abrir = (ruta: string) => renderWithProviders(<AppRoutes />, { route: ruta, path: '/*' })

describe('Rutas por rol (contrato v12)', () => {
  it('un REPARTIDOR que abre el panel termina en su app', async () => {
    sesion('REPARTIDOR')
    abrir('/envios')
    expect(await screen.findByRole('heading', { name: 'Pendientes' }, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeInTheDocument()
    expect(document.getElementById('menu-lateral')).toBeNull()
  })

  it('el REPARTIDOR edita su perfil desde la pestaña «Perfil»', async () => {
    sesion('REPARTIDOR')
    abrir('/repartidor')
    await userEvent.click(await screen.findByRole('link', { name: 'Perfil' }, { timeout: 4000 }))
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveValue('Usuario REPARTIDOR')
    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument()
  })

  it('un CLIENTE que abre el panel o la app del repartidor termina en el portal de su empresa', async () => {
    sesion('CLIENTE')
    abrir('/repartidor/caja')
    expect(await screen.findByTestId('portal-empresa', {}, { timeout: 4000 })).toHaveTextContent('Textiles Atuntaqui')
    expect(await screen.findByRole('heading', { name: 'Resumen' })).toBeInTheDocument()
  })

  it('un OPERADOR que abre el portal vuelve al panel', async () => {
    sesion('OPERADOR')
    abrir('/portal')
    await vi.waitFor(() => expect(document.getElementById('menu-lateral')).not.toBeNull(), { timeout: 4000 })
    expect(screen.queryByTestId('portal-empresa')).not.toBeInTheDocument()
  })

  it('las páginas de administración nuevas son solo para ADMIN', async () => {
    sesion('OPERADOR')
    abrir('/usuarios')
    await vi.waitFor(() => expect(document.getElementById('menu-lateral')).not.toBeNull(), { timeout: 4000 })
    expect(screen.queryByRole('heading', { name: 'Usuarios' })).not.toBeInTheDocument()
  })
})

describe('Login — cada rol va a su espacio', () => {
  it.each([
    ['REPARTIDOR', 'App del repartidor'],
    ['CLIENTE', 'Portal de la empresa'],
    ['ADMIN', 'Panel'],
  ] as const)('%s → %s', async (rol, destino) => {
    mockFetch(() => jsonResponse({ token: 'jwt', usuario: usuario(rol) }))
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, {
      route: '/login',
      path: '/login',
      extraRoutes: [
        { path: '/panel', element: <p>Panel</p> },
        { path: '/repartidor', element: <p>App del repartidor</p> },
        { path: '/portal', element: <p>Portal de la empresa</p> },
      ],
    })
    await user.type(screen.getByLabelText('Correo'), 'x@pcargo.ec')
    await user.type(screen.getByLabelText('Contraseña'), 'Clave1234')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText(destino)).toBeInTheDocument()
  })
})
