// Tipos espejo de docs/api-contract.md (v12)
/** v12: REPARTIDOR (app del repartidor) y CLIENTE (portal de clientes empresa). */
export type Rol = 'ADMIN' | 'OPERADOR' | 'REPARTIDOR' | 'CLIENTE'
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
/**
 * Código de un tipo de carga (contrato v11): configurable por el ADMIN, `^[A-Z][A-Z0-9_]{1,29}$`.
 * Semilla: SOBRE, PAQUETE, CARTON, VALIJA, TELA, PLUMON_PEQUENO, PLUMON_GRANDE. Nunca asumir una lista fija.
 */
export type TipoCargaCodigo = string
/** Zona de entrega (contrato v8): solo cambia el precio de los tipos con `precioRural`. */
export type Zona = 'URBANA' | 'RURAL'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  /** v12: solo CLIENTE (cliente frecuente vinculado); null en los demás roles. */
  clienteId: string | null
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

/** Estado del código único de acceso del usuario (contrato v17). */
export interface CodigoAcceso {
  activo: boolean
  /** ISO; null si no está activo. */
  actualizadoEn: string | null
}

/** PUT /auth/me/codigo (v17): `password` es la contraseña actual. */
export interface ActivarCodigoAcceso {
  password: string
  codigo: string
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
  mayoreo: Mayoreo | null
  pesoMaxKg: number
  /** Inactivo: no se ofrece ni se acepta en cotizaciones o envíos nuevos (contrato v11). */
  activo: boolean
  /** Orden de presentación. */
  orden: number
  actualizadoEn: string | null
  actualizadoPor: string | null
}

/** Precio por volumen: más de `minimoExclusivo` unidades del tipo en el envío → todas a `precio`. */
export interface Mayoreo {
  minimoExclusivo: number
  precio: number
}

/** Lo que ven las empresas en `GET /api/v1/integraciones/cobertura` (contrato v11). */
export type TipoCargaPublico = Pick<TipoCarga, 'codigo' | 'nombre' | 'precio' | 'precioRural' | 'mayoreo' | 'pesoMaxKg'>

/** Alta / edición de un tipo de carga (ADMIN). `codigo` solo al crear: es inmutable. */
export interface DatosTipoCarga {
  nombre: string
  precio: number
  /** null: mismo precio que en la zona urbana. */
  precioRural: number | null
  mayoreo: Mayoreo | null
  pesoMaxKg: number
  /** Por defecto true. */
  activo?: boolean
}

export type NuevoTipoCarga = DatosTipoCarga & { codigo: TipoCargaCodigo }

export type AccionCambioTipoCarga = 'CREADO' | 'MODIFICADO' | 'ACTIVADO' | 'DESACTIVADO' | 'ELIMINADO'

export interface CambioTipoCarga {
  id: string
  codigo: TipoCargaCodigo
  fecha: string
  usuario: string | null
  accion: AccionCambioTipoCarga
  cambios: { campo: string; antes: unknown; despues: unknown }[]
}

export interface FiltroHistorialTipos {
  codigo?: string
  pagina?: number
  porPagina?: number
}

// ---- Artículos restringidos («Qué no transportamos», contrato v11) ----
export type CategoriaArticulo = 'PROHIBIDO' | 'CONDICIONADO' | 'NOTA'
export type IconoArticulo =
  | 'dinero'
  | 'documento'
  | 'joya'
  | 'arma'
  | 'explosivo'
  | 'fuego'
  | 'quimico'
  | 'droga'
  | 'animal'
  | 'prohibido'
  | 'perecible'
  | 'liquido'
  | 'fragil'
  | 'bateria'
  | 'planta'
  | 'medicina'
  | 'electronico'
  | 'alerta'

export interface DatosArticulo {
  categoria: CategoriaArticulo
  /** 2–80 caracteres. */
  titulo: string
  /** 0–300 caracteres. */
  detalle?: string
  /** Para NOTA se ignora (se guarda null). */
  icono?: IconoArticulo | null
  activo?: boolean
}

export interface ArticuloRestringido {
  id: string
  categoria: CategoriaArticulo
  titulo: string
  detalle: string
  icono: IconoArticulo | null
  activo: boolean
  /** Orden dentro de su categoría. */
  orden: number
  actualizadoEn: string
  actualizadoPor: string | null
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
  /** Incluye `costoAdicional`. */
  costo: number
  /** v15: recargo acordado sumado al costo (0 si no hubo). */
  costoAdicional: number
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
  /** v12: repartidor asignado (null = sin asignar). */
  repartidor: RepartidorRef | null
  asignadoEn: string | null
  /** v12: datos personales eliminados por retención o por solicitud del titular. */
  anonimizadoEn: string | null
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
  /** v15: recargo en USD (≥ 0, hasta 2 decimales) que se suma al costo; por defecto 0. Solo panel. */
  costoAdicional?: number
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
  /** Solo activos y sin datos internos (contrato v11): codigo, nombre, precios, mayoreo y peso máximo. */
  tiposCarga: TipoCargaPublico[]
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
  /** v12: id de un repartidor o `ninguno` (sin asignar). */
  repartidorId?: string
  /** v16: fecha de registro `AAAA-MM-DD` (hora de Ecuador), ambas inclusive. */
  desde?: string
  hasta?: string
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
  /** v12: usuarios CLIENTE activos vinculados (accesos al portal). */
  accesosPortal: number
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

// ---- v12: usuarios, reparto, caja, datos personales, portal ----

export interface RepartidorRef {
  id: string
  nombre: string
}

export interface UsuarioAdmin extends Usuario {
  activo: boolean
  /** Nombre del cliente vinculado (solo CLIENTE). */
  cliente: string | null
  creadoEn: string
}

export interface NuevoUsuario {
  nombre: string
  email: string
  password: string
  rol: Rol
  /** Obligatorio con rol CLIENTE; omitido o null en los demás. */
  clienteId?: string | null
}

/** Al menos un campo. `password` restablece la contraseña. */
export interface CambiosUsuario {
  nombre?: string
  email?: string
  password?: string
  rol?: Rol
  activo?: boolean
}

export interface FiltroUsuarios {
  rol?: Rol
  activo?: boolean
}

/** La contraseña temporal solo viaja en esta respuesta (`no-store`). */
export interface AccesoPortalCreado {
  usuario: UsuarioAdmin
  passwordTemporal: string
}

export interface AsignacionRepartidor {
  /** 1–100, sin repetir. */
  envioIds: string[]
  /** null quita la asignación. */
  repartidorId: string | null
}

export type EstadoReparto = 'EN_REPARTO' | 'ENTREGADO' | 'NO_ENTREGADO' | 'NOVEDAD'
export type VistaReparto = 'pendientes' | 'hoy'

export interface EnvioReparto {
  id: string
  numeroGuia: number
  estado: Estado
  remitente: { nombre: string; telefono: string; direccion: string | null }
  destinatario: { nombre: string; telefono: string; direccion: string }
  ruta: { id: number; origen: string; destino: string }
  zona: Zona
  items: ItemSolicitud[]
  totalPiezas: number
  pesoTotalKg: number
  descripcion: string | null
  formaPago: FormaPago
  costo: number
  /** Monto a cobrar al entregar (AL_COBRO aún no entregado); si no, 0. */
  porCobrar: number
  entrega: GestionEntrega | null
  evidencia: { recibidoPor: string; subidaEn: string } | null
  asignadoEn: string | null
  actualizadoEn: string
}

export type TipoCobro = 'ORIGEN' | 'CONTRA_ENTREGA' | 'DEVOLUCION'

export interface Cobro {
  id: string
  tipo: TipoCobro
  /** Negativo en DEVOLUCION. */
  monto: number
  envioId: string
  numeroGuia: number
  formaPago: FormaPago
  usuario: RepartidorRef
  fecha: string
  cierreId: string | null
}

export interface PersonaCaja {
  id: string
  nombre: string
  rol: Rol
}

export interface DesgloseCobro {
  tipo: TipoCobro
  cantidad: number
  monto: number
}

export interface CajaPendiente {
  usuario: PersonaCaja
  total: number
  cantidad: number
  porTipo: DesgloseCobro[]
  /** Fecha del cobro pendiente más antiguo. */
  desde: string | null
  /** Solo en GET /caja/pendientes/:usuarioId y /repartidor/caja. */
  cobros?: Cobro[]
}

export interface NuevoCierreCaja {
  usuarioId: string
  montoEntregado: number
  /** 0–300; obligatoria si hay diferencia. */
  nota?: string
}

export interface CierreCaja {
  id: string
  usuario: PersonaCaja
  recibidoPor: RepartidorRef
  fecha: string
  esperado: number
  entregado: number
  /** Negativa = faltante; positiva = sobrante. */
  diferencia: number
  cantidad: number
  nota: string | null
  porTipo: DesgloseCobro[]
  /** Solo en GET /caja/cierres/:id. */
  cobros?: Cobro[]
}

export interface FiltroCierres {
  usuarioId?: string
  /** `AAAA-MM-DD` de Ecuador, inclusive. */
  desde?: string
  hasta?: string
  pagina?: number
  porPagina?: number
}

export interface DatosTitular {
  /** Tal como se consultó. */
  telefono: string
  cliente: { id: string; nombre: string; accesosPortal: number } | null
  envios: { total: number; terminados: number; enCurso: number; anonimizados: number }
}

export type CanalSolicitud = 'PRESENCIAL' | 'CORREO' | 'TELEFONO' | 'WHATSAPP'

export interface NuevaSolicitudDatos {
  telefono: string
  nombreTitular: string
  canal: CanalSolicitud
  nota?: string
}

export interface SolicitudDatos {
  id: string
  tipo: 'ELIMINACION'
  nombreTitular: string
  /** "…4567": solo los 4 últimos dígitos. */
  telefonoFinal: string
  canal: CanalSolicitud
  nota: string | null
  fecha: string
  atendidaPor: string
  resultado: { envios: number; clientes: number; evidencias: number; usuariosDesactivados: number; enCurso: number }
}

export interface EnvioPortal {
  id: string
  numeroGuia: number
  estado: Estado
  destinatario: { nombre: string; telefono: string; direccion: string }
  ruta: { id: number; origen: string; destino: string }
  zona: Zona
  items: ItemEnvio[]
  totalPiezas: number
  pesoTotalKg: number
  descripcion: string | null
  costo: number
  formaPago: FormaPago
  referenciaExterna: string | null
  creadoEn: string
  actualizadoEn: string
  entrega: { resultado: ResultadoEntrega; fecha: string; nota: string | null } | null
  evidencia: { recibidoPor: string; subidaEn: string } | null
  historial?: { estado: Estado; nota: string | null; fecha: string }[]
}

export type FormaPagoPortal = 'CONTRATO' | 'AL_COBRO'

export interface NuevoEnvioPortal {
  destinatario: { nombre: string; telefono: string; direccion: string }
  rutaId: number
  items: ItemSolicitud[]
  zona?: Zona
  /** Por defecto CONTRATO. */
  formaPago?: FormaPagoPortal
  descripcion?: string | null
}

export interface FiltrosEnviosPortal {
  estado?: Estado
  q?: string
  pagina?: number
  porPagina?: number
}

export interface ClientePortal {
  id: string
  nombre: string
  telefono: string
  direccion: string | null
}

export interface ResumenPortal {
  cliente: ClientePortal
  /** AAAA-MM-DD */
  desde: string
  hasta: string
  envios: number
  /** Excluye CANCELADO. */
  monto: number
  enCurso: number
  entregados: number
  porCobrar: number
  porEstado: Record<Estado, number>
  porFormaPago: { formaPago: FormaPago; envios: number; monto: number }[]
  porDia: { fecha: string; envios: number; monto: number }[]
}
