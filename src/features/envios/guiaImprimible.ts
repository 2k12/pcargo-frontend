// Guía imprimible (contrato v9): datos ya formateados para dibujar la guía en PDF.
// Lógica pura, sin jsPDF ni DOM: se testea sola y el dibujo (`guiaPdf.ts`) solo coloca textos.
import { formatCurrency } from '@/lib/format'
import type { Envio, FormaPago, TipoCargaCodigo } from '@/types/api'

/** Datos fijos de la guía de imprenta que esta reemplaza. */
export const EMPRESA_GUIA = {
  banda: 'TRANSPORTE ENTRE - IBARRA - ATUNTAQUI - OTAVALO - QUITO',
  servicio: 'SERVICIO A DOMICILIO DE ENCOMIENDAS',
  direccion: 'Dirección: Las Gardenias y El Rosal (La Florida)',
  telefonos: 'Telf.: 06 263 2669 / 099 389 3803 / 099 801 4093',
  ciudad: 'Ibarra - Ecuador',
} as const

export const AVISOS_GUIA = [
  'NO TRANSPORTAMOS DINERO EN EFECTIVO · RECOMENDACIÓN: DECLARAR SUS ENVÍOS',
  'GUÍAS SIN DERECHO A CRÉDITO TRIBUTARIO - NO ENTREGAMOS EN APARTADOS POSTALES',
] as const

export const COPIAS_GUIA = [
  { titulo: 'COPIA PAQUETE', detalle: 'va pegada en la caja' },
  { titulo: 'COPIA ENTREGA', detalle: 'firma de quien recibe' },
] as const

export const DIGITOS_GUIA_IMPRESA = 7

/** Orden de las casillas de USO INTERNO, como en la guía física. */
export const CASILLAS_PAGO: { formaPago: FormaPago; etiqueta: string }[] = [
  { formaPago: 'PAGADO', etiqueta: 'PAGADO' },
  { formaPago: 'AL_COBRO', etiqueta: 'AL COBRO' },
  { formaPago: 'CONTRATO', etiqueta: 'CONTRATO' },
  { formaPago: 'SEGURO', etiqueta: 'SEGURO' },
]

/** Tipos que no tienen columna propia: van en OTROS con su nombre corto. */
const NOMBRE_CORTO_OTROS: Partial<Record<TipoCargaCodigo, string>> = {
  TELA: 'tela',
  PLUMON_PEQUENO: 'plumón peq.',
  PLUMON_GRANDE: 'plumón gde.',
}

export interface ParteGuia {
  nombre: string
  direccion: string
  ciudad: string
  telefono: string
}

export interface FechaHoraOperador {
  fecha: string
  hora: string
  operador: string
}

export interface DatosGuia {
  numeroGuia: number
  /** 7 dígitos con ceros a la izquierda (o más si el número es mayor). */
  numero: string
  nombreArchivo: string
  urlSeguimiento: string
  urlTerminos: string
  remitente: ParteGuia
  destinatario: ParteGuia
  /** Columnas de la fila de piezas; vacío si no hay unidades de ese tipo. */
  piezas: { total: string; sobres: string; valijas: string; paquetes: string; cartones: string; otros: string }
  peso: string
  descripcion: string
  pago: { etiqueta: string; marcada: boolean }[]
  valor: string
  /** «ZONA RURAL» o vacío. */
  zona: string
  aceptacion: string
  seguro: string
  registro: FechaHoraOperador
  /** Vacío (se llena a mano) salvo que el envío ya esté ENTREGADO. */
  entrega: FechaHoraOperador & { recibidoPor: string }
  pie: string
}

/** 40461 → «0040461». */
export function numeroGuiaImpreso(n: number): string {
  return String(n).padStart(DIGITOS_GUIA_IMPRESA, '0')
}

const ZONA_HORARIA = 'America/Guayaquil'
const fmtFecha = new Intl.DateTimeFormat('es-EC', {
  timeZone: ZONA_HORARIA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const fmtHora = new Intl.DateTimeFormat('es-EC', {
  timeZone: ZONA_HORARIA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Fecha y hora en hora de Ecuador: «08/10/2026», «22:24». */
export function fechaHoraEcuador(iso: string): { fecha: string; hora: string } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { fecha: '', hora: '' }
  return { fecha: fmtFecha.format(d), hora: fmtHora.format(d) }
}

const vacioSi0 = (n: number) => (n > 0 ? String(n) : '')

function contarPiezas(envio: Pick<Envio, 'items'>) {
  const porTipo = new Map<TipoCargaCodigo, number>()
  for (const i of envio.items) porTipo.set(i.tipoCarga, (porTipo.get(i.tipoCarga) ?? 0) + i.cantidad)
  const total = [...porTipo.values()].reduce((s, n) => s + n, 0)
  const otros = (Object.keys(NOMBRE_CORTO_OTROS) as TipoCargaCodigo[])
    .filter((t) => (porTipo.get(t) ?? 0) > 0)
    .map((t) => `${porTipo.get(t)} ${NOMBRE_CORTO_OTROS[t]}`)
    .join(', ')
  return {
    total: vacioSi0(total),
    sobres: vacioSi0(porTipo.get('SOBRE') ?? 0),
    valijas: vacioSi0(porTipo.get('VALIJA') ?? 0),
    paquetes: vacioSi0(porTipo.get('PAQUETE') ?? 0),
    cartones: vacioSi0(porTipo.get('CARTON') ?? 0),
    otros,
  }
}

const formatoPeso = (kg: number) => `${kg.toLocaleString('es-EC', { maximumFractionDigits: 2 })} kg`

/**
 * Arma todos los textos de la guía imprimible de un envío.
 * `origen` es el origen público del sitio (por defecto, el de la página) para el QR y los términos.
 */
export function datosGuia(envio: Envio, origen: string = window.location.origin): DatosGuia {
  const numero = numeroGuiaImpreso(envio.numeroGuia)
  const base = origen.replace(/\/+$/, '')
  const registro = fechaHoraEcuador(envio.registro.fecha)
  const entregado = envio.estado === 'ENTREGADO' && envio.entrega?.resultado === 'ENTREGADO'
  const entrega = entregado && envio.entrega ? fechaHoraEcuador(envio.entrega.fecha) : { fecha: '', hora: '' }

  return {
    numeroGuia: envio.numeroGuia,
    numero,
    nombreArchivo: `guia-${numero}.pdf`,
    urlSeguimiento: `${base}/seguimiento/${envio.numeroGuia}`,
    urlTerminos: `${base}/terminos`,
    remitente: {
      nombre: envio.remitente.nombre,
      direccion: envio.remitente.direccion?.trim() ?? '',
      ciudad: envio.ruta.origen,
      telefono: envio.remitente.telefono,
    },
    destinatario: {
      nombre: envio.destinatario.nombre,
      direccion: envio.destinatario.direccion,
      ciudad: envio.ruta.destino,
      telefono: envio.destinatario.telefono,
    },
    piezas: contarPiezas(envio),
    peso: formatoPeso(envio.pesoTotalKg),
    descripcion: envio.descripcion?.trim() ?? '',
    pago: CASILLAS_PAGO.map((c) => ({ etiqueta: c.etiqueta, marcada: c.formaPago === envio.formaPago })),
    valor: formatCurrency(envio.costo),
    zona: envio.zona === 'RURAL' ? 'ZONA RURAL' : '',
    aceptacion: `El remitente al firmar este documento acepta en todas sus partes las condiciones de transporte publicadas en ${base}/terminos`,
    seguro: 'Agradecemos tomar seguro por la mercadería arriba declarada.',
    registro: { ...registro, operador: envio.registro.operador ?? '' },
    entrega: {
      ...entrega,
      operador: entregado ? (envio.entrega?.operador ?? '') : '',
      recibidoPor: entregado ? (envio.evidencia?.recibidoPor ?? '') : '',
    },
    pie: 'Original: copia paquete · Copia: entrega',
  }
}
