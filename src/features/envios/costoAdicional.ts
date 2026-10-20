// Costo adicional (contrato v15): recargo acordado en USD que se suma a la tarifa del envío.
// Lógica pura compartida por el formulario «Nuevo envío» y la importación desde Excel.

export const MAX_COSTO_ADICIONAL = 9999.99

export const MENSAJES_COSTO_ADICIONAL = {
  formato: 'Escribe un monto, p. ej. 2 o 1,50',
  negativo: 'No puede ser negativo',
  decimales: 'Máximo 2 decimales',
  maximo: 'Máximo $9.999,99',
} as const

/**
 * Lee el monto escrito por el operador: entero o decimal con punto o coma («2», «1,50», «1.5»).
 * Vacío → 0. Devuelve el mensaje de error en español si no es válido.
 */
export function leerCostoAdicional(texto: string | null | undefined): { valor: number; error?: undefined } | { valor?: undefined; error: string } {
  const t = (texto ?? '').trim().replace(/\s+/g, '')
  if (!t) return { valor: 0 }
  if (/^-\s*\d/.test(t)) return { error: MENSAJES_COSTO_ADICIONAL.negativo }
  const m = /^\+?(\d+)(?:[.,](\d+))?$/.exec(t)
  if (!m) return { error: MENSAJES_COSTO_ADICIONAL.formato }
  if ((m[2]?.length ?? 0) > 2) return { error: MENSAJES_COSTO_ADICIONAL.decimales }
  const valor = Number(`${m[1]}.${m[2] ?? '0'}`)
  if (valor > MAX_COSTO_ADICIONAL) return { error: MENSAJES_COSTO_ADICIONAL.maximo }
  return { valor }
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Tarifa + adicional, redondeado a centavos como en el servidor. */
export const totalConAdicional = (tarifa: number, adicional: number) => round2(tarifa + adicional)

/** Adicional de un envío; tolera respuestas anteriores a v15 (sin el campo). */
export const adicionalDe = (envio: { costoAdicional?: number | null }) => envio.costoAdicional ?? 0
