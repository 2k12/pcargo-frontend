import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_MENU } from '@/hooks/useMenuMinimizado'
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
