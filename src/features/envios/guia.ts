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

export const etiquetaGuia = (n: number): string => `Guía ${n}`

export const MENSAJE_GUIA_INVALIDA = 'Ingresa solo los números de la guía (puedes incluir los ceros de adelante)'
