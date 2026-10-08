// Tipos espejo de docs/api-contract.md (v2)
export type Rol = 'ADMIN' | 'OPERADOR'
export type Estado =
  | 'REGISTRADO'
  | 'EN_TRANSITO'
  | 'EN_REPARTO'
  | 'ENTREGADO'
  | 'NO_ENTREGADO'
  | 'NOVEDAD'
  | 'CANCELADO'
export type ResultadoEntrega = 'ENTREGADO' | 'NO_ENTREGADO' | 'NOVEDAD'
export type FormaPago = 'PAGADO' | 'AL_COBRO' | 'CONTRATO' | 'SEGURO'
export type TipoCargaCodigo = 'SOBRE' | 'PAQUETE' | 'CARTON' | 'VALIJA'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
}

export interface LoginResponse {
  token: string
  usuario: Usuario
}

export interface Ciudad {
  id: number
  nombre: string
}

export interface TipoCarga {
  codigo: TipoCargaCodigo
  nombre: string
  factor: number
  pesoIncluidoKg: number
  pesoMaxKg: number
}

export interface Ruta {
  id: number
  origen: Ciudad
  destino: Ciudad
  tarifaBase: number
  tiempoEstimadoMin: number
  activa: boolean
}

export interface NuevaRuta {
  origenId: number
  destinoId: number
  tarifaBase: number
  tiempoEstimadoMin: number
}

export type CambiosRuta = Partial<Pick<Ruta, 'tarifaBase' | 'tiempoEstimadoMin' | 'activa'>>

export interface EventoHistorial {
  estado: Estado
  nota: string | null
  fecha: string
  usuario: string | null
}

/** Línea de un envío: `pesoKg` es el peso POR UNIDAD. */
export interface ItemSolicitud {
  tipoCarga: TipoCargaCodigo
  cantidad: number
  pesoKg: number
}

export interface ItemEnvio extends ItemSolicitud {
  costoUnitario: number
  subtotal: number
}

export interface Gestion {
  fecha: string
  operador: string | null
}

export interface GestionEntrega extends Gestion {
  resultado: ResultadoEntrega
  nota: string | null
}

export interface Envio {
  id: string
  codigo: string
  remitente: { nombre: string; telefono: string }
  destinatario: { nombre: string; telefono: string; direccion: string }
  ruta: { id: number; origen: string; destino: string }
  items: ItemEnvio[]
  totalPiezas: number
  pesoTotalKg: number
  descripcion: string | null
  costo: number
  formaPago: FormaPago
  estado: Estado
  registro: Gestion
  entrega: GestionEntrega | null
  creadoEn: string
  actualizadoEn: string
  historial?: EventoHistorial[]
}

export interface NuevoEnvio {
  remitente: { nombre: string; telefono: string }
  destinatario: { nombre: string; telefono: string; direccion: string }
  rutaId: number
  items: ItemSolicitud[]
  formaPago: FormaPago
  descripcion?: string
}

export interface CotizacionRequest {
  rutaId: number
  items: ItemSolicitud[]
}

export interface CatalogoPublico {
  ciudades: Ciudad[]
  tiposCarga: TipoCarga[]
  rutas: Ruta[]
}

export interface ItemCotizado extends ItemSolicitud {
  factor: number
  recargoPeso: number
  costoUnitario: number
  subtotal: number
}

export interface Cotizacion {
  costo: number
  tarifaBase: number
  totalPiezas: number
  pesoTotalKg: number
  items: ItemCotizado[]
}

export interface FiltrosEnvios {
  estado?: Estado
  rutaId?: number
  formaPago?: FormaPago
  q?: string
}

export interface Seguimiento {
  codigo: string
  estado: Estado
  origen: string
  destino: string
  items: { tipoCarga: TipoCargaCodigo; cantidad: number }[]
  totalPiezas: number
  creadoEn: string
  historial: EventoHistorial[]
}

export interface Resumen {
  totalEnvios: number
  totalPiezas: number
  ingresos: number
  porEstado: Record<Estado, number>
  porTipo: { tipoCarga: TipoCargaCodigo; piezas: number }[]
  porRuta: { ruta: string; total: number }[]
  porFormaPago: { formaPago: FormaPago; envios: number; monto: number }[]
}
