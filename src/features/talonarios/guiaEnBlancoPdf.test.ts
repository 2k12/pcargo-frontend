import { jsPDF, type TextOptionsLight } from 'jspdf'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ALTO_GUIA, ANCHO_TALON, posicionGuia, X_TALON, type PosicionHoja } from '@/features/envios/guiaPdf'
import { datosGuiaEnBlanco } from './domain'
import { COLUMNAS_PIEZAS, componerGuiasEnBlanco, crearGuiasEnBlancoPdf } from './guiaEnBlancoPdf'

const QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

interface TextoDibujado {
  texto: string
  y: number
  izquierda: number
  derecha: number
  pagina: number
}

/** Dibuja las guías en blanco y devuelve cada texto con su posición (mm) y su hoja. */
function dibujar(numeros: number[], nota: string | null = 'Camión Quito – sábado') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const textos: TextoDibujado[] = []
  const original = doc.text.bind(doc)
  vi.spyOn(doc, 'text').mockImplementation(((t: string | string[], x: number, y: number, opts?: TextOptionsLight) => {
    const lineas = Array.isArray(t) ? t : [t]
    const ancho = Math.max(...lineas.map((l) => doc.getTextWidth(l))) + (opts?.charSpace ?? 0) * Math.max(...lineas.map((l) => l.length - 1))
    const izquierda = opts?.align === 'right' ? x - ancho : opts?.align === 'center' ? x - ancho / 2 : x
    textos.push({ texto: lineas.join(' '), y, izquierda, derecha: izquierda + ancho, pagina: doc.getNumberOfPages() })
    return original(t, x, y, opts)
  }) as typeof doc.text)
  const datos = numeros.map((n) => datosGuiaEnBlanco(n, nota, 'https://pcargo.ec'))
  componerGuiasEnBlanco(doc, datos, null, datos.map(() => QR))
  return { doc, textos }
}

afterEach(() => vi.restoreAllMocks())

describe('guías en blanco de un talonario (PDF)', () => {
  it('lleva número, marca del talonario y los campos vacíos para llenar a mano', () => {
    const { textos } = dibujar([40501])
    const t = textos.map((x) => x.texto)
    expect(t).toEqual(
      expect.arrayContaining([
        'GUÍA N.º 0040501',
        '0040501',
        'TALONARIO · Camión Quito – sábado',
        'REMITENTE',
        'DESTINATARIO',
        'Teléfono:',
        'RUTA',
        'ORIGEN:',
        'DESTINO:',
        ...COLUMNAS_PIEZAS,
        'CANTIDAD',
        'PESO (kg)',
        'FORMA DE PAGO',
        'PAGADO',
        'AL COBRO',
        'CONTRATO',
        'SEGURO',
        'VALOR USD',
        '$',
        'FECHA DE LA GUÍA',
        'FIRMA DE QUIEN RECIBE',
        'ACEPTO CONDICIONES (REMITENTE)',
      ]),
    )
    // Fecha ___/___/____ (dos barras) y ningún dato de un envío.
    expect(t.filter((x) => x === '/')).toHaveLength(2)
    expect(t.some((x) => /\$\s*\d/.test(x))).toBe(false)
  })

  it('cuatro por hoja: la quinta va en otra hoja y nada se sale de su talón', () => {
    const { doc, textos } = dibujar([40501, 40502, 40503, 40504, 40505], 'Nota muy larga '.repeat(8).trim())
    expect(doc.getNumberOfPages()).toBe(2)
    for (const pagina of [1, 2]) {
      const posiciones: PosicionHoja[] = pagina === 1 ? [0, 1, 2, 3] : [0]
      const enHoja = textos.filter((t) => t.pagina === pagina)
      for (const t of enHoja) {
        expect(t.izquierda, t.texto).toBeGreaterThanOrEqual(X_TALON - 0.01)
        expect(t.derecha, t.texto).toBeLessThanOrEqual(X_TALON + ANCHO_TALON + 0.01)
        expect(
          posiciones.some((p) => t.y > posicionGuia(p) && t.y <= posicionGuia(p) + ALTO_GUIA),
          `${t.texto} (y=${t.y})`,
        ).toBe(true)
      }
    }
    expect(textos.filter((t) => t.pagina === 2).some((t) => t.texto === 'GUÍA N.º 0040505')).toBe(true)
  })

  it('sin nota la marca es solo «TALONARIO»', () => {
    expect(dibujar([40501], null).textos.some((t) => t.texto === 'TALONARIO')).toBe(true)
  })

  it('genera el PDF de los números pedidos, ordenados, con su QR de seguimiento', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sin logo'))
    const { blob, nombreArchivo } = await crearGuiasEnBlancoPdf([40503, 40501, 40502], { nota: 'Ruta norte', origen: 'https://pcargo.ec' })
    expect(nombreArchivo).toBe('talonario-0040501-0040503.pdf')
    expect(blob.size).toBeGreaterThan(1000)
    await expect(crearGuiasEnBlancoPdf([])).rejects.toThrow(/No hay guías/)
  })
})
