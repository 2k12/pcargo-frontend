import { describe, expect, it } from 'vitest'
import type { Ciudad, Ruta } from '@/types/api'
import { conexiones, normalizarNombre, ubicarCiudades } from './mapa'

const c = (id: number, nombre: string): Ciudad => ({ id, nombre, activa: true })
const ruta = (id: number, o: Ciudad, d: Ciudad): Ruta => ({
  id, origen: o, destino: d, tarifaBase: 2, tiempoEstimadoMin: 30, activa: true, operativa: true,
})

describe('mapa de cobertura', () => {
  it('normaliza tildes, mayúsculas y espacios', () => {
    expect(normalizarNombre('  Urcuquí ')).toBe('urcuqui')
    expect(normalizarNombre('San  Antonio de IBARRA')).toBe('san antonio de ibarra')
  })

  it('ubica ciudades conocidas respetando la geografía y separa las desconocidas', () => {
    const ibarra = c(1, 'Ibarra')
    const quito = c(4, 'Quito')
    const otavalo = c(3, 'Otavalo')
    const { puntos, sinUbicar, encuadre } = ubicarCiudades([ibarra, quito, otavalo, c(9, 'Puerto Inventado')])
    expect(sinUbicar.map((x) => x.nombre)).toEqual(['Puerto Inventado'])
    const p = Object.fromEntries(puntos.map((x) => [x.ciudad.nombre, x]))
    // Quito está al sur (más abajo) y al oeste (más a la izquierda) de Ibarra
    expect(p.Quito!.y).toBeGreaterThan(p.Ibarra!.y)
    expect(p.Quito!.x).toBeLessThan(p.Ibarra!.x)
    // todo dentro del lienzo
    for (const x of puntos) {
      expect(x.x).toBeGreaterThan(0)
      expect(x.x).toBeLessThan(encuadre!.ancho)
      expect(x.y).toBeGreaterThan(0)
      expect(x.y).toBeLessThan(encuadre!.alto)
    }
  })

  it('sin ciudades conocidas no hay encuadre', () => {
    expect(ubicarCiudades([c(1, 'Nada')]).encuadre).toBeNull()
  })

  it('las conexiones ignoran rutas urbanas y sentidos repetidos', () => {
    const a = c(1, 'Ibarra')
    const b = c(4, 'Quito')
    expect(conexiones([ruta(1, a, a), ruta(2, a, b), ruta(3, b, a)])).toEqual([[1, 4]])
  })
})
