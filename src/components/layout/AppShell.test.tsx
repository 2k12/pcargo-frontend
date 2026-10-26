import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_MENU } from '@/hooks/useMenuMinimizado'
import { tokenStorage } from '@/lib/api'
import { jsonResponse, mockFetch, renderWithProviders, simularMovil } from '@/test/utils'
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

const barraInferior = () =>
  screen.getAllByRole('navigation', { name: 'Navegación principal' }).find((n) => n.className.includes('bottom-0'))!

/** Abre «Más» en la barra inferior y devuelve los nombres de sus enlaces. */
async function abrirMas() {
  await userEvent.click(within(barraInferior()).getByRole('button', { name: 'Más' }))
  const mas = await screen.findByRole('navigation', { name: 'Más secciones' })
  return { mas, nombres: within(mas).getAllByRole('link').map((a) => a.textContent) }
}

// La barra inferior del móvil no cambia con el menú lateral.
describe('AppShell — navegación móvil', () => {
  it('cuatro pestañas diarias (Resumen, Envíos, Clientes, Caja) y «Más»', () => {
    menuLateral()
    const inferior = barraInferior()
    expect(within(inferior).getAllByRole('link').map((a) => a.textContent)).toEqual(['Resumen', 'Envíos', 'Clientes', 'Caja'])
    expect(within(inferior).getByRole('button', { name: 'Más' })).toBeInTheDocument()
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

  it('en móvil, «Más» le muestra al ADMIN todas las demás secciones agrupadas, su perfil y cerrar sesión', async () => {
    sesion('ADMIN')
    const menu = document.getElementById('menu-lateral')!
    expect(await within(menu).findByRole('link', { name: 'Integraciones' })).toHaveAttribute('href', '/integraciones')
    const { mas, nombres } = await abrirMas()
    expect(nombres).toEqual([
      'Reportes',
      'Talonarios',
      'Cobertura y tarifas',
      'Tarifas y tipos de carga',
      'Integraciones',
      'Usuarios',
      'Datos personales',
      'Rastreo de envíos',
      expect.stringContaining('Mi perfil'),
    ])
    expect(within(mas).getByText('Administración')).toBeInTheDocument()
    expect(within(mas).getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })

  it('el ADMIN ve «Tarifas y tipos de carga» en Configuración, entre Cobertura e Integraciones', async () => {
    sesion('ADMIN')
    const menu = document.getElementById('menu-lateral')!
    expect(await within(menu).findByRole('link', { name: 'Tarifas y tipos de carga' })).toHaveAttribute('href', '/catalogo')
    const nombres = within(menu).getAllByRole('link').map((a) => a.textContent)
    expect(nombres.indexOf('Tarifas y tipos de carga')).toBe(nombres.indexOf('Cobertura y tarifas') + 1)
    expect(nombres.indexOf('Integraciones')).toBe(nombres.indexOf('Tarifas y tipos de carga') + 1)
  })

  it('un OPERADOR no ve las secciones del ADMIN, ni en el menú lateral ni en «Más»', async () => {
    sesion('OPERADOR')
    await screen.findByRole('button', { name: /Usuario OPERADOR/ })
    const { nombres } = await abrirMas()
    expect(nombres).toEqual(['Reportes', 'Talonarios', 'Cobertura y tarifas', 'Rastreo de envíos', expect.stringContaining('Mi perfil')])
    expect(within(document.getElementById('menu-lateral')!).queryByRole('link', { name: 'Tarifas y tipos de carga' })).not.toBeInTheDocument()
    expect(within(document.getElementById('menu-lateral')!).queryByRole('link', { name: 'Integraciones' })).not.toBeInTheDocument()
  })
})

describe('AppShell — búsqueda rápida de guías (contrato v21)', () => {
  it('en escritorio la barra superior tiene el campo «Buscar guía» con el atajo «/»', async () => {
    menuLateral()
    const barra = screen.getByRole('banner')
    const campo = within(barra).getByRole('searchbox', { name: 'Buscar guía' })
    await userEvent.keyboard('/')
    expect(campo).toHaveFocus()
  })

  it('en móvil es una lupa que despliega el campo sobre la barra', async () => {
    simularMovil()
    menuLateral()
    const barra = screen.getByRole('banner')
    expect(within(barra).queryByRole('searchbox')).not.toBeInTheDocument()
    await userEvent.click(within(barra).getByRole('button', { name: 'Buscar guía' }))
    expect(within(barra).getByRole('searchbox', { name: 'Buscar guía' })).toHaveFocus()
  })
})
