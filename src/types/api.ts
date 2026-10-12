// Tipos espejo de docs/api-contract.md (v10)
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
export type TipoCargaCodigo =
  | 'SOBRE'
  | 'PAQUETE'
  | 'CARTON'
  | 'VALIJA'
  | 'TELA'
  | 'PLUMON_PEQUENO'
  | 'PLUMON_GRANDE'
/** Zona de entrega (contrato v8): solo cambia el precio de los tipos con `precioRural`. */
export type Zona = 'URBANA' | 'RURAL'

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

/** Perfil propio (contrato v9): al menos un campo. Responde como el login (`{ token, usuario }`). */
export interface CambiosPerfil {
  nombre?: string
  email?: string
}

export interface CambioContrasena {
  actual: string
  nueva: string
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
  /** Precio por unidad en zona urbana (USD). */
  precio: number
  /** Precio por unidad en zona rural; null = mismo precio que en la urbana. */
  precioRural: number | null
  /** Más de `minimoExclusivo` unidades del tipo en el envío → todas a `precio`. */
  mayoreo: { minimoExclusivo: number; precio: number } | null
  pesoMaxKg: number
}

export interface Ruta {
  id: number
  origen: Ciudad
  destino: Ciudad
  tiempoEstimadoMin: number
  activa: boolean
  /** ruta.activa && origen.activa && destino.activa: solo así admite envíos nuevos. */
  operativa: boolean
}

export interface NuevaRuta {
  origenId: number
  destinoId: number
  tiempoEstimadoMin: number
}

export type CambiosRuta = Partial<Pick<Ruta, 'tiempoEstimadoMin' | 'activa'>>

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

/** Foto de la guía firmada + nombre de quien recibió (contrato v9). */
export interface EvidenciaEntrega {
  recibidoPor: string
  tipo: 'image/jpeg' | 'image/png' | 'image/webp'
  bytes: number
  /** ISO */
  subidaEn: string
  /** Operador que la subió. */
  subidaPor: string | null
}

export interface Envio {
  id: string
  /** Cliente frecuente que envía; null si es ocasional. */
  clienteId: string | null
  /** Número de la guía física (contrato v4). */
  numeroGuia: number
  remitente: { nombre: string; telefono: string; direccion: string | null }
  destinatario: { nombre: string; telefono: string; direccion: string }
  ruta: { id: number; origen: string; destino: string }
  items: ItemEnvio[]
  totalPiezas: number
  pesoTotalKg: number
  /** Zona de entrega; los envíos anteriores a v8 vienen como URBANA. */
  zona: Zona
  descripcion: string | null
  costo: number
  formaPago: FormaPago
  estado: Estado
  registro: Gestion
  entrega: GestionEntrega | null
  /** Foto de la guía firmada (solo en ENTREGADO); null si aún no se sube. */
  evidencia: EvidenciaEntrega | null
  /** Canal por el que ingresó (contrato v10): PANEL o API (+ integración). */
  origen: OrigenEnvio
  /** Número de pedido de la empresa (solo canal API). */
  referenciaExterna: string | null
  creadoEn: string
  actualizadoEn: string
  historial?: EventoHistorial[]
}

export interface NuevoEnvio {
  /** `direccion` opcional (0–200), se imprime en la guía. */
  remitente: { nombre: string; telefono: string; direccion?: string | null }
  destinatario: { nombre: string; telefono: string; direccion: string }
  rutaId: number
  items: ItemSolicitud[]
  formaPago: FormaPago
  /** Por defecto URBANA. */
  zona?: Zona
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
  /** Por defecto URBANA. */
  zona?: Zona
}

export interface CatalogoPublico {
  ciudades: Ciudad[]
  tiposCarga: TipoCarga[]
  rutas: Ruta[]
}

export interface ItemCotizado extends ItemSolicitud {
  costoUnitario: number
  subtotal: number
  /** Se aplicó el precio por volumen (mayoreo). */
  mayoreo: boolean
}

export interface Cotizacion {
  costo: number
  zona: Zona
  totalPiezas: number
  pesoTotalKg: number
  items: ItemCotizado[]
}

export interface FiltrosEnvios {
  estado?: Estado
  rutaId?: number
  formaPago?: FormaPago
  clienteId?: string
  /** Canal de ingreso (contrato v10). */
  canal?: Canal
  /** Solo envíos de esa integración. */
  integracionId?: string
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
  /** Canal de ingreso (contrato v10). */
  canal?: Canal
  integracionId?: string
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
  /** Envíos por canal (contrato v10): una fila para el panel y una por integración. */
  porCanal: { canal: Canal; integracionId: string | null; nombre: string; envios: number; monto: number }[]
}

// ---- Integraciones (contrato v10) ----
export type Canal = 'PANEL' | 'API'

export interface OrigenEnvio {
  canal: Canal
  integracionId: string | null
  /** Nombre de la integración (null en el panel). */
  integracion: string | null
}

export type Alcance = 'envios:crear' | 'envios:leer' | 'cotizar'
export type EventoWebhook = 'envio.creado' | 'envio.estado_actualizado' | 'envio.evidencia_registrada'
export type ModoApiKey = 'live' | 'test'

export interface RemitenteIntegracion {
  nombre: string
  telefono: string
  direccion: string
}

export interface DatosIntegracion {
  nombre: string
  activa?: boolean
  remitente: RemitenteIntegracion
  ciudadOrigenId: number
  /** Por defecto CONTRATO. */
  formaPagoPorDefecto?: FormaPago
  clienteId?: string | null
  /** IPv4/IPv6 o CIDR; vacía = cualquier IP. */
  ipsPermitidas?: string[]
}

export interface ApiKey {
  id: string
  nombre: string
  modo: ModoApiKey
  /** p. ej. "pc_live_Ab3dE6gH" */
  prefijo: string
  alcances: Alcance[]
  creadaEn: string
  ultimoUsoEn: string | null
  revocadaEn: string | null
}

export interface WebhookIntegracion {
  url: string
  eventos: EventoWebhook[]
  activo: boolean
  /** "whsec_ab12": solo para reconocerlo; el secreto completo se muestra una vez. */
  secretoPrefijo: string
}

export interface Integracion {
  id: string
  nombre: string
  activa: boolean
  remitente: RemitenteIntegracion
  ciudadOrigenId: number
  ciudadOrigen: string
  formaPagoPorDefecto: FormaPago
  clienteId: string | null
  ipsPermitidas: string[]
  /** Incluye las revocadas (revocadaEn != null). */
  keys: ApiKey[]
  webhook: WebhookIntegracion | null
  envios: number
  ultimoEnvio: string | null
  creadaEn: string
}

export interface NuevaApiKey {
  nombre: string
  modo: ModoApiKey
  alcances: Alcance[]
}

/** La key completa solo llega en esta respuesta. */
export interface ApiKeyCreada {
  key: string
  apiKey: ApiKey
}

export interface DatosWebhook {
  url: string
  eventos: EventoWebhook[]
  activo: boolean
}

export interface WebhookGuardado {
  /** Solo si se creó ahora (primera configuración); si no, null. */
  secreto: string | null
  integracion: Integracion
}

export type EstadoEntregaWebhook = 'PENDIENTE' | 'ENTREGADO' | 'FALLIDO'

export interface EntregaWebhook {
  id: string
  evento: EventoWebhook
  envioId: string | null
  numeroGuia: number | null
  estado: EstadoEntregaWebhook
  intentos: number
  ultimoStatus: number | null
  ultimoError: string | null
  proximoIntentoEn: string | null
  creadoEn: string
  entregadoEn: string | null
}

export interface SolicitudApi {
  id: string
  fecha: string
  metodo: string
  ruta: string
  status: number
  ip: string
  keyPrefijo: string | null
  idempotencyKey: string | null
  referenciaExterna: string | null
  duracionMs: number
  requestId: string
}
