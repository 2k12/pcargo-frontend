// Integraciones (contrato v10): lógica pura — etiquetas, validación de IPs y ejemplos de código.
import type { Alcance, EstadoEntregaWebhook, EventoWebhook, ModoApiKey } from '@/types/api'

export const ALCANCES: { value: Alcance; label: string; descripcion: string }[] = [
  { value: 'envios:crear', label: 'Crear envíos', descripcion: 'POST /envios y /envios/lote' },
  { value: 'envios:leer', label: 'Consultar envíos', descripcion: 'GET /envios/:referenciaExterna' },
  { value: 'cotizar', label: 'Cotizar', descripcion: 'POST /cotizar' },
]

export const ALCANCE_LABEL: Record<Alcance, string> = Object.fromEntries(ALCANCES.map((a) => [a.value, a.label])) as Record<
  Alcance,
  string
>

export const EVENTOS_WEBHOOK: { value: EventoWebhook; label: string; descripcion: string }[] = [
  { value: 'envio.creado', label: 'Envío creado', descripcion: 'Cuando PCargo registra un envío de la empresa' },
  { value: 'envio.estado_actualizado', label: 'Cambio de estado', descripcion: 'En tránsito, en reparto, entregado, novedad…' },
  { value: 'envio.evidencia_registrada', label: 'Evidencia de entrega', descripcion: 'Se subió la guía firmada (sin la foto)' },
]

export const MODO_LABEL: Record<ModoApiKey, string> = { live: 'En vivo', test: 'Prueba' }

export const ESTADO_ENTREGA_LABEL: Record<EstadoEntregaWebhook, string> = {
  PENDIENTE: 'Pendiente',
  ENTREGADO: 'Entregado',
  FALLIDO: 'Fallido',
}

export const ESTADOS_ENTREGA: EstadoEntregaWebhook[] = ['PENDIENTE', 'ENTREGADO', 'FALLIDO']

// ---- IPs permitidas: validación básica (el servidor valida de nuevo) ----

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

function esIpv6(texto: string): boolean {
  if (!/^[0-9a-fA-F:.]+$/.test(texto) || !texto.includes(':') || texto.includes(':::')) return false
  // Un ":" suelto al inicio o al final no es válido (solo "::").
  if ((texto.startsWith(':') && !texto.startsWith('::')) || (texto.endsWith(':') && !texto.endsWith('::'))) return false
  const dobles = texto.split('::').length - 1
  if (dobles > 1) return false
  // Un IPv4 al final (::ffff:192.0.2.1) cuenta como dos grupos.
  let grupos = texto.split(':')
  let extra = 0
  const ultimo = grupos[grupos.length - 1]!
  if (ultimo.includes('.')) {
    if (!IPV4.test(ultimo)) return false
    grupos = grupos.slice(0, -1)
    extra = 2
  }
  const llenos = grupos.filter((g) => g !== '')
  if (llenos.some((g) => !/^[0-9a-fA-F]{1,4}$/.test(g))) return false
  const total = llenos.length + extra
  return dobles === 1 ? total < 8 : total === 8 && grupos.every((g) => g !== '')
}

/** IPv4, IPv6 o rango CIDR (`203.0.113.0/24`, `2001:db8::/32`). */
export function esIpOCidr(valor: string): boolean {
  const texto = valor.trim()
  if (!texto) return false
  const [ip, prefijo, sobra] = texto.split('/')
  if (sobra !== undefined || !ip) return false
  const v4 = IPV4.test(ip)
  const v6 = !v4 && esIpv6(ip)
  if (!v4 && !v6) return false
  if (prefijo === undefined) return true
  if (!/^\d{1,3}$/.test(prefijo)) return false
  return Number(prefijo) <= (v4 ? 32 : 128)
}

// ---- Ejemplos de código ("Cómo integrarse" y /desarrolladores) ----

/** URL base de la API para empresas a partir del origen público del sitio. */
export function urlBaseIntegraciones(origen: string = window.location.origin): string {
  return `${origen.replace(/\/+$/, '')}/api/v1/integraciones`
}

/** Destino de ejemplo: otra ciudad distinta del origen (o la misma si no hay otra: envío urbano). */
export function destinoEjemplo(ciudadOrigen: string, ciudades: string[] = []): string {
  const otra = ciudades.find((c) => c.localeCompare(ciudadOrigen, 'es', { sensitivity: 'base' }) !== 0)
  if (otra) return otra
  return ciudadOrigen.toLowerCase() === 'quito' ? 'Ibarra' : 'Quito'
}

export interface OpcionesEjemplo {
  base: string
  ciudadOrigen: string
  destino: string
}

const cuerpoEjemplo = (destino: string) => ({
  referenciaExterna: 'PED-1001',
  destinatario: {
    nombre: 'María Pérez',
    telefono: '0991234567',
    direccion: 'Av. Amazonas N24-03 y Colón',
    ciudad: destino,
  },
  items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 1.5 }],
  zona: 'URBANA',
  descripcion: 'Ropa',
})

export function ejemploCurl({ base, ciudadOrigen, destino }: OpcionesEjemplo): string {
  const json = JSON.stringify(cuerpoEjemplo(destino), null, 2)
    .split('\n')
    .map((l, i) => (i === 0 ? l : `  ${l}`))
    .join('\n')
  return [
    `# Crea un envío que PCargo recoge en ${ciudadOrigen} y entrega en ${destino}.`,
    `# Usa la key completa (pc_live_… o pc_test_… para pruebas).`,
    `curl -X POST ${base}/envios \\`,
    `  -H "Authorization: Bearer pc_live_..." \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "Idempotency-Key: PED-1001" \\`,
    `  -d '${json}'`,
  ].join('\n')
}

export function ejemploFetch({ base, ciudadOrigen, destino }: OpcionesEjemplo): string {
  const json = JSON.stringify(cuerpoEjemplo(destino), null, 2)
    .split('\n')
    .map((l, i) => (i === 0 ? l : `  ${l}`))
    .join('\n')
  return [
    `// Origen: ${ciudadOrigen} (lo fija la API key; no se envía en el body).`,
    `const respuesta = await fetch('${base}/envios', {`,
    `  method: 'POST',`,
    `  headers: {`,
    `    Authorization: \`Bearer \${process.env.PCARGO_API_KEY}\`,`,
    `    'Content-Type': 'application/json',`,
    `    // Reintentar con la misma clave nunca duplica el envío.`,
    `    'Idempotency-Key': 'PED-1001',`,
    `  },`,
    `  body: JSON.stringify(${json}),`,
    `})`,
    ``,
    `if (!respuesta.ok) {`,
    `  const { error } = await respuesta.json()`,
    `  throw new Error(\`\${error.code}: \${error.message}\`)`,
    `}`,
    `const envio = await respuesta.json()`,
    `console.log(envio.numeroGuia, envio.seguimientoUrl)`,
  ].join('\n')
}

/** Verificación de la firma de un webhook en Node (Standard Webhooks). */
export function ejemploVerificacionNode(): string {
  return [
    `import crypto from 'node:crypto'`,
    ``,
    `const SECRETO = process.env.PCARGO_WEBHOOK_SECRET // whsec_...`,
    `const TOLERANCIA_SEG = 5 * 60`,
    ``,
    `/**`,
    ` * cuerpo: el body CRUDO (string), tal como llegó; no lo vuelvas a serializar.`,
    ` * cabeceras: webhook-id, webhook-timestamp y webhook-signature.`,
    ` */`,
    `export function verificarWebhook(cuerpo, cabeceras) {`,
    `  const id = cabeceras['webhook-id']`,
    `  const timestamp = cabeceras['webhook-timestamp']`,
    `  const firmas = cabeceras['webhook-signature'] ?? ''`,
    `  if (!id || !timestamp) return false`,
    `  // Rechaza mensajes viejos (evita que reenvíen uno capturado).`,
    `  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > TOLERANCIA_SEG) return false`,
    ``,
    `  const clave = Buffer.from(SECRETO.replace(/^whsec_/, ''), 'base64')`,
    `  const esperada = crypto`,
    `    .createHmac('sha256', clave)`,
    `    .update(\`\${id}.\${timestamp}.\${cuerpo}\`)`,
    `    .digest('base64')`,
    ``,
    `  // Puede venir más de una firma separada por espacios: "v1,<firma> v1,<firma>".`,
    `  return firmas.split(' ').some((parte) => {`,
    `    const [version, firma] = parte.split(',')`,
    `    if (version !== 'v1' || !firma) return false`,
    `    const a = Buffer.from(firma)`,
    `    const b = Buffer.from(esperada)`,
    `    return a.length === b.length && crypto.timingSafeEqual(a, b)`,
    `  })`,
    `}`,
    ``,
    `// Express: usa el body crudo para verificar y responde 2xx en menos de 10 s.`,
    `// app.post('/webhooks/pcargo', express.text({ type: 'application/json' }), (req, res) => {`,
    `//   if (!verificarWebhook(req.body, req.headers)) return res.status(401).end()`,
    `//   const evento = JSON.parse(req.body) // { type, timestamp, data }`,
    `//   // Guarda evento.data.numeroGuia / evento.data.estado y procesa en segundo plano.`,
    `//   res.status(204).end()`,
    `// })`,
  ].join('\n')
}

/** Ejemplo de body que recibe el webhook. */
export function ejemploEventoWebhook(destino = 'Quito', origen = 'Ibarra'): string {
  return JSON.stringify(
    {
      type: 'envio.estado_actualizado',
      timestamp: '2026-10-11T15:04:05.000Z',
      data: {
        id: '7b1f…',
        numeroGuia: 40462,
        referenciaExterna: 'PED-1001',
        prueba: false,
        estado: 'EN_TRANSITO',
        origen,
        destino,
        seguimientoUrl: 'https://…/seguimiento/40462',
        '…': '…',
      },
    },
    null,
    2,
  )
}
