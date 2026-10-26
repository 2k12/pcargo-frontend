import type { Envio } from '@/types/api'
// Número de guía (contrato v4): solo dígitos; los ceros a la izquierda no cuentan (0040425 = 40425).
export const MAX_DIGITOS_GUIA = 12

/** ¿El texto (con espacios opcionales) es solo dígitos? Vacío → false. */
export const esTextoGuia = (texto: string): boolean => /^\s*\d[\d\s]*$/.test(texto)

/**
 * Normaliza lo que escribe el usuario a la forma canónica (sin espacios ni ceros a la izquierda).
 * Devuelve null si no es un número de guía válido (letras, cero, más de 12 dígitos).
 */
export function normalizarGuia(texto: string): string | null {
  if (!esTextoGuia(texto)) return null
  const sinCeros = texto.replace(/\s+/g, '').replace(/^0+/, '')
  if (!sinCeros || sinCeros.length > MAX_DIGITOS_GUIA) return null
  return sinCeros
}

/**
 * Número de guía a partir de lo leído en el QR de la guía impresa (`<sitio>/seguimiento/<numero>`)
 * o de lo que se escriba (admite ceros a la izquierda). null si no hay un número válido.
 */
export function numeroGuiaDesdeQr(texto: string): string | null {
  const t = texto.trim()
  if (!t) return null
  const enUrl = /\/seguimiento\/0*(\d{1,12})(?:[/?#]|$)/.exec(t)
  if (enUrl) return normalizarGuia(enUrl[1]!)
  return normalizarGuia(t)
}

export const etiquetaGuia = (n: number): string => `Guía ${n}`

export const MENSAJE_GUIA_INVALIDA = 'Ingresa solo los números de la guía (puedes incluir los ceros de adelante)'

/** Cómo coincide un envío con el número buscado (contrato v21): por el número del sistema o por la guía física. */
export function tipoCoincidencia(envio: Pick<Envio, 'numeroGuia'>, numero: string): 'sistema' | 'fisica' {
  return String(envio.numeroGuia) === numero ? 'sistema' : 'fisica'
}

/** «N.º sistema 40425» o «Guía física 40425». */
export const etiquetaCoincidencia = (envio: Pick<Envio, 'numeroGuia'>, numero: string) =>
  `${tipoCoincidencia(envio, numero) === 'sistema' ? 'N.º sistema' : 'Guía física'} ${numero}`

/** Ruta que abre en Envíos un envío ya encontrado por su número (búsqueda rápida). */
export const rutaEnvio = (numero: string, envio: Pick<Envio, 'id'>) => `/envios?guia=${numero}&envio=${encodeURIComponent(envio.id)}`
