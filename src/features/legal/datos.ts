import { MARCA } from '@/features/landing/marca'

/**
 * Datos del responsable que exigen la Ley Orgánica de Protección de Datos Personales (LOPDP) y la
 * Ley Orgánica de Defensa del Consumidor: quién presta el servicio y cómo contactarlo.
 *
 * `null` = dato aún no confirmado por PCargo. Las páginas legales lo muestran como «[pendiente: …]» bien visible,
 * para que nunca se publique un dato inventado. Completa estos campos antes de poner el sitio en producción.
 */
export const DATOS_LEGALES = {
  /** Razón social de la empresa o nombre completo de la persona natural titular del RUC. */
  razonSocial: null as string | null,
  /** RUC (13 dígitos). */
  ruc: null as string | null,
  /** Correo para solicitudes de datos personales y reclamos. */
  emailDatos: null as string | null,
  /** Título habilitante como operador postal, si aplica (Ley General de los Servicios Postales). */
  registroPostal: null as string | null,
  direccion: MARCA.oficina.direccion,
  /** Fecha desde la que rigen los textos legales (AAAA-MM-DD). Cámbiala cada vez que los modifiques. */
  vigenteDesde: '2026-10-08',
} as const

export type CampoLegal = 'razonSocial' | 'ruc' | 'emailDatos' | 'registroPostal'

const ETIQUETA: Record<CampoLegal, string> = {
  razonSocial: 'razón social',
  ruc: 'RUC',
  emailDatos: 'correo de contacto',
  registroPostal: 'registro de operador postal',
}

/** Valor del campo o el marcador visible de dato pendiente. */
export function datoLegal(campo: CampoLegal): string {
  return DATOS_LEGALES[campo] ?? `[pendiente: ${ETIQUETA[campo]}]`
}

/** Campos legales que aún faltan (sirve para avisar en el build y en los tests). */
export function datosLegalesPendientes(): CampoLegal[] {
  return (Object.keys(ETIQUETA) as CampoLegal[]).filter((c) => DATOS_LEGALES[c] === null)
}

/** Fecha de vigencia en formato largo de Ecuador: «8 de octubre de 2026». */
export function fechaVigencia(): string {
  const [a, m, d] = DATOS_LEGALES.vigenteDesde.split('-').map(Number)
  return new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(a!, m! - 1, d!)),
  )
}

/** Páginas legales públicas (rutas, pie de página, sitemap). */
export const PAGINAS_LEGALES = [
  { ruta: '/privacidad', titulo: 'Política de privacidad' },
  { ruta: '/terminos', titulo: 'Términos y condiciones' },
  { ruta: '/pago-al-cobro', titulo: 'Política de pago al cobro' },
  { ruta: '/cookies', titulo: 'Política de cookies' },
] as const
