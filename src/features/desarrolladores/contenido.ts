// Contenido de /desarrolladores (contrato v10, API para empresas). Lógica pura: ejemplos y tablas.
import { ejemploEventoWebhook } from '@/features/integraciones/domain'

export const SECCIONES = [
  { id: 'como-funciona', titulo: 'Cómo funciona' },
  { id: 'autenticacion', titulo: 'Autenticación' },
  { id: 'idempotencia', titulo: 'Idempotencia' },
  { id: 'endpoints', titulo: 'Endpoints' },
  { id: 'errores', titulo: 'Códigos de error' },
  { id: 'limites', titulo: 'Límites' },
  { id: 'pruebas', titulo: 'Keys de prueba' },
  { id: 'webhooks', titulo: 'Webhooks' },
  { id: 'openapi', titulo: 'Especificación OpenAPI' },
] as const

export const ENDPOINTS: { metodo: string; ruta: string; alcance: string; descripcion: string }[] = [
  { metodo: 'GET', ruta: '/cobertura', alcance: 'cualquiera', descripcion: 'Tu ciudad de origen y las ciudades a las que entregamos' },
  { metodo: 'POST', ruta: '/cotizar', alcance: 'cotizar', descripcion: 'Precio de un envío sin crearlo' },
  { metodo: 'POST', ruta: '/envios', alcance: 'envios:crear', descripcion: 'Crea un envío (201)' },
  { metodo: 'POST', ruta: '/envios/lote', alcance: 'envios:crear', descripcion: 'Crea de 1 a 100 envíos; cada uno con su resultado' },
  { metodo: 'GET', ruta: '/envios/:referenciaExterna', alcance: 'envios:leer', descripcion: 'Estado e historial de un envío tuyo' },
  { metodo: 'GET', ruta: '/openapi.json', alcance: 'pública', descripcion: 'Especificación OpenAPI 3.1' },
]

export const ERRORES: { status: number; code: string; cuando: string }[] = [
  { status: 400, code: 'VALIDACION', cuando: 'Body inválido, campos desconocidos o falta la cabecera Idempotency-Key' },
  { status: 401, code: 'API_KEY_INVALIDA', cuando: 'Sin key, con formato inválido, inexistente o revocada (mismo mensaje en todos los casos)' },
  { status: 403, code: 'ALCANCE_INSUFICIENTE', cuando: 'La key no tiene el alcance que pide el endpoint' },
  { status: 403, code: 'IP_NO_PERMITIDA', cuando: 'La solicitud sale de una IP que no está en la lista permitida' },
  { status: 403, code: 'INTEGRACION_INACTIVA', cuando: 'PCargo desactivó la integración de tu empresa' },
  { status: 404, code: '—', cuando: 'El envío no existe o es de otra empresa (y siempre con una key de prueba)' },
  { status: 409, code: 'CONFLICTO', cuando: 'La referenciaExterna ya se usó; error.envio trae { numeroGuia, referenciaExterna }' },
  { status: 409, code: 'IDEMPOTENCIA_EN_PROCESO', cuando: 'La primera solicitud con esa Idempotency-Key todavía se está procesando' },
  { status: 422, code: 'IDEMPOTENCIA_CONFLICTO', cuando: 'Repetiste una Idempotency-Key con un body distinto' },
  { status: 422, code: 'RUTA_NO_DISPONIBLE', cuando: 'No entregamos en esa ciudad desde tu origen (ciudad desconocida o ruta no operativa)' },
  { status: 429, code: 'DEMASIADAS_SOLICITUDES', cuando: 'Superaste el límite; espera los segundos de Retry-After' },
]

export const TIPOS_CARGA_API = ['SOBRE', 'PAQUETE', 'CARTON', 'VALIJA', 'TELA', 'PLUMON_PEQUENO', 'PLUMON_GRANDE'] as const

export const EVENTOS_DOC: { evento: string; cuando: string }[] = [
  { evento: 'envio.creado', cuando: 'Se registró un envío de tu empresa' },
  { evento: 'envio.estado_actualizado', cuando: 'Cambió el estado: en tránsito, en reparto, entregado, no entregado, novedad o cancelado' },
  { evento: 'envio.evidencia_registrada', cuando: 'Se subió la guía firmada por quien recibió (el evento no incluye la foto)' },
]

export const REINTENTOS = ['1 min', '5 min', '30 min', '2 h', '6 h', '12 h', '24 h']

export function ejemploCobertura(): string {
  return JSON.stringify(
    {
      origen: 'Ibarra',
      destinos: [
        { ciudad: 'Ibarra', tiempoEstimadoMin: 40 },
        { ciudad: 'Otavalo', tiempoEstimadoMin: 60 },
        { ciudad: 'Quito', tiempoEstimadoMin: 150 },
      ],
    },
    null,
    2,
  )
}

export function ejemploCotizarRequest(): string {
  return JSON.stringify(
    { destino: { ciudad: 'Quito' }, items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 1.5 }], zona: 'URBANA' },
    null,
    2,
  )
}

export function ejemploCotizacion(): string {
  return JSON.stringify(
    {
      costo: 6,
      zona: 'URBANA',
      totalPiezas: 2,
      pesoTotalKg: 3,
      items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 1.5, costoUnitario: 3, subtotal: 6, mayoreo: false }],
    },
    null,
    2,
  )
}

export function ejemploNuevoEnvio(): string {
  return JSON.stringify(
    {
      referenciaExterna: 'PED-1001',
      destinatario: { nombre: 'María Pérez', telefono: '0991234567', direccion: 'Av. Amazonas N24-03 y Colón', ciudad: 'Quito' },
      items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 1.5 }],
      zona: 'URBANA',
      formaPago: 'CONTRATO',
      descripcion: 'Ropa',
    },
    null,
    2,
  )
}

export function ejemploEnvioApi(origenPublico: string): string {
  return JSON.stringify(
    {
      id: '0b7c2f0e-5c1a-4d0e-9a51-6f1f3c7d2a10',
      numeroGuia: 40462,
      referenciaExterna: 'PED-1001',
      prueba: false,
      estado: 'REGISTRADO',
      origen: 'Ibarra',
      destino: 'Quito',
      destinatario: { nombre: 'María Pérez', telefono: '0991234567', direccion: 'Av. Amazonas N24-03 y Colón' },
      items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 1.5, costoUnitario: 3, subtotal: 6 }],
      totalPiezas: 2,
      pesoTotalKg: 3,
      zona: 'URBANA',
      costo: 6,
      formaPago: 'CONTRATO',
      descripcion: 'Ropa',
      seguimientoUrl: `${origenPublico.replace(/\/+$/, '')}/seguimiento/40462`,
      entrega: null,
      evidencia: null,
      creadoEn: '2026-10-11T15:00:00.000Z',
      actualizadoEn: '2026-10-11T15:00:00.000Z',
    },
    null,
    2,
  )
}

export function ejemploLote(): string {
  return JSON.stringify(
    {
      resultados: [
        { indice: 0, ok: true, envio: { numeroGuia: 40463, referenciaExterna: 'PED-1002', '…': '…' } },
        { indice: 1, ok: false, error: { code: 'RUTA_NO_DISPONIBLE', message: 'No hay ruta operativa hacia esa ciudad' } },
      ],
      creados: 1,
      fallidos: 1,
    },
    null,
    2,
  )
}

export function ejemploError(): string {
  return JSON.stringify({ error: { code: 'CONFLICTO', message: 'La referencia PED-1001 ya existe', envio: { numeroGuia: 40462, referenciaExterna: 'PED-1001' } } }, null, 2)
}

export const ejemploWebhook = ejemploEventoWebhook

export function ejemploCabecerasWebhook(): string {
  return [
    'POST /webhooks/pcargo HTTP/1.1',
    'Content-Type: application/json',
    'webhook-id: msg_2mX8Q5…',
    'webhook-timestamp: 1791817445',
    'webhook-signature: v1,K5oZfzN95Z9UVu1EsfQmfVNQhnkZ2pj9o9NDN/H/pI4=',
  ].join('\n')
}
