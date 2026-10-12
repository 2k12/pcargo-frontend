// Catálogo configurable (contrato v11): reglas y textos puros, sin React. Se testean solos.
import { z } from 'zod'
import { formatCurrency, formatPeso } from '@/lib/format'
import type { AccionCambioTipoCarga, CategoriaArticulo, DatosTipoCarga, IconoArticulo, Mayoreo, TipoCarga } from '@/types/api'

export const CODIGO_TIPO_REGEX = /^[A-Z][A-Z0-9_]{1,29}$/
export const MENSAJE_CODIGO =
  'De 2 a 30 caracteres: empieza con una letra mayúscula y sigue con mayúsculas, números o guion bajo (p. ej. CAJA_GRANDE)'

/** «Caja grande (XL)» → «CAJA_GRANDE_XL»: sin tildes, en mayúsculas y con guion bajo; máximo 30 caracteres. */
export function codigoDesdeNombre(nombre: string): string {
  const base = nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/Ñ/g, 'N')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^[^A-Z]+/, '') // debe empezar con letra
    .replace(/_+$/, '')
  return base.slice(0, 30).replace(/_+$/, '')
}

/** Normaliza lo que escribe el ADMIN en el código: mayúsculas y guion bajo en lugar de espacios o guiones. */
export function normalizarCodigo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

/** ¿Tiene como mucho 2 decimales? (con tolerancia de coma flotante). */
const dosDecimales = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6

/** «1,25» o «1.25» → 1.25; vacío → undefined; texto inválido → NaN. */
export function leerDecimal(texto: string | undefined): number | undefined {
  const t = (texto ?? '').trim().replace(',', '.')
  if (t === '') return undefined
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN
}

/** 1.25 → «1.25» para precargar un campo. */
const aTexto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

/** Error de un monto/peso del contrato (> 0, ≤ 1000, 2 decimales) o null si es válido. */
function errorMonto(n: number | undefined, requerido: string, max = 1000, unidad = ''): string | null {
  if (n === undefined) return requerido
  if (Number.isNaN(n)) return 'Escribe un número (p. ej. 3,50)'
  if (n <= 0) return 'Debe ser mayor que 0'
  if (n > max) return `Máximo ${max}${unidad}`
  if (!dosDecimales(n)) return 'Máximo 2 decimales'
  return null
}

/**
 * Formulario de tipo de carga. Los números se escriben como texto (admite coma decimal, como se escribe en Ecuador)
 * y se validan con las reglas del contrato v11.
 */
export const tipoCargaSchema = z
  .object({
    nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(40, 'Máximo 40 caracteres'),
    codigo: z.string().trim().regex(CODIGO_TIPO_REGEX, MENSAJE_CODIGO),
    precio: z.string(),
    /** Vacío: igual al urbano (`precioRural: null`). */
    precioRural: z.string(),
    conMayoreo: z.boolean(),
    mayoreoMinimo: z.string(),
    mayoreoPrecio: z.string(),
    pesoMaxKg: z.string(),
    activo: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const error = (path: string, message: string | null) => {
      if (message) ctx.addIssue({ code: 'custom', path: [path], message })
    }
    const precio = leerDecimal(v.precio)
    error('precio', errorMonto(precio, 'Ingresa el precio urbano'))
    const rural = leerDecimal(v.precioRural)
    if (rural !== undefined) error('precioRural', errorMonto(rural, ''))
    error('pesoMaxKg', errorMonto(leerDecimal(v.pesoMaxKg), 'Ingresa el peso máximo', 1000, ' kg'))
    if (!v.conMayoreo) return
    const minimo = leerDecimal(v.mayoreoMinimo)
    if (minimo === undefined || !Number.isInteger(minimo) || minimo < 1 || minimo > 9999) {
      error('mayoreoMinimo', 'Entero de 1 a 9999')
    }
    const pm = leerDecimal(v.mayoreoPrecio)
    const e = errorMonto(pm, 'Ingresa el precio por volumen')
    if (e) error('mayoreoPrecio', e)
    else if (precio !== undefined && !Number.isNaN(precio) && pm! >= precio) error('mayoreoPrecio', 'Debe ser menor que el precio urbano')
  })

export type TipoCargaForm = z.infer<typeof tipoCargaSchema>

export const TIPO_FORM_VACIO: TipoCargaForm = {
  nombre: '',
  codigo: '',
  precio: '',
  precioRural: '',
  conMayoreo: false,
  mayoreoMinimo: '',
  mayoreoPrecio: '',
  pesoMaxKg: '',
  activo: true,
}

export function formDesdeTipo(t: TipoCarga): TipoCargaForm {
  return {
    nombre: t.nombre,
    codigo: t.codigo,
    precio: aTexto(t.precio),
    precioRural: aTexto(t.precioRural),
    conMayoreo: t.mayoreo !== null,
    mayoreoMinimo: aTexto(t.mayoreo?.minimoExclusivo),
    mayoreoPrecio: aTexto(t.mayoreo?.precio),
    pesoMaxKg: aTexto(t.pesoMaxKg),
    activo: t.activo,
  }
}

/** Formulario ya validado → cuerpo del contrato (`precioRural` vacío = null; mayoreo solo si está marcado). */
export function datosDesdeForm(v: TipoCargaForm): DatosTipoCarga {
  const rural = leerDecimal(v.precioRural)
  return {
    nombre: v.nombre.trim(),
    precio: leerDecimal(v.precio)!,
    precioRural: rural ?? null,
    mayoreo: v.conMayoreo ? { minimoExclusivo: leerDecimal(v.mayoreoMinimo)!, precio: leerDecimal(v.mayoreoPrecio)! } : null,
    pesoMaxKg: leerDecimal(v.pesoMaxKg)!,
    activo: v.activo,
  }
}

const igualMayoreo = (a: Mayoreo | null, b: Mayoreo | null) =>
  a === b || (!!a && !!b && a.minimoExclusivo === b.minimoExclusivo && a.precio === b.precio)

/** Solo los campos que cambiaron (el PATCH exige al menos uno). */
export function cambiosTipo(original: TipoCarga, datos: DatosTipoCarga): Partial<DatosTipoCarga> {
  const c: Partial<DatosTipoCarga> = {}
  if (datos.nombre !== original.nombre) c.nombre = datos.nombre
  if (datos.precio !== original.precio) c.precio = datos.precio
  if (datos.precioRural !== original.precioRural) c.precioRural = datos.precioRural
  if (!igualMayoreo(datos.mayoreo, original.mayoreo)) c.mayoreo = datos.mayoreo
  if (datos.pesoMaxKg !== original.pesoMaxKg) c.pesoMaxKg = datos.pesoMaxKg
  if (datos.activo !== undefined && datos.activo !== original.activo) c.activo = datos.activo
  return c
}

/** «más de 50 → $1,00» o «—». */
export function mayoreoCorto(m: Mayoreo | null): string {
  return m ? `más de ${m.minimoExclusivo} → ${formatCurrency(m.precio)}` : '—'
}

/** Mueve el elemento `i` una posición (−1 sube, +1 baja). Devuelve la misma lista si no se puede. */
export function mover<T>(lista: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta
  if (i < 0 || i >= lista.length || j < 0 || j >= lista.length) return lista
  const copia = [...lista]
  ;[copia[i], copia[j]] = [copia[j]!, copia[i]!]
  return copia
}

// ---- Historial ----

export const ACCION_TIPO_LABEL: Record<AccionCambioTipoCarga, string> = {
  CREADO: 'Creado',
  MODIFICADO: 'Modificado',
  ACTIVADO: 'Activado',
  DESACTIVADO: 'Desactivado',
  ELIMINADO: 'Eliminado',
}

const CAMPO_LABEL: Record<string, string> = {
  codigo: 'Código',
  nombre: 'Nombre',
  precio: 'Precio urbano',
  precioRural: 'Precio rural',
  mayoreo: 'Mayoreo',
  'mayoreo.minimoExclusivo': 'Mayoreo (más de)',
  'mayoreo.precio': 'Precio por volumen',
  pesoMaxKg: 'Peso máximo',
  activo: 'Estado',
  orden: 'Orden',
}

export function etiquetaCampo(campo: string): string {
  return CAMPO_LABEL[campo] ?? campo
}

const esMayoreo = (v: unknown): v is Mayoreo =>
  typeof v === 'object' && v !== null && 'minimoExclusivo' in v && 'precio' in v

/** Valor de un cambio del historial, legible: USD, kg, mayoreo, estado… */
export function formatearValorCambio(campo: string, valor: unknown): string {
  if (campo === 'precioRural' && valor === null) return 'igual al urbano'
  if (campo === 'mayoreo' && valor === null) return 'sin mayoreo'
  if (valor === null || valor === undefined || valor === '') return '—'
  if (esMayoreo(valor)) return mayoreoCorto(valor)
  if (campo === 'activo' && typeof valor === 'boolean') return valor ? 'Activo' : 'Inactivo'
  if (typeof valor === 'number') {
    if (/peso/i.test(campo)) return formatPeso(valor)
    if (/precio/i.test(campo)) return formatCurrency(valor)
    return valor.toLocaleString('es-EC')
  }
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (typeof valor === 'string') return valor
  return JSON.stringify(valor)
}

/** «Precio urbano: $3,00 → $3,50». */
export function textoCambio(c: { campo: string; antes: unknown; despues: unknown }): string {
  return `${etiquetaCampo(c.campo)}: ${formatearValorCambio(c.campo, c.antes)} → ${formatearValorCambio(c.campo, c.despues)}`
}

// ---- Artículos restringidos ----

export const CATEGORIAS_ARTICULO: CategoriaArticulo[] = ['PROHIBIDO', 'CONDICIONADO', 'NOTA']

export const CATEGORIA_ARTICULO: Record<CategoriaArticulo, { titulo: string; singular: string; descripcion: string }> = {
  PROHIBIDO: { titulo: 'Prohibidos', singular: 'artículo prohibido', descripcion: 'No se transportan en ningún caso.' },
  CONDICIONADO: { titulo: 'Con condiciones', singular: 'artículo con condiciones', descripcion: 'Se aceptan si cumplen una condición.' },
  NOTA: { titulo: 'Notas', singular: 'nota', descripcion: 'Avisos generales que se muestran bajo la lista.' },
}

export const ICONO_POR_DEFECTO: Record<CategoriaArticulo, IconoArticulo | null> = {
  PROHIBIDO: 'prohibido',
  CONDICIONADO: 'alerta',
  NOTA: null,
}

export const MAX_DETALLE = 300

export const articuloSchema = z
  .object({
    categoria: z.enum(['PROHIBIDO', 'CONDICIONADO', 'NOTA']),
    titulo: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
    detalle: z.string().trim().max(MAX_DETALLE, `Máximo ${MAX_DETALLE} caracteres`),
    icono: z.string().nullable(),
    activo: z.boolean(),
  })
  .refine((v) => v.categoria === 'NOTA' || !!v.icono, { path: ['icono'], message: 'Elige un icono' })

export type ArticuloForm = z.infer<typeof articuloSchema>
