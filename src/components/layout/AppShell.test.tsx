import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_MENU } from '@/hooks/useMenuMinimizado'
import { tokenStorage } from '@/lib/api'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import { AppShell } from './AppShell'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

function menuLateral() {
  mockFetch(() => jsonResponse([]))
  renderWithProviders(<AppShell />, { route: '/panel', path: '/panel' })
  return document.getElementById('menu-lateral')!
}

describe('AppShell — menú lateral', () => {
  it('no muestra las ciudades de cobertura y no pide ciudades al servidor', () => {
    const menu = menuLateral()
    expect(within(menu).queryByText(/Ibarra|Quito/)).not.toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('/ciudades'))).toBe(false)
  })

  it('se minimiza a iconos, conserva los nombres accesibles y recuerda la preferencia', async () => {
    const menu = menuLateral()
    const boton = within(menu).getByRole('button', { name: 'Minimizar menú' })
    expect(within(menu).getByText('Operación')).toBeVisible()

    await userEvent.click(boton)
    expect(within(menu).getByRole('button', { name: 'Expandir menú' })).toBeInTheDocument()
    expect(menu).toHaveClass('w-16')
    expect(within(menu).queryByText('Operación')).not.toBeInTheDocument()
    // Los enlaces siguen nombrados para lectores de pantalla.
    expect(within(menu).getByRole('link', { name: 'Envíos' })).toHaveAttribute('href', '/envios')
    expect(localStorage.getItem(CLAVE_MENU)).toBe('minimizado')

    await userEvent.click(within(menu).getByRole('button', { name: 'Expandir menú' }))
    expect(menu).toHaveClass('w-60')
    expect(localStorage.getItem(CLAVE_MENU)).toBeNull()
  })

  it('abre minimizado si así se dejó la última vez', () => {
    localStorage.setItem(CLAVE_MENU, 'minimizado')
    const menu = menuLateral()
    expect(menu).toHaveClass('w-16')
    expect(within(menu).getByRole('button', { name: 'Expandir menú' })).toBeInTheDocument()
  })
})

// La barra inferior del móvil no cambia con el menú lateral.
describe('AppShell — navegación móvil', () => {
  it('mantiene las cinco pestañas inferiores', () => {
    menuLateral()
    const navs = screen.getAllByRole('navigation', { name: 'Navegación principal' })
    const inferior = navs.find((n) => n.className.includes('bottom-0'))!
    expect(within(inferior).getAllByRole('link')).toHaveLength(5)
  })
})

describe('AppShell — menú del usuario', () => {
  it('ofrece «Mi perfil» y lleva a /perfil', async () => {
    tokenStorage.set('tok')
    mockFetch((url) =>
      url.endsWith('/auth/me')
        ? jsonResponse({ id: 'u2', nombre: 'Operador Ibarra', email: 'operador@pcargo.ec', rol: 'OPERADOR' })
        : jsonResponse([]),
    )
    renderWithProviders(<AppShell />, {
      route: '/panel',
      path: '/panel',
      extraRoutes: [{ path: '/perfil', element: <p>Página de perfil</p> }],
    })
    await userEvent.click(await screen.findByRole('button', { name: /Operador Ibarra/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Mi perfil' }))
    expect(await screen.findByText('Página de perfil')).toBeInTheDocument()
  })
})

describe('AppShell — opciones solo para ADMIN', () => {
  const sesion = (rol: 'ADMIN' | 'OPERADOR') => {
    tokenStorage.set('tok')
    mockFetch((url) =>
      url.endsWith('/auth/me') ? jsonResponse({ id: 'u1', nombre: `Usuario ${rol}`, email: 'x@pcargo.ec', rol }) : jsonResponse([]),
    )
    renderWithProviders(<AppShell />, { route: '/panel', path: '/panel' })
  }

  it('el ADMIN ve «Integraciones» junto a la configuración (no en las cinco pestañas del móvil)', async () => {
    sesion('ADMIN')
    const menu = document.getElementById('menu-lateral')!
    expect(await within(menu).findByRole('link', { name: 'Integraciones' })).toHaveAttribute('href', '/integraciones')
    const inferior = screen.getAllByRole('navigation', { name: 'Navegación principal' }).find((n) => n.className.includes('bottom-0'))!
    expect(within(inferior).getAllByRole('link')).toHaveLength(5)
    // En móvil se llega desde el menú del usuario.
    await userEvent.click(screen.getByRole('button', { name: /Usuario ADMIN/ }))
    expect(await screen.findByRole('menuitem', { name: 'Integraciones' })).toBeInTheDocument()
  })

  it('el ADMIN ve «Tarifas y tipos de carga» en Configuración, entre Cobertura e Integraciones, y en el menú móvil', async () => {
    sesion('ADMIN')
    const menu = document.getElementById('menu-lateral')!
    expect(await within(menu).findByRole('link', { name: 'Tarifas y tipos de carga' })).toHaveAttribute('href', '/catalogo')
    const nombres = within(menu).getAllByRole('link').map((a) => a.textContent)
    expect(nombres.indexOf('Tarifas y tipos de carga')).toBe(nombres.indexOf('Cobertura y tarifas') + 1)
    expect(nombres.indexOf('Integraciones')).toBe(nombres.indexOf('Tarifas y tipos de carga') + 1)
    await userEvent.click(screen.getByRole('button', { name: /Usuario ADMIN/ }))
    expect(await screen.findByRole('menuitem', { name: 'Tarifas y tipos de carga' })).toBeInTheDocument()
  })

  it('un OPERADOR no ve «Integraciones»', async () => {
    sesion('OPERADOR')
    await userEvent.click(await screen.findByRole('button', { name: /Usuario OPERADOR/ }))
    await screen.findByRole('menuitem', { name: 'Mi perfil' })
    expect(screen.queryByRole('menuitem', { name: 'Integraciones' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Tarifas y tipos de carga' })).not.toBeInTheDocument()
    expect(within(document.getElementById('menu-lateral')!).queryByRole('link', { name: 'Tarifas y tipos de carga' })).not.toBeInTheDocument()
    expect(within(document.getElementById('menu-lateral')!).queryByRole('link', { name: 'Integraciones' })).not.toBeInTheDocument()
  })
})
