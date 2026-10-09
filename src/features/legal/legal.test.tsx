import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOKEN_KEY } from '@/lib/api'
import { CLAVE_MENU } from '@/hooks/useMenuMinimizado'
import { CLAVE_TEMA } from '@/lib/tema'
import { renderWithProviders } from '@/test/utils'
import { datoLegal, datosLegalesPendientes, fechaVigencia, PAGINAS_LEGALES } from './datos'
import { CookiesPage, PagoAlCobroPage, PrivacidadPage, TerminosPage } from './paginas'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const PAGINAS = [
  { ruta: '/privacidad', Pagina: PrivacidadPage },
  { ruta: '/terminos', Pagina: TerminosPage },
  { ruta: '/pago-al-cobro', Pagina: PagoAlCobroPage },
  { ruta: '/cookies', Pagina: CookiesPage },
]

describe('datos legales', () => {
  it('un dato sin confirmar se muestra como pendiente, nunca inventado', () => {
    for (const campo of datosLegalesPendientes()) expect(datoLegal(campo)).toMatch(/^\[pendiente: .+\]$/)
  })

  it('formatea la fecha de vigencia en español de Ecuador', () => {
    expect(fechaVigencia()).toMatch(/^\d{1,2} de [a-z]+ de \d{4}$/)
  })
})

describe('páginas legales', () => {
  it.each(PAGINAS)('$ruta tiene título, fecha de vigencia y enlaces a las demás políticas', ({ ruta, Pagina }) => {
    renderWithProviders(<Pagina />, { route: ruta, path: ruta })
    const titulo = PAGINAS_LEGALES.find((p) => p.ruta === ruta)!.titulo
    expect(screen.getByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
    expect(document.title).toBe(`${titulo} · PCargo`)
    expect(screen.getByText(/Vigente desde el/)).toBeInTheDocument()

    const otras = screen.getByRole('navigation', { name: 'Otras políticas' })
    for (const p of PAGINAS_LEGALES.filter((p) => p.ruta !== ruta)) {
      expect(within(otras).getByRole('link', { name: p.titulo })).toHaveAttribute('href', p.ruta)
    }
  })

  it('la política de privacidad identifica al responsable y explica cómo ejercer los derechos', () => {
    renderWithProviders(<PrivacidadPage />, { route: '/privacidad', path: '/privacidad' })
    expect(screen.getByRole('heading', { name: '1. Quién es el responsable de tus datos' })).toBeInTheDocument()
    expect(screen.getAllByText(/Las Gardenias s\/n y El Rosal/).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: '6. Tus derechos' })).toBeInTheDocument()
    expect(screen.getByText(/Superintendencia de Protección de Datos Personales/)).toBeInTheDocument()
    // El enlace de WhatsApp avisa que abre otra pestaña.
    expect(screen.getAllByRole('link', { name: /se abre en una pestaña nueva/ })[0]).toHaveAttribute('target', '_blank')
  })

  it.each(PAGINAS)('$ruta identifica al titular (Wilson Pastillo) y no muestra RUC', ({ ruta, Pagina }) => {
    renderWithProviders(<Pagina />, { route: ruta, path: ruta })
    expect(screen.getByText(`© ${new Date().getFullYear()} PCargo · Wilson Pastillo`)).toBeInTheDocument()
    expect(screen.queryByText(/RUC/)).not.toBeInTheDocument()
  })

  it('la política de pago al cobro aclara que solo se cobra el envío', () => {
    renderWithProviders(<PagoAlCobroPage />, { route: '/pago-al-cobro', path: '/pago-al-cobro' })
    expect(screen.getByText(/No recaudamos el precio de la mercadería/)).toBeInTheDocument()
  })

  it('la política de cookies declara exactamente lo que el sitio guarda en el navegador', () => {
    renderWithProviders(<CookiesPage />, { route: '/cookies', path: '/cookies' })
    const tabla = screen.getByRole('table', { name: 'Datos que el sitio guarda en tu navegador' })
    const claves = within(tabla)
      .getAllByRole('row')
      .slice(1)
      .map((fila) => within(fila).getAllByRole('cell')[0]!.textContent)
    expect(claves).toEqual([CLAVE_TEMA, CLAVE_MENU, TOKEN_KEY])
  })
})
