import { renderHook, screen } from '@testing-library/react'
import { createElement } from 'react'
import { SeguimientoPage } from '@/features/seguimiento/SeguimientoPage'
import { LandingPage } from './LandingPage'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useHerramientasAgente, type HerramientaAgente } from '@/lib/webmcp'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { CatalogoPublico } from '@/types/api'
import { buscarRuta, HERRAMIENTAS_PUBLICAS } from './agente'

afterEach(() => {
  vi.unstubAllGlobals()
  delete (document as { modelContext?: unknown }).modelContext
})

const ciudad = (id: number, nombre: string) => ({ id, nombre, activa: true })
const catalogo: CatalogoPublico = {
  ciudades: [ciudad(1, 'Ibarra'), ciudad(2, 'Atuntaqui'), ciudad(4, 'Quito')],
  tiposCarga: [
    { codigo: 'PAQUETE', nombre: 'Paquete', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 50 },
    { codigo: 'TELA', nombre: 'Rollo de tela', precio: 1.25, precioRural: 1.5, mayoreo: { minimoExclusivo: 50, precio: 1 }, pesoMaxKg: 50 },
  ],
  rutas: [
    { id: 7, origen: ciudad(1, 'Ibarra'), destino: ciudad(4, 'Quito'), tiempoEstimadoMin: 150, activa: true, operativa: true },
    { id: 9, origen: ciudad(2, 'Atuntaqui'), destino: ciudad(2, 'Atuntaqui'), tiempoEstimadoMin: 45, activa: true, operativa: true },
  ],
}

const herramienta = (nombre: string) => HERRAMIENTAS_PUBLICAS.find((h) => h.name === nombre)!

describe('buscarRuta', () => {
  it('encuentra la ruta sin importar tildes ni mayúsculas, incluida la urbana', () => {
    expect(buscarRuta(catalogo, ' ibarra', 'QUITO')?.id).toBe(7)
    expect(buscarRuta(catalogo, 'Atuntaquí', 'atuntaqui')?.id).toBe(9)
    expect(buscarRuta(catalogo, 'Quito', 'Ibarra')).toBeUndefined()
  })
})

describe('herramientas WebMCP', () => {
  it('son de solo lectura y declaran un esquema de objeto', () => {
    expect(HERRAMIENTAS_PUBLICAS.map((h) => h.name)).toEqual(['rastrear_envio', 'cotizar_envio', 'consultar_cobertura'])
    for (const h of HERRAMIENTAS_PUBLICAS) {
      expect(h.annotations?.readOnlyHint).toBe(true)
      expect(h.inputSchema.type).toBe('object')
    }
  })

  it('cotizar_envio resuelve la ruta por nombre y consulta la cotización pública', async () => {
    const fetch = mockFetch((url) =>
      url.endsWith('/publico/catalogo')
        ? jsonResponse(catalogo)
        : jsonResponse({ costo: 6, zona: 'URBANA', totalPiezas: 2, pesoTotalKg: 6, items: [{ costoUnitario: 3, mayoreo: false }] }),
    )
    const r = JSON.parse(
      await herramienta('cotizar_envio').execute({ origen: 'ibarra', destino: 'Quito', tipoCarga: 'paquete', cantidad: 2, pesoKg: 3 }),
    )
    expect(r.ruta).toBe('Ibarra → Quito')
    expect(r.costoTotal).toMatch(/6,00/)
    expect(r.zona).toBe('Urbana')
    expect(r.nota).toMatch(/referencial/)
    const [, init] = fetch.mock.calls.find(([u]) => String(u).endsWith('/publico/cotizar'))!
    expect(JSON.parse(String(init!.body))).toEqual({ rutaId: 7, zona: 'URBANA', items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3 }] })
  })

  it('cotizar_envio acepta zona y tipos nuevos, e informa el precio por volumen', async () => {
    const fetch = mockFetch((url) =>
      url.endsWith('/publico/catalogo')
        ? jsonResponse(catalogo)
        : jsonResponse({
            costo: 60,
            zona: 'RURAL',
            totalPiezas: 60,
            pesoTotalKg: 120,
            items: [{ tipoCarga: 'TELA', cantidad: 60, pesoKg: 2, costoUnitario: 1, subtotal: 60, mayoreo: true }],
          }),
    )
    const r = JSON.parse(
      await herramienta('cotizar_envio').execute({ origen: 'Ibarra', destino: 'Quito', tipoCarga: 'tela', cantidad: 60, pesoKg: 2, zona: 'rural' }),
    )
    expect(r.zona).toBe('Rural')
    expect(r.precioPorVolumen).toBe('Más de 50 rollos de tela: $1,00 c/u')
    const [, init] = fetch.mock.calls.find(([u]) => String(u).endsWith('/publico/cotizar'))!
    expect(JSON.parse(String(init!.body))).toMatchObject({ zona: 'RURAL', items: [{ tipoCarga: 'TELA', cantidad: 60 }] })
    expect(await herramienta('cotizar_envio').execute({ origen: 'Ibarra', destino: 'Quito', tipoCarga: 'TELA', cantidad: 1, pesoKg: 1, zona: 'centro' })).toContain(
      'zona debe ser una de: URBANA, RURAL',
    )
  })

  it('consultar_cobertura publica precios por tipo y tiempos por ruta, sin tarifa base', async () => {
    mockFetch(() => jsonResponse(catalogo))
    const herramientaCobertura = herramienta('consultar_cobertura')
    expect(herramientaCobertura.description).not.toMatch(/tarifa base|factor/i)
    const texto = await herramientaCobertura.execute({})
    expect(texto).not.toMatch(/tarifaBase|factor|pesoIncluido/)
    const r = JSON.parse(texto)
    expect(r.rutas[0]).toEqual({ origen: 'Ibarra', destino: 'Quito', tiempoEstimado: '2 h 30 min' })
    expect(r.tiposCarga[1]).toMatchObject({ codigo: 'TELA', precioUrbano: '$1,25', precioRural: '$1,50', mayoreo: 'más de 50 rollos de tela: $1,00 c/u' })
    expect(r.tiposCarga[0]).toMatchObject({ precioUrbano: '$3,00', precioRural: '$3,00' })
    expect(r.tiposCarga[0]).not.toHaveProperty('mayoreo')
  })

  it('cotizar_envio explica cuándo la ruta no existe', async () => {
    mockFetch(() => jsonResponse(catalogo))
    const r = await herramienta('cotizar_envio').execute({ origen: 'Quito', destino: 'Cuenca', tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 1 })
    expect(r).toContain('No operamos la ruta')
    expect(r).toContain('Ibarra, Atuntaqui, Quito')
  })

  it('rastrear_envio normaliza la guía y maneja guías inexistentes o inválidas', async () => {
    const fetch = mockFetch(() => jsonResponse({ error: { code: 'NO_ENCONTRADO', message: 'x' } }, 404))
    expect(await herramienta('rastrear_envio').execute({ numeroGuia: '0040425' })).toContain('No existe un envío con la guía 40425')
    expect(String(fetch.mock.calls[0]![0])).toBe('/api/seguimiento/40425')
    expect(await herramienta('rastrear_envio').execute({ numeroGuia: 'PC-1' })).toContain('solo dígitos')
  })
})

describe('useHerramientasAgente', () => {
  it('registra con AbortSignal y retira las herramientas al desmontar', () => {
    const registerTool = vi.fn()
    ;(document as { modelContext?: unknown }).modelContext = { registerTool }
    const lista: HerramientaAgente[] = HERRAMIENTAS_PUBLICAS
    const { unmount } = renderHook(() => useHerramientasAgente(lista))
    expect(registerTool).toHaveBeenCalledTimes(3)
    const signal: AbortSignal = registerTool.mock.calls[0]![1].signal
    expect(signal.aborted).toBe(false)
    unmount()
    expect(signal.aborted).toBe(true)
  })

  it('sin soporte de WebMCP no hace nada', () => {
    expect(() => renderHook(() => useHerramientasAgente(HERRAMIENTAS_PUBLICAS))).not.toThrow()
  })
})

describe('API declarativa de WebMCP', () => {
  it('el formulario de rastreo expone toolname, tooldescription, toolautosubmit y el parámetro', () => {
    mockFetch(() => jsonResponse({}, 404))
    renderWithProviders(createElement(SeguimientoPage), { route: '/seguimiento', path: '/seguimiento' })
    const input = screen.getByLabelText('Número de guía')
    const form = input.closest('form')!
    expect(form).toHaveAttribute('toolname', 'ver_seguimiento')
    expect(form.getAttribute('tooldescription')).toMatch(/número de guía/)
    expect(form).toHaveAttribute('toolautosubmit', '')
    expect(input).toHaveAttribute('name', 'numeroGuia')
    expect(input).toHaveAttribute('toolparamdescription')
  })

  it('el rastreador de la landing también es una herramienta declarativa', () => {
    mockFetch(() => jsonResponse(catalogo))
    renderWithProviders(createElement(LandingPage))
    const form = screen.getByLabelText('Número de guía').closest('form')!
    expect(form).toHaveAttribute('toolname', 'ver_seguimiento')
    expect(form).toHaveAttribute('toolautosubmit', '')
    expect(screen.getByLabelText('Número de guía')).toHaveAttribute('name', 'numeroGuia')
  })
})
