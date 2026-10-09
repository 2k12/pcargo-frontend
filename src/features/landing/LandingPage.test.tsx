import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useParams } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { CatalogoPublico, Ruta } from '@/types/api'
import { buscarRuta, matrizRutas, resumenCobertura } from './cobertura'
import { LandingPage } from './LandingPage'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const ibarra = { id: 1, nombre: 'Ibarra', activa: true }
const quito = { id: 4, nombre: 'Quito', activa: true }
const ruta = (id: number, origen = ibarra, destino = quito, tiempoEstimadoMin = 180): Ruta => ({
  id, origen, destino, tiempoEstimadoMin, activa: true, operativa: true,
})

const catalogo: CatalogoPublico = {
  ciudades: [ibarra, quito],
  tiposCarga: [
    { codigo: 'SOBRE', nombre: 'Sobre', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 0.5 },
    { codigo: 'VALIJA', nombre: 'Valija', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 25 },
    { codigo: 'TELA', nombre: 'Rollo de tela', precio: 1.25, precioRural: 1.5, mayoreo: { minimoExclusivo: 50, precio: 1 }, pesoMaxKg: 50 },
    { codigo: 'PLUMON_GRANDE', nombre: 'Plumón grande', precio: 4, precioRural: null, mayoreo: null, pesoMaxKg: 50 },
  ],
  rutas: [ruta(1, ibarra, ibarra, 40), ruta(11), ruta(12, quito, ibarra, 150)],
}

describe('cobertura', () => {
  it('busca rutas y arma la matriz de trayectos', () => {
    expect(buscarRuta(catalogo.rutas, 1, 4)?.id).toBe(11)
    expect(buscarRuta(catalogo.rutas, 4, 4)).toBeUndefined()
    const m = matrizRutas(catalogo.ciudades, catalogo.rutas)
    expect(m.map((fila) => fila.map((c) => c.ruta?.id ?? null))).toEqual([[1, 11], [12, null]])
  })

  it('resume la cobertura con los extremos de la red y la base primero', () => {
    expect(resumenCobertura(catalogo.ciudades, catalogo.rutas, 'Ibarra')).toBe('Ibarra ⇄ Quito · 2 ciudades')
    expect(resumenCobertura(catalogo.ciudades, [ruta(12, quito, ibarra)], 'Ibarra')).toBe('Ibarra ⇄ Quito · 2 ciudades')
    expect(resumenCobertura(catalogo.ciudades, [ruta(1, ibarra, ibarra)])).toBe('2 ciudades')
    expect(resumenCobertura([ibarra], [])).toBe('Ibarra')
    expect(resumenCobertura([], [])).toBe('')
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

  it('muestra servicios, precios reales y enlaza al login', async () => {
    const fetchMock = mockFetch((url) => (url.endsWith('/publico/catalogo') ? jsonResponse(catalogo) : jsonResponse({}, 404)))
    renderWithProviders(<LandingPage />)

    expect(await screen.findByRole('heading', { name: 'Valija' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Rollo de tela' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /puerta a puerta/i })).toBeInTheDocument()

    const accesos = screen.getAllByRole('link', { name: /Acceso del personal/ })
    expect(accesos.length).toBeGreaterThan(0)
    for (const a of accesos) expect(a).toHaveAttribute('href', '/login')

    const [, init] = fetchMock.mock.calls[0]!
    expect((init!.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('la cápsula de la portada resume la cobertura desde la API y lleva a la sección', async () => {
    const cayambe = { id: 9, nombre: 'Cayambe', activa: true }
    const atuntaqui = { id: 2, nombre: 'Atuntaqui', activa: false }
    mockFetch(() =>
      jsonResponse({
        ...catalogo,
        ciudades: [atuntaqui, cayambe, ibarra, quito],
        rutas: [...catalogo.rutas, { ...ruta(13, ibarra, cayambe, 4), tiempoEstimadoMin: 60 }],
      }),
    )
    renderWithProviders(<LandingPage />)
    const capsula = await screen.findByRole('link', { name: 'Ibarra ⇄ Quito · 3 ciudades' })
    expect(capsula).toHaveAttribute('href', '#cobertura')
    expect(screen.queryByText(/Ibarra · Cayambe/)).not.toBeInTheDocument()
  })

  it('muestra la dirección, ambos teléfonos y el enlace de WhatsApp', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    const contacto = await screen.findByRole('heading', { name: 'Contáctanos' })
    const seccion = contacto.closest('section')!

    expect(within(seccion).getByText(/Las Gardenias s\/n y El Rosal \(La Florida\), Ibarra, Ecuador/)).toBeInTheDocument()
    expect(within(seccion).getByRole('link', { name: '06 263 2669' })).toHaveAttribute('href', 'tel:+59362632669')
    expect(within(seccion).getByRole('link', { name: '+593 99 801 4093' })).toHaveAttribute('href', 'tel:+593998014093')
    expect(within(seccion).getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/593998014093\?text=/,
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

describe('LandingPage — precios por tipo (contrato v8)', () => {
  it('publica la tabla de precios por tipo con tela urbana/rural y la regla de más de 50 rollos', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    const tabla = await screen.findByRole('table', { name: /Precios por unidad según el tipo de carga/ })
    const fila = (nombre: string) => within(tabla).getByRole('rowheader', { name: new RegExp(nombre) }).closest('tr')!
    expect(within(fila('Sobre')).getAllByText('$3,00')).toHaveLength(2)
    expect(within(fila('Plumón grande')).getAllByText('$4,00')).toHaveLength(2)
    expect(within(fila('Rollo de tela')).getByText('$1,25')).toBeInTheDocument()
    expect(within(fila('Rollo de tela')).getByText('$1,50')).toBeInTheDocument()
    expect(screen.getByTestId('regla-mayoreo')).toHaveTextContent('Más de 50 rollos de tela en un mismo envío: todos a $1,00 c/u, en cualquier zona.')
  })

  it('ya no muestra la matriz de tarifas por ruta: los trayectos solo llevan tiempo estimado', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    const tiempos = await screen.findByRole('table', { name: /Tiempo estimado de entrega por trayecto/ })
    expect(within(tiempos).getAllByText('3 h')).toHaveLength(1)
    expect(within(tiempos).getByText('40 min')).toBeInTheDocument()
    expect(within(tiempos).queryByText(/\$/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(2)
    const seccion = document.getElementById('cobertura')!
    expect(seccion).not.toHaveTextContent(/tarifa base|factor|por cada kg/i)
    expect(seccion).toHaveTextContent(/Los tiempos son estimados/)
    expect(seccion).toHaveTextContent(/El valor definitivo es el de tu guía/)
  })

  it('«Envíos desde» usa el menor precio base publicado ($1,25), no el de mayoreo', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    const cifra = (await screen.findByText('Envíos desde')).closest('div')!
    await within(cifra).findByText('$1,25')
    expect(within(cifra).queryByText('$1,00')).not.toBeInTheDocument()
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

  it('el texto alternativo de la foto la describe sin presentarla como personal real de PCargo', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    const foto = await screen.findByRole('img', { name: /repartidor con uniforme azul/ })
    expect(foto.getAttribute('alt')).not.toMatch(/de PCargo/)
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
    // El pie de la landing solo lleva el copyright: la razón social va en las páginas legales y no hay RUC.
    expect(within(footer).getByText(`© ${new Date().getFullYear()} PCargo`)).toBeInTheDocument()
    expect(within(footer).queryByText(/RUC|Wilson Pastillo/)).not.toBeInTheDocument()
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

describe('LandingPage — pie de página y mapa', () => {
  it('muestra el crédito del desarrollador en el pie, como enlace externo accesible', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByText('Desarrollado por')).toBeInTheDocument()
    const enlace = within(footer).getByRole('link', { name: /KUVRO\s+TECH/ })
    expect(enlace).toHaveAttribute('href', 'https://kuvro-production.up.railway.app/')
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAccessibleName(/se abre en una pestaña nueva/)
  })

  it('el mapa de cobertura ya no lleva la nota «Mapa esquemático»', async () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(<LandingPage />)
    await screen.findByRole('img', { name: /Mapa de cobertura/ })
    expect(screen.queryByText(/Mapa esquemático/)).not.toBeInTheDocument()
  })
})
