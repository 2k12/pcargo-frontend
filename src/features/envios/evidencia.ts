// Evidencia de entrega (contrato v9): foto de la guía firmada + nombre de quien recibió.
// Validación y preparación de la foto en el navegador antes de subirla.
import { z } from 'zod'

export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'] as const
export const ACCEPT_FOTO = TIPOS_FOTO.join(',')
/** Límite del servidor. */
export const MAX_BYTES_FOTO = 5 * 1024 * 1024
/** Por encima de esto se reduce en el navegador (las fotos del celular suelen pesar 3–8 MB). */
export const UMBRAL_COMPRESION = 1.5 * 1024 * 1024
export const LADO_MAXIMO = 2000
export const CALIDAD_JPEG = 0.8

export const MENSAJE_FOTO_FALTA = 'Toma o elige la foto de la guía firmada'
export const MENSAJE_FOTO_TIPO = 'La foto debe ser JPG, PNG o WebP'
export const MENSAJE_FOTO_PESO = 'La foto pesa más de 5 MB; tómala con menos resolución'

export const evidenciaSchema = z.object({
  recibidoPor: z
    .string()
    .trim()
    .min(2, 'Escribe el nombre de quien recibió (mínimo 2 caracteres)')
    .max(120, 'Máximo 120 caracteres'),
  foto: z
    .custom<File>((v) => typeof File !== 'undefined' && v instanceof File, MENSAJE_FOTO_FALTA)
    .refine((f) => (TIPOS_FOTO as readonly string[]).includes(f.type), MENSAJE_FOTO_TIPO),
})

export type EvidenciaFormValues = z.infer<typeof evidenciaSchema>

/** Escala para que el lado mayor no pase de `max` (nunca agranda). */
export function dimensionesEscaladas(ancho: number, alto: number, max = LADO_MAXIMO): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto)
  if (mayor <= max) return { ancho, alto }
  const f = max / mayor
  return { ancho: Math.round(ancho * f), alto: Math.round(alto * f) }
}

/** Reduce la imagen con canvas (lado mayor 2000 px, JPEG 0.8). */
export async function comprimirImagen(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)
  try {
    const { ancho, alto } = dimensionesEscaladas(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas no disponible')
    // Fondo blanco: un PNG con transparencia no queda negro al pasarlo a JPEG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, ancho, alto)
    ctx.drawImage(bitmap, 0, 0, ancho, alto)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo comprimir'))), 'image/jpeg', CALIDAD_JPEG),
    )
  } finally {
    bitmap.close?.()
  }
}

export interface FotoPreparada {
  archivo: Blob
  nombre: string
}

/**
 * Deja la foto lista para subir: si pesa más de 1,5 MB intenta reducirla; si después sigue
 * pasando de 5 MB, devuelve el error para mostrarlo en el campo.
 */
export async function prepararFoto(
  archivo: File,
  comprimir: (f: File) => Promise<Blob> = comprimirImagen,
): Promise<FotoPreparada | { error: string }> {
  let resultado: FotoPreparada = { archivo, nombre: archivo.name || 'evidencia.jpg' }
  if (archivo.size > UMBRAL_COMPRESION) {
    try {
      const reducida = await comprimir(archivo)
      if (reducida.size < archivo.size) {
        resultado = { archivo: reducida, nombre: `${(archivo.name || 'evidencia').replace(/\.[^.]+$/, '')}.jpg` }
      }
    } catch {
      // Sin canvas / formato no decodificable: se intenta con el original.
    }
  }
  if (resultado.archivo.size > MAX_BYTES_FOTO) return { error: MENSAJE_FOTO_PESO }
  return resultado
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('es-EC', { maximumFractionDigits: 1 })} MB`
}
