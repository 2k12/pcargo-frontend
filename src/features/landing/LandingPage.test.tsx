import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useParams } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { CatalogoPublico, Ruta } from '@/types/api'
import { buscarRuta, matrizTarifas, tarifaDesde } from './cobertura'
import { LandingPage } from './LandingPage'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const ibarra = { id: 1, nombre: 'Ibarra', activa: true }
const quito = { id: 4, nombre: 'Quito', activa: true }
const ruta = (id: number, origen = ibarra, destino = quito, tarifaBase = 6): Ruta => ({
  id, origen, destino, tarifaBase, tiempoEstimadoMin: 180, activa: true, operativa: true,
})

const catalogo: CatalogoPublico = {
  ciudades: [ibarra, quito],
  tiposCarga: [
    { codigo: 'SOBRE', nombre: 'Sobre', factor: 1, pesoIncluidoKg: 0.5, pesoMaxKg: 0.5 },
    { codigo: 'VALIJA', nombre: 'Valija', factor: 1.8, pesoIncluidoKg: 2, pesoMaxKg: 25 },
  ],
  rutas: [ruta(1, ibarra, ibarra, 2), ruta(11), ruta(12, quito, ibarra, 6)],
}

describe('cobertura', () => {
  it('busca rutas, calcula la tarifa mínima y arma la matriz', () => {
    expect(buscarRuta(catalogo.rutas, 1, 4)?.id).toBe(11)
    expect(buscarRuta(catalogo.rutas, 4, 4)).toBeUndefined()
    expect(tarifaDesde(catalogo.rutas)).toBe(2)
    expect(tarifaDesde([])).toBeNull()
    const m = matrizTarifas(catalogo.ciudades, catalogo.rutas)
    expect(m.map((fila) => fila.map((c) => c.ruta?.id ?? null))).toEqual([[1, 11], [12, null]])
  })
})

describe('LandingPage (pública)', () => {
  it('el footer muestra a la derecha el carrusel con las ciudades de cobertura del catálogo', async () => {
    mockFetch((url) => (url.endsWith('/publico/catalogo') ? jsonResponse(catalogo) : jsonResponse({}, 404)))
    renderWithProviders(<LandingPage />)
    const footer = screen.getByRole('contentinfo')
    const carrusel = await within(footer).findByRole('region', { name: 'Ciudades con cobertura' })
    expect(within(carrusel).getByText('Ibarra', { ignore: '[aria-hidden="true"] *' })).toBeInTheDocument()
    expect(within(carrusel).getByText('Quito', { ignore: '[aria-hidden="true"] *' })).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: 'Rastrear envío' })).toBeInTheDocument()
  })

  it('muestra servicios, tarifas reales y enlaza al login', async () => {
    const fetchMock = mockFetch((url) => (url.endsWith('/publico/catalogo') ? jsonResponse(catalogo) : jsonResponse({}, 404)))
    renderWithProviders(<LandingPage />)

    expect(await screen.findByRole('heading', { name: 'Valija' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /puerta a puerta/i })).toBeInTheDocument()

    const tabla = screen.getByRole('table')
    expect(within(tabla).getAllByText('$6,00')).toHaveLength(2)
    expect(within(tabla).getByText('$2,00')).toBeInTheDocument()

    const accesos = screen.getAllByRole('link', { name: /Acceso del personal/ })
    expect(accesos.length).toBeGreaterThan(0)
    for (const a of accesos) expect(a).toHaveAttribute('href', '/login')

    const [, init] = fetchMock.mock.calls[0]!
    expect((init!.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('muestra las ciudades de cobertura desde la API (sin listas fijas)', async () => {
    mockFetch(() => jsonResponse({ ...catalogo, ciudades: [ibarra, { id: 9, nombre: 'Cayambe', activa: true }] }))
    renderWithProviders(<LandingPage />)
    expect(await screen.findByText('Ibarra · Cayambe')).toBeInTheDocument()
    expect(screen.queryByText(/Atuntaqui/)).not.toBeInTheDocument()
  })

  it('muestra la dirección, ambos teléfonos y el enlace de WhatsApp', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    const contacto = await screen.findByRole('heading', { name: 'Contáctanos' })
    const seccion = contacto.closest('section')!

    expect(within(seccion).getByText(/Las Gardenias s\/n y El Rosal \(La Florida\), Ibarra, Ecuador/)).toBeInTheDocument()
    expect(within(seccion).getByRole('link', { name: '06 263 2669' })).toHaveAttribute('href', 'tel:+59362632669')
    expect(within(seccion).getByRole('link', { name: '+593 99 518 7551' })).toHaveAttribute('href', 'tel:+593995187551')
    expect(within(seccion).getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/593995187551\?text=/,
    )
  })

  it('el rastreador lleva al seguimiento con la guía sin ceros a la izquierda', async () => {
    mockFetch(() => jsonResponse(catalogo))
    const user = userEvent.setup()
    function Destino() {
      const { numeroGuia } = useParams()
      return <p>Seguimiento de {numeroGuia}</p>
    }
    renderWithProviders(<LandingPage />, {
      extraRoutes: [{ path: '/seguimiento/:numeroGuia', element: <Destino /> }],
    })

    await user.type(screen.getByLabelText('Número de guía'), ' 0040425 ')
    await user.click(screen.getByRole('button', { name: /Rastrear/ }))
    expect(await screen.findByText('Seguimiento de 40425')).toBeInTheDocument()
  })
})

describe('LandingPage — información veraz y legal', () => {
  it('no publica horario ni correo sin confirmar', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    const seccion = (await screen.findByRole('heading', { name: 'Contáctanos' })).closest('section')!
    expect(within(seccion).queryByText('Horario')).not.toBeInTheDocument()
    expect(within(seccion).queryByText('Correo')).not.toBeInTheDocument()
    expect(within(seccion).queryByText(/@pcargo\.ec/)).not.toBeInTheDocument()
  })

  it('la foto generada con IA se declara ilustrativa y su texto alternativo no dice que es personal real', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    const foto = await screen.findByRole('img', { name: /repartidor con uniforme azul/ })
    expect(foto.getAttribute('alt')).not.toMatch(/de PCargo/)
    expect(screen.getByText('Imagen ilustrativa generada con inteligencia artificial.')).toBeInTheDocument()
  })

  it('el pie enlaza las políticas y muestra los datos del negocio', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    const footer = screen.getByRole('contentinfo')
    const legal = within(footer).getByRole('navigation', { name: 'Información legal' })
    for (const [nombre, href] of [
      ['Política de privacidad', '/privacidad'],
      ['Términos y condiciones', '/terminos'],
      ['Política de pago al cobro', '/pago-al-cobro'],
      ['Política de cookies', '/cookies'],
    ]) {
      expect(within(legal).getByRole('link', { name: nombre })).toHaveAttribute('href', href)
    }
    expect(within(footer).getByText(/RUC/)).toBeInTheDocument()
  })

  it('los enlaces a WhatsApp y Google Maps avisan que se abren en otra pestaña', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    await screen.findByRole('heading', { name: 'Contáctanos' })
    for (const enlace of screen.getAllByRole('link').filter((a) => a.getAttribute('target') === '_blank')) {
      expect(enlace).toHaveAccessibleName(/se abre en una pestaña nueva/)
      expect(enlace.getAttribute('rel')).toContain('noopener')
    }
  })
})
