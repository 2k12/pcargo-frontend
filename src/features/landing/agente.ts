import { ESTADO_LABEL, mayoreoTexto, notasMayoreo, TIPO_CARGA_LABEL, ZONA_LABEL, ZONAS } from '@/features/envios/domain'
import { normalizarGuia } from '@/features/envios/guia'
import { publicoApi } from '@/features/landing/api'
import { seguimientoApi } from '@/features/seguimiento/api'
import { ApiError, errorMessage } from '@/lib/api'
import { formatCurrency, formatDuracion } from '@/lib/format'
import { respuesta, type HerramientaAgente } from '@/lib/webmcp'
import type { CatalogoPublico, TipoCargaCodigo, Zona } from '@/types/api'

/** Compara nombres de ciudad sin tildes ni mayúsculas ("quito" = "Quito", "Atuntaquí" = "Atuntaqui"). */
const clave = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()

/** Ruta operativa entre dos ciudades por nombre (mismo nombre = ruta urbana). */
export function buscarRuta(catalogo: CatalogoPublico, origen: string, destino: string) {
  return catalogo.rutas.find((r) => clave(r.origen.nombre) === clave(origen) && clave(r.destino.nombre) === clave(destino))
}

const TIPOS: TipoCargaCodigo[] = ['SOBRE', 'PAQUETE', 'CARTON', 'VALIJA', 'TELA', 'PLUMON_PEQUENO', 'PLUMON_GRANDE']

const rastrear: HerramientaAgente = {
  name: 'rastrear_envio',
  description:
    'Consulta el estado actual, la ruta y el historial de una encomienda de PCargo por su número de guía ' +
    '(solo dígitos; los ceros a la izquierda no cuentan).',
  inputSchema: {
    type: 'object',
    properties: { numeroGuia: { type: 'string', description: 'Número de la guía, p. ej. "40425" o "0040425".' } },
    required: ['numeroGuia'],
  },
  annotations: { readOnlyHint: true },
  async execute({ numeroGuia }) {
    const guia = normalizarGuia(String(numeroGuia ?? ''))
    if (!guia) return 'El número de guía debe contener solo dígitos (hasta 12).'
    try {
      const s = await seguimientoApi.consultar(guia)
      return respuesta({
        numeroGuia: s.numeroGuia,
        estado: ESTADO_LABEL[s.estado],
        ruta: `${s.origen} → ${s.destino}`,
        piezas: s.totalPiezas,
        registrado: s.creadoEn,
        historial: s.historial.map((h) => ({ estado: ESTADO_LABEL[h.estado], fecha: h.fecha, nota: h.nota })),
        enlace: `${location.origin}/seguimiento/${s.numeroGuia}`,
      })
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return `No existe un envío con la guía ${guia}.`
      return `No se pudo consultar la guía: ${errorMessage(e)}`
    }
  },
}

const cobertura: HerramientaAgente = {
  name: 'consultar_cobertura',
  description:
    'Lista las ciudades donde PCargo entrega, las rutas con su tiempo estimado y los tipos de carga con su ' +
    'precio por unidad (USD; urbano, rural y por volumen) y peso máximo. La ruta no influye en el precio.',
  inputSchema: { type: 'object', properties: {} },
  annotations: { readOnlyHint: true },
  async execute() {
    const c = await publicoApi.catalogo()
    return respuesta({
      ciudades: c.ciudades.map((x) => x.nombre),
      rutas: c.rutas.map((r) => ({
        origen: r.origen.nombre,
        destino: r.destino.nombre,
        tiempoEstimado: formatDuracion(r.tiempoEstimadoMin),
      })),
      tiposCarga: c.tiposCarga.map((t) => ({
        codigo: t.codigo,
        nombre: t.nombre,
        precioUrbano: formatCurrency(t.precio),
        precioRural: formatCurrency(t.precioRural ?? t.precio),
        ...(t.mayoreo ? { mayoreo: mayoreoTexto(t) } : {}),
        pesoMaxKg: t.pesoMaxKg,
      })),
      regla:
        'Precio por unidad según el tipo de carga, igual en todas las rutas y sin recargo por peso. ' +
        'La zona rural solo cambia el precio de los tipos con precio rural distinto (la tela).',
    })
  },
}

const cotizar: HerramientaAgente = {
  name: 'cotizar_envio',
  description:
    'Calcula el precio en USD de enviar encomiendas con PCargo entre dos ciudades de cobertura ' +
    '(Ibarra, Atuntaqui, Otavalo, Quito). Para entregas dentro de la misma ciudad usa el mismo origen y destino. ' +
    'El precio es por unidad según el tipo; la zona de entrega (URBANA por defecto, o RURAL) solo cambia el de la tela.',
  inputSchema: {
    type: 'object',
    properties: {
      origen: { type: 'string', description: 'Ciudad de origen, p. ej. "Ibarra".' },
      destino: { type: 'string', description: 'Ciudad de destino, p. ej. "Quito".' },
      tipoCarga: { type: 'string', enum: TIPOS, description: 'Tipo de encomienda.' },
      cantidad: { type: 'integer', minimum: 1, maximum: 999, description: 'Número de piezas iguales.' },
      pesoKg: { type: 'number', exclusiveMinimum: 0, description: 'Peso de cada pieza en kg.' },
      zona: { type: 'string', enum: ZONAS, description: 'Zona de entrega (opcional, URBANA por defecto).' },
    },
    required: ['origen', 'destino', 'tipoCarga', 'cantidad', 'pesoKg'],
  },
  annotations: { readOnlyHint: true },
  async execute({ origen, destino, tipoCarga, cantidad, pesoKg, zona: zonaTxt }) {
    const tipo = String(tipoCarga ?? '').toUpperCase() as TipoCargaCodigo
    if (!TIPOS.includes(tipo)) return `tipoCarga debe ser uno de: ${TIPOS.join(', ')}.`
    const zona = (zonaTxt === undefined || zonaTxt === null || zonaTxt === '' ? 'URBANA' : String(zonaTxt).toUpperCase()) as Zona
    if (!ZONAS.includes(zona)) return `zona debe ser una de: ${ZONAS.join(', ')}.`
    const catalogo = await publicoApi.catalogo()
    const ruta = buscarRuta(catalogo, String(origen ?? ''), String(destino ?? ''))
    if (!ruta) {
      return `No operamos la ruta ${origen} → ${destino}. Ciudades disponibles: ${catalogo.ciudades.map((c) => c.nombre).join(', ')}.`
    }
    try {
      const c = await publicoApi.cotizar({
        rutaId: ruta.id,
        zona,
        items: [{ tipoCarga: tipo, cantidad: Number(cantidad), pesoKg: Number(pesoKg) }],
      })
      return respuesta({
        ruta: `${ruta.origen.nombre} → ${ruta.destino.nombre}`,
        tipoCarga: TIPO_CARGA_LABEL[tipo],
        zona: ZONA_LABEL[c.zona ?? zona],
        piezas: c.totalPiezas,
        pesoTotalKg: c.pesoTotalKg,
        costoUnitario: formatCurrency(c.items[0]?.costoUnitario ?? c.costo),
        costoTotal: formatCurrency(c.costo),
        ...(c.items.some((i) => i.mayoreo) ? { precioPorVolumen: notasMayoreo(c, catalogo.tiposCarga).join(' · ') } : {}),
        tiempoEstimado: formatDuracion(ruta.tiempoEstimadoMin),
        nota: 'Valor referencial; el definitivo es el de la guía, con las piezas y la zona verificadas. El tiempo es estimado.',
      })
    } catch (e) {
      return `No se pudo cotizar: ${errorMessage(e)}`
    }
  },
}

/** Estado de una guía en el formato de la herramienta (también lo usan los formularios de rastreo). */
export const consultarGuiaParaAgente = (numeroGuia: string) => rastrear.execute({ numeroGuia })

/** Herramientas de las páginas públicas (landing y seguimiento). Referencia estable para el registro. */
export const HERRAMIENTAS_PUBLICAS: HerramientaAgente[] = [rastrear, cotizar, cobertura]
