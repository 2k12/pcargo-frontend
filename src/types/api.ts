// Tipos espejo de docs/api-contract.md (v1)
export type Rol = 'ADMIN' | 'OPERADOR'
export type Estado = 'REGISTRADO' | 'EN_TRANSITO' | 'EN_REPARTO' | 'ENTREGADO' | 'CANCELADO'
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

export interface Envio {
  id: string
  codigo: string
  remitente: { nombre: string; telefono: string }
  destinatario: { nombre: string; telefono: string; direccion: string }
  ruta: { id: number; origen: string; destino: string }
  tipoCarga: TipoCargaCodigo
  pesoKg: number
  descripcion: string | null
  costo: number
  estado: Estado
  creadoEn: string
  actualizadoEn: string
  historial?: EventoHistorial[]
}

export interface NuevoEnvio {
  remitente: { nombre: string; telefono: string }
  destinatario: { nombre: string; telefono: string; direccion: string }
  rutaId: number
  tipoCarga: TipoCargaCodigo
  pesoKg: number
  descripcion?: string
}

export interface CotizacionRequest {
  rutaId: number
  tipoCarga: TipoCargaCodigo
  pesoKg: number
}

export interface Cotizacion {
  costo: number
  tarifaBase: number
  factor: number
  recargoPeso: number
}

export interface FiltrosEnvios {
  estado?: Estado
  rutaId?: number
  q?: string
}

export interface Seguimiento {
  codigo: string
  estado: Estado
  origen: string
  destino: string
  tipoCarga: TipoCargaCodigo
  creadoEn: string
  historial: EventoHistorial[]
}

export interface Resumen {
  totalEnvios: number
  ingresos: number
  porEstado: Record<Estado, number>
  porTipo: { tipoCarga: TipoCargaCodigo; total: number }[]
  porRuta: { ruta: string; total: number }[]
}
