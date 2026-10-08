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
  tiposCarga: [{ codigo: 'PAQUETE', nombre: 'Paquete', factor: 1.4, pesoIncluidoKg: 5, pesoMaxKg: 30 }],
  rutas: [
    { id: 7, origen: ciudad(1, 'Ibarra'), destino: ciudad(4, 'Quito'), tarifaBase: 4, tiempoEstimadoMin: 150, activa: true, operativa: true },
    { id: 9, origen: ciudad(2, 'Atuntaqui'), destino: ciudad(2, 'Atuntaqui'), tarifaBase: 1.75, tiempoEstimadoMin: 45, activa: true, operativa: true },
  ],
} as CatalogoPublico

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
        : jsonResponse({ costo: 11.2, tarifaBase: 4, totalPiezas: 2, pesoTotalKg: 6, items: [{ costoUnitario: 5.6 }] }),
    )
    const r = JSON.parse(
      await herramienta('cotizar_envio').execute({ origen: 'ibarra', destino: 'Quito', tipoCarga: 'paquete', cantidad: 2, pesoKg: 3 }),
    )
    expect(r.ruta).toBe('Ibarra → Quito')
    expect(r.costoTotal).toMatch(/11,20/)
    const [, init] = fetch.mock.calls.find(([u]) => String(u).endsWith('/publico/cotizar'))!
    expect(JSON.parse(String(init!.body))).toEqual({ rutaId: 7, items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3 }] })
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
