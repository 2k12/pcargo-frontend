// Guía imprimible (contrato v9): datos ya formateados para dibujar la guía en PDF.
// Lógica pura, sin jsPDF ni DOM: se testea sola y el dibujo (`guiaPdf.ts`) solo coloca textos.
import { formatCurrency } from '@/lib/format'
import type { Envio, FormaPago, TipoCarga, TipoCargaCodigo } from '@/types/api'
import { nombreTipo } from './domain'

/** Datos fijos de la guía de imprenta que esta reemplaza. */
export const EMPRESA_GUIA = {
  servicio: 'SERVICIO A DOMICILIO DE ENCOMIENDAS',
  direccion: 'Dirección: Las Gardenias y El Rosal (La Florida)',
  telefonos: 'Telf.: 06 263 2669 / 099 801 4093',
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

/** Tipos con columna propia en la guía física; cualquier otro (incluidos los que cree el ADMIN) va en OTROS. */
const COLUMNAS_GUIA = ['SOBRE', 'VALIJA', 'PAQUETE', 'CARTON'] as const

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
  /** Ruta del envío para la banda superior: «IBARRA - QUITO» (urbano: solo la ciudad). */
  ruta: string
  nombreArchivo: string
  urlSeguimiento: string
  urlTerminos: string
  remitente: ParteGuia
  destinatario: ParteGuia
  /** Columnas de la fila de piezas; vacío si no hay unidades de ese tipo. */
  piezas: { total: string; sobres: string; valijas: string; paquetes: string; cartones: string; otros: string }
  peso: string
  descripcion: string
  /** Número de pedido de la empresa (envíos por API, contrato v10); vacío si no hay. */
  referenciaExterna: string
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

/** Cuenta las piezas por columna; OTROS lista «3 rollos de tela, 2 cajas grandes» en el orden del envío. */
export function contarPiezas(envio: Pick<Envio, 'items'>, tipos?: Pick<TipoCarga, 'codigo' | 'nombre'>[]) {
  const porTipo = new Map<TipoCargaCodigo, number>()
  for (const i of envio.items) porTipo.set(i.tipoCarga, (porTipo.get(i.tipoCarga) ?? 0) + i.cantidad)
  const total = [...porTipo.values()].reduce((s, n) => s + n, 0)
  const otros = [...porTipo]
    .filter(([t, n]) => n > 0 && !(COLUMNAS_GUIA as readonly string[]).includes(t))
    .map(([t, n]) => `${n} ${nombreTipo(t, n, tipos)}`)
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

/** «IBARRA - QUITO»; si es urbano (misma ciudad), solo «IBARRA». */
export function rutaGuia(ruta: Pick<Envio['ruta'], 'origen' | 'destino'>): string {
  const origen = ruta.origen.toLocaleUpperCase('es-EC')
  const destino = ruta.destino.toLocaleUpperCase('es-EC')
  return origen === destino ? origen : `${origen} - ${destino}`
}

const formatoPeso = (kg: number) => `${kg.toLocaleString('es-EC', { maximumFractionDigits: 2 })} kg`

/**
 * Arma todos los textos de la guía imprimible de un envío.
 * `origen` es el origen público del sitio (por defecto, el de la página) para el QR y los términos.
 */
export function datosGuia(
  envio: Envio,
  origen: string = window.location.origin,
  tipos?: Pick<TipoCarga, 'codigo' | 'nombre'>[],
): DatosGuia {
  const numero = numeroGuiaImpreso(envio.numeroGuia)
  const base = origen.replace(/\/+$/, '')
  const registro = fechaHoraEcuador(envio.registro.fecha)
  const entregado = envio.estado === 'ENTREGADO' && envio.entrega?.resultado === 'ENTREGADO'
  const entrega = entregado && envio.entrega ? fechaHoraEcuador(envio.entrega.fecha) : { fecha: '', hora: '' }

  return {
    numeroGuia: envio.numeroGuia,
    numero,
    ruta: rutaGuia(envio.ruta),
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
    piezas: contarPiezas(envio, tipos),
    peso: formatoPeso(envio.pesoTotalKg),
    descripcion: envio.descripcion?.trim() ?? '',
    referenciaExterna: envio.referenciaExterna?.trim() ?? '',
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
