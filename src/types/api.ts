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
  /** Una ciudad inactiva deja de ofrecerse: sus rutas no son operativas. */
  activa: boolean
}

export interface CambiosCiudad {
  nombre?: string
  activa?: boolean
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
  /** ruta.activa && origen.activa && destino.activa: solo así admite envíos nuevos. */
  operativa: boolean
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
  /** Cliente frecuente que envía; null si es ocasional. */
  clienteId: string | null
  /** Número de la guía física (contrato v4). */
  numeroGuia: number
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
  /** Guía física; vacío → el sistema asigna el consecutivo. */
  numeroGuia?: string
  /** Cliente frecuente elegido. */
  clienteId?: string
  /** Sin clienteId: guarda al remitente como cliente frecuente (o reutiliza el de su teléfono). */
  guardarCliente?: boolean
  /** Obligatorio (true) junto con guardarCliente: el remitente aceptó que guardemos sus datos. */
  consentimientoCliente?: boolean
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
  clienteId?: string
  q?: string
  /** Paginación en el servidor (contrato v5): página desde 1, 1–100 por página (20 por defecto). */
  pagina?: number
  porPagina?: number
}

/** Respuesta paginada (contrato v5). */
export interface Pagina<T> {
  datos: T[]
  pagina: number
  porPagina: number
  total: number
  totalPaginas: number
}

export interface Seguimiento {
  /** Número de la guía física (contrato v4). */
  numeroGuia: number
  estado: Estado
  origen: string
  destino: string
  items: { tipoCarga: TipoCargaCodigo; cantidad: number }[]
  totalPiezas: number
  creadoEn: string
  historial: EventoHistorial[]
}

export interface Cliente {
  id: string
  nombre: string
  telefono: string
  direccion: string | null
  notas: string | null
  creadoEn: string
  /** Cuándo aceptó que se guarden sus datos (LOPDP); null en clientes anteriores al contrato v7. */
  consentimientoEn: string | null
  /** Envíos a su nombre (incluye cancelados). */
  envios: number
  /** Suma de sus envíos no cancelados. */
  monto: number
  ultimoEnvio: string | null
}

export interface DatosCliente {
  nombre: string
  telefono: string
  direccion?: string | null
  notas?: string | null
}

/** Alta de cliente: exige el consentimiento del titular para guardar sus datos. */
export type NuevoCliente = DatosCliente & { consentimiento: true }

/** Edición; `consentimiento: true` registra el de un cliente antiguo. */
export type CambiosCliente = Partial<DatosCliente> & { consentimiento?: true }

export interface FiltroResumen {
  clienteId?: string
  /** Fecha local `YYYY-MM-DD`, inclusive. */
  desde?: string
  hasta?: string
}

export interface Resumen {
  totalEnvios: number
  totalPiezas: number
  pesoTotalKg: number
  ingresos: number
  /** AL_COBRO aún no entregados ni cancelados. */
  porCobrar: number
  porEstado: Record<Estado, number>
  porTipo: { tipoCarga: TipoCargaCodigo; piezas: number }[]
  porRuta: { rutaId: number; ruta: string; total: number; monto: number }[]
  porFormaPago: { formaPago: FormaPago; envios: number; monto: number }[]
  porDia: { fecha: string; envios: number; ingresos: number }[]
  /** `clienteId: null` agrupa los envíos sin cliente registrado. */
  porCliente: { clienteId: string | null; nombre: string; envios: number; monto: number }[]
}
