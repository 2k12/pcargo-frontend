import { describe, expect, it, vi } from 'vitest'
import {
  dimensionesEscaladas,
  esquemaEvidencia,
  faltanteEvidencia,
  MAX_BYTES_FOTO,
  MENSAJE_EVIDENCIA_VACIA,
  MENSAJE_FOTO_PESO,
  MENSAJE_NOMBRE_CORTO,
  prepararFoto,
  UMBRAL_COMPRESION,
} from './evidencia'

const archivo = (bytes: number, nombre = 'IMG_0001.png', tipo = 'image/png') =>
  new File([new Uint8Array(bytes)], nombre, { type: tipo })

describe('dimensionesEscaladas', () => {
  it('reduce el lado mayor a 2000 px manteniendo la proporción', () => {
    expect(dimensionesEscaladas(4000, 3000)).toEqual({ ancho: 2000, alto: 1500 })
    expect(dimensionesEscaladas(3024, 4032)).toEqual({ ancho: 1500, alto: 2000 })
  })

  it('no agranda imágenes pequeñas', () => {
    expect(dimensionesEscaladas(1200, 900)).toEqual({ ancho: 1200, alto: 900 })
  })
})

describe('prepararFoto', () => {
  it('sube tal cual una foto liviana (sin comprimir)', async () => {
    const comprimir = vi.fn()
    const f = archivo(200_000)
    expect(await prepararFoto(f, comprimir)).toEqual({ archivo: f, nombre: 'IMG_0001.png' })
    expect(comprimir).not.toHaveBeenCalled()
  })

  it('comprime a JPEG si pasa de 1,5 MB', async () => {
    const reducida = new Blob([new Uint8Array(400_000)], { type: 'image/jpeg' })
    const comprimir = vi.fn(async () => reducida)
    const resultado = await prepararFoto(archivo(UMBRAL_COMPRESION + 1), comprimir)
    expect(comprimir).toHaveBeenCalledOnce()
    expect(resultado).toEqual({ archivo: reducida, nombre: 'IMG_0001.jpg' })
  })

  it('si no se puede comprimir, sube el original cuando cabe en 5 MB', async () => {
    const f = archivo(2 * 1024 * 1024)
    const resultado = await prepararFoto(f, () => Promise.reject(new Error('sin canvas')))
    expect(resultado).toEqual({ archivo: f, nombre: 'IMG_0001.png' })
  })

  it('rechaza más de 5 MB si ni comprimida baja del límite', async () => {
    const f = archivo(MAX_BYTES_FOTO + 1)
    const resultado = await prepararFoto(f, () => Promise.reject(new Error('sin canvas')))
    expect(resultado).toEqual({ error: MENSAJE_FOTO_PESO })
  })

  it('acepta una foto de más de 5 MB que comprimida queda bajo el límite', async () => {
    const reducida = new Blob([new Uint8Array(900_000)], { type: 'image/jpeg' })
    const resultado = await prepararFoto(archivo(8 * 1024 * 1024, 'foto.webp', 'image/webp'), async () => reducida)
    expect(resultado).toEqual({ archivo: reducida, nombre: 'foto.jpg' })
  })
})

describe('esquemaEvidencia (v19: por partes)', () => {
  const foto = new File([new Uint8Array(4)], 'guia.jpg', { type: 'image/jpeg' })
  const errores = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
    r.success ? [] : r.error!.issues.map((i) => i.message)

  it('ambos: acepta solo nombre, solo foto o los dos', () => {
    const s = esquemaEvidencia('ambos')
    expect(s.safeParse({ recibidoPor: 'Ana' }).success).toBe(true)
    expect(s.safeParse({ recibidoPor: '', foto }).success).toBe(true)
    expect(s.safeParse({ recibidoPor: 'Ana', foto }).success).toBe(true)
  })

  it('ambos: sin nombre ni foto pide al menos uno', () => {
    expect(errores(esquemaEvidencia('ambos').safeParse({ recibidoPor: '   ' }))).toEqual([MENSAJE_EVIDENCIA_VACIA])
  })

  it('el nombre, si se escribe, va de 2 a 120 caracteres sin contar los extremos', () => {
    const s = esquemaEvidencia('ambos')
    expect(errores(s.safeParse({ recibidoPor: ' A ', foto }))).toContain(MENSAJE_NOMBRE_CORTO)
    expect(s.safeParse({ recibidoPor: 'x'.repeat(121), foto }).success).toBe(false)
    expect(s.safeParse({ recibidoPor: `  ${'x'.repeat(120)}  ` }).success).toBe(true)
  })

  it('nombre / foto: exige el campo que se edita', () => {
    expect(esquemaEvidencia('nombre').safeParse({ recibidoPor: '' }).success).toBe(false)
    expect(esquemaEvidencia('foto').safeParse({ recibidoPor: '' }).success).toBe(false)
    expect(esquemaEvidencia('foto').safeParse({ recibidoPor: '', foto }).success).toBe(true)
  })
})

describe('faltanteEvidencia', () => {
  it('dice qué falta o null si está completa', () => {
    expect(faltanteEvidencia({ recibidoPor: 'Ana', tipo: 'image/jpeg' })).toBeNull()
    expect(faltanteEvidencia({ recibidoPor: null, tipo: 'image/jpeg' })).toMatch(/nombre/)
    expect(faltanteEvidencia({ recibidoPor: 'Ana', tipo: null })).toMatch(/foto/)
  })
})
