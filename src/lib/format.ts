const currency = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })
const dateTime = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' })
const dateOnly = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' })

export function formatCurrency(value: number): string {
  return currency.format(value)
}

/** Ingreso de dinero: siempre con signo "+" (se muestra en verde de marca). */
export function formatIngreso(value: number): string {
  return `+${currency.format(value)}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateTime.format(d)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateOnly.format(d)
}

export function formatPeso(kg: number): string {
  return `${kg.toLocaleString('es-EC', { maximumFractionDigits: 2 })} kg`
}

export function formatDuracion(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

const relativo = new Intl.RelativeTimeFormat('es-EC', { numeric: 'auto' })

/** "hace un momento", "hace 5 minutos", "hace 2 horas"… respecto de `ahora`. */
export function formatRelativo(fecha: number | string, ahora: number = Date.now()): string {
  const t = typeof fecha === 'number' ? fecha : new Date(fecha).getTime()
  if (Number.isNaN(t)) return '—'
  const seg = Math.round((t - ahora) / 1000)
  if (Math.abs(seg) < 45) return 'hace un momento'
  const min = Math.round(seg / 60)
  if (Math.abs(min) < 60) return relativo.format(min, 'minute')
  const h = Math.round(min / 60)
  if (Math.abs(h) < 24) return relativo.format(h, 'hour')
  return relativo.format(Math.round(h / 24), 'day')
}
