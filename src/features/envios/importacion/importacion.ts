// Importación de envíos desde Excel: lógica pura (sin exceljs ni DOM) para validar, agrupar y armar
// los envíos que se crean con POST /envios. Se testea sola; la lectura del archivo está en `excel.ts`.
import type { Envio, FormaPago, ItemSolicitud, NuevoEnvio, Ruta, TipoCargaPublico, Zona } from '@/types/api'
import { enFrase, FORMA_PAGO_LABEL, FORMAS_PAGO, precioUnitario, ZONA_LABEL } from '../domain'
import { normalizarGuia } from '../guia'
import { MAX_CANTIDAD, MAX_ITEMS } from '../schema'

export type ClaveColumna =
  | 'envio'
  | 'numeroGuia'
  | 'remitenteNombre'
  | 'remitenteTelefono'
  | 'remitenteDireccion'
  | 'destinatarioNombre'
  | 'destinatarioTelefono'
  | 'destinatarioDireccion'
  | 'origen'
  | 'destino'
  | 'zona'
  | 'tipoCarga'
  | 'cantidad'
  | 'pesoKg'
  | 'formaPago'
  | 'descripcion'

export interface Columna {
  clave: ClaveColumna
  titulo: string
  requerida: boolean
  /** Explicación para la hoja de instrucciones de la plantilla. */
  ayuda: string
  ejemplo: string
  /** Ancho aproximado en caracteres (plantilla y vista previa). */
  ancho: number
  /** Se guarda como texto en Excel (evita que se pierdan los ceros de adelante). */
  texto?: boolean
}

/**
 * Formato de la plantilla: una fila por tipo de carga. Las filas con el mismo «Envío» (o, sin él, el mismo N.º de
 * guía) son un solo envío con varios tipos de carga; en las filas adicionales basta el tipo, la cantidad y el peso.
 */
export const COLUMNAS: Columna[] = [
  { clave: 'envio', titulo: 'Envío', requerida: false, ayuda: 'Agrupa las filas de un mismo envío (1, 2, 3…). Para mandar varios tipos de carga juntos (p. ej. 2 cartones y 1 paquete al mismo destinatario) pon el mismo número en esas filas: en las filas adicionales basta llenar Tipo de carga, Cantidad y Peso. Vacío: cada fila es un envío.', ejemplo: '1', ancho: 7, texto: true },
  { clave: 'numeroGuia', titulo: 'N.º guía', requerida: false, ayuda: 'Número impreso en la guía física. Vacío: se asigna el siguiente. Sin columna «Envío», las filas con el mismo número forman un solo envío.', ejemplo: '0040461', ancho: 11, texto: true },
  { clave: 'remitenteNombre', titulo: 'Remitente', requerida: true, ayuda: 'Nombre de quien envía (2–120 caracteres).', ejemplo: 'Textiles Atuntaqui', ancho: 22 },
  { clave: 'remitenteTelefono', titulo: 'Teléfono remitente', requerida: true, ayuda: '7 a 15 dígitos; puede llevar espacios, guiones o +.', ejemplo: '0991112233', ancho: 15, texto: true },
  { clave: 'remitenteDireccion', titulo: 'Dirección remitente', requerida: false, ayuda: 'Opcional (hasta 200 caracteres). Se imprime en la guía.', ejemplo: 'Calle Bolívar 12-34', ancho: 22 },
  { clave: 'destinatarioNombre', titulo: 'Destinatario', requerida: true, ayuda: 'Nombre de quien recibe (2–120 caracteres).', ejemplo: 'Almacén El Sol', ancho: 22 },
  { clave: 'destinatarioTelefono', titulo: 'Teléfono destinatario', requerida: true, ayuda: '7 a 15 dígitos.', ejemplo: '0994445566', ancho: 15, texto: true },
  { clave: 'destinatarioDireccion', titulo: 'Dirección destinatario', requerida: true, ayuda: 'Dirección de entrega (5–200 caracteres).', ejemplo: 'Av. 10 de Agosto N20-15', ancho: 26 },
  { clave: 'origen', titulo: 'Origen', requerida: true, ayuda: 'Ciudad de origen (lista de ciudades).', ejemplo: 'Ibarra', ancho: 12 },
  { clave: 'destino', titulo: 'Destino', requerida: true, ayuda: 'Ciudad de destino. Igual al origen = envío urbano.', ejemplo: 'Quito', ancho: 12 },
  { clave: 'zona', titulo: 'Zona', requerida: false, ayuda: 'Urbana o Rural. Vacío: Urbana.', ejemplo: 'Urbana', ancho: 9 },
  { clave: 'tipoCarga', titulo: 'Tipo de carga', requerida: true, ayuda: 'Nombre del tipo (lista de tipos de carga).', ejemplo: 'Paquete', ancho: 15 },
  { clave: 'cantidad', titulo: 'Cantidad', requerida: true, ayuda: `Entero de 1 a ${MAX_CANTIDAD}.`, ejemplo: '2', ancho: 9 },
  { clave: 'pesoKg', titulo: 'Peso por unidad (kg)', requerida: true, ayuda: 'Peso de cada unidad en kg (no el total). No puede superar el máximo del tipo.', ejemplo: '1.5', ancho: 11 },
  { clave: 'formaPago', titulo: 'Forma de pago', requerida: true, ayuda: 'Pagado, Al cobro, Contrato o Seguro.', ejemplo: 'Al cobro', ancho: 12 },
  { clave: 'descripcion', titulo: 'Descripción', requerida: false, ayuda: 'Contenido declarado (opcional, hasta 200 caracteres).', ejemplo: 'Ropa', ancho: 20 },
]

export const NOMBRE_HOJA = 'Envíos'
export const MAX_FILAS = 1000

export type ValoresFila = Record<ClaveColumna, string>

export interface FilaImportacion {
  id: string
  /** Fila de origen en el Excel (para orientar al usuario); null si se agregó en la vista previa. */
  filaExcel: number | null
  valores: ValoresFila
}

export const filaVacia = (id: string): FilaImportacion => ({
  id,
  filaExcel: null,
  valores: Object.fromEntries(COLUMNAS.map((c) => [c.clave, ''])) as ValoresFila,
})

/** «  Quíto » → «quito»: minúsculas, sin tildes ni espacios repetidos. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
    .trim()
}

/** Busca el tipo por código o nombre, también en plural («paquetes», «cartones»). */
export function resolverTipo(texto: string, tipos: TipoCargaPublico[]): TipoCargaPublico | undefined {
  const t = normalizar(texto)
  if (!t) return undefined
  const candidatos = [t, t.replace(/es$/, ''), t.replace(/s$/, '')]
  return tipos.find((tipo) => {
    const nombres = [normalizar(tipo.nombre), normalizar(tipo.codigo)]
    return candidatos.some((c) => nombres.includes(c))
  })
}

export function resolverFormaPago(texto: string): FormaPago | undefined {
  const t = normalizar(texto)
  return FORMAS_PAGO.find((f) => normalizar(FORMA_PAGO_LABEL[f]) === t || normalizar(f) === t)
}

/** Vacío → URBANA. */
export function resolverZona(texto: string): Zona | undefined {
  const t = normalizar(texto)
  if (!t) return 'URBANA'
  return (['URBANA', 'RURAL'] as const).find((z) => normalizar(ZONA_LABEL[z]) === t || normalizar(z) === t)
}

/** Ruta operativa entre dos ciudades (por nombre, sin distinguir mayúsculas ni tildes). */
export function resolverRuta(origen: string, destino: string, rutas: Ruta[]): Ruta | undefined {
  const o = normalizar(origen)
  const d = normalizar(destino)
  return rutas.find((r) => r.operativa && normalizar(r.origen.nombre) === o && normalizar(r.destino.nombre) === d)
}

/** Número decimal con coma o punto: «1,5» = «1.5». */
export function leerNumero(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const TELEFONO = /^[0-9+\s-]{7,15}$/

/**
 * Datos del envío (no de la carga): en las filas adicionales de un envío pueden quedar vacíos (se toman de su
 * primera fila); si se llenan, deben coincidir con ella.
 */
const CLAVES_ENVIO: ClaveColumna[] = [
  'numeroGuia',
  'remitenteNombre',
  'remitenteTelefono',
  'remitenteDireccion',
  'destinatarioNombre',
  'destinatarioTelefono',
  'destinatarioDireccion',
  'origen',
  'destino',
  'zona',
  'formaPago',
  'descripcion',
]

export interface EnvioImportado {
  /** Clave del grupo: el «Envío», si no el N.º de guía normalizado o, sin ninguno, el id de la fila. */
  clave: string
  /** Cómo se nombra el envío en los mensajes: «del envío 1», «de la guía 40461» o null (fila suelta). */
  nombre: string | null
  filas: string[]
  numeroGuia: string | null
  ruta: Ruta | undefined
  /** Solicitud lista para POST /envios; null si alguna de sus filas tiene errores. */
  solicitud: NuevoEnvio | null
  costo: number
  totalPiezas: number
  pesoTotalKg: number
}

export interface ResultadoValidacion {
  envios: EnvioImportado[]
  /** Errores por fila y columna (mensaje corto en español). */
  errores: Map<string, Partial<Record<ClaveColumna, string>>>
  /** Envíos sin errores. */
  validos: EnvioImportado[]
  filasConError: number
  /** Datos del envío que una fila adicional toma de la primera (celdas que dejó vacías). */
  heredados: Map<string, Partial<ValoresFila>>
}

export interface ContextoValidacion {
  tipos: TipoCargaPublico[]
  rutas: Ruta[]
}

function validarFila(v: ValoresFila, ctx: ContextoValidacion): Partial<Record<ClaveColumna, string>> {
  const e: Partial<Record<ClaveColumna, string>> = {}
  const largo = (clave: ClaveColumna, min: number, max: number, requerido: string) => {
    const t = v[clave].trim()
    if (t.length < min) e[clave] = t ? `Mínimo ${min} caracteres` : requerido
    else if (t.length > max) e[clave] = `Máximo ${max} caracteres`
  }
  if (v.numeroGuia.trim() && normalizarGuia(v.numeroGuia) === null) e.numeroGuia = 'Solo números (hasta 12 dígitos)'
  largo('remitenteNombre', 2, 120, 'Falta el remitente')
  if (!TELEFONO.test(v.remitenteTelefono.trim())) e.remitenteTelefono = v.remitenteTelefono.trim() ? 'Teléfono inválido' : 'Falta el teléfono'
  if (v.remitenteDireccion.trim().length > 200) e.remitenteDireccion = 'Máximo 200 caracteres'
  largo('destinatarioNombre', 2, 120, 'Falta el destinatario')
  if (!TELEFONO.test(v.destinatarioTelefono.trim())) e.destinatarioTelefono = v.destinatarioTelefono.trim() ? 'Teléfono inválido' : 'Falta el teléfono'
  largo('destinatarioDireccion', 5, 200, 'Falta la dirección de entrega')
  if (!v.origen.trim()) e.origen = 'Falta el origen'
  if (!v.destino.trim()) e.destino = 'Falta el destino'
  if (v.origen.trim() && v.destino.trim() && !resolverRuta(v.origen, v.destino, ctx.rutas)) {
    e.destino = `No hay ruta ${v.origen.trim()} → ${v.destino.trim()}`
  }
  if (!resolverZona(v.zona)) e.zona = 'Urbana o Rural'
  const tipo = resolverTipo(v.tipoCarga, ctx.tipos)
  if (!tipo) e.tipoCarga = v.tipoCarga.trim() ? 'Tipo de carga desconocido' : 'Falta el tipo de carga'
  const cantidad = leerNumero(v.cantidad)
  if (cantidad === null || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
    e.cantidad = `Entero de 1 a ${MAX_CANTIDAD}`
  }
  const peso = leerNumero(v.pesoKg)
  if (peso === null || peso <= 0) e.pesoKg = 'Peso mayor a 0'
  else if (tipo && peso > tipo.pesoMaxKg) e.pesoKg = `Máx. ${tipo.pesoMaxKg} kg por ${enFrase(tipo.nombre)}`
  if (!resolverFormaPago(v.formaPago)) e.formaPago = v.formaPago.trim() ? 'Pagado, Al cobro, Contrato o Seguro' : 'Falta la forma de pago'
  if (v.descripcion.trim().length > 200) e.descripcion = 'Máximo 200 caracteres'
  return e
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Costo del envío con las reglas del contrato (mayoreo por tipo en todo el envío, precio rural). */
export function calcularCosto(items: ItemSolicitud[], zona: Zona, tipos: TipoCargaPublico[]): number {
  const unidades = new Map<string, number>()
  for (const i of items) unidades.set(i.tipoCarga, (unidades.get(i.tipoCarga) ?? 0) + i.cantidad)
  return round2(
    items.reduce((s, i) => {
      const tipo = tipos.find((t) => t.codigo === i.tipoCarga)
      return tipo ? s + round2(precioUnitario(tipo, zona, unidades.get(i.tipoCarga)!).precio * i.cantidad) : s
    }, 0),
  )
}

/** ¿Mismo dato del envío? La guía se compara por su número («0040461» = «40461»); el resto, sin tildes ni mayúsculas. */
const mismoDato = (c: ClaveColumna, a: string, b: string) =>
  c === 'numeroGuia' ? normalizarGuia(a) === normalizarGuia(b) : normalizar(a) === normalizar(b)

/** A qué envío pertenece una fila: por «Envío»; si no, por N.º de guía; si no, a ninguno (va sola). */
function grupoDeFila(v: ValoresFila): { clave: string; nombre: string } | null {
  const envio = v.envio.trim()
  if (envio) return { clave: `envio:${normalizar(envio)}`, nombre: `del envío ${envio}` }
  const guia = normalizarGuia(v.numeroGuia)
  return guia ? { clave: `guia:${guia}`, nombre: `de la guía ${guia}` } : null
}

/**
 * Valida todas las filas y las agrupa en envíos: las filas con el mismo «Envío» (o, sin él, el mismo N.º de guía)
 * son un envío con varios tipos de carga. Sus filas adicionales pueden dejar vacíos los datos del envío
 * (remitente, destinatario, ruta, pago…), que se toman de la primera; si los llenan, deben coincidir.
 */
export function validarImportacion(filas: FilaImportacion[], ctx: ContextoValidacion): ResultadoValidacion {
  const errores = new Map<string, Partial<Record<ClaveColumna, string>>>()
  const heredados = new Map<string, Partial<ValoresFila>>()
  const grupos = new Map<string, { nombre: string | null; filas: FilaImportacion[] }>()
  for (const f of filas) {
    const g = grupoDeFila(f.valores)
    const clave = g?.clave ?? `fila:${f.id}`
    const grupo = grupos.get(clave) ?? { nombre: g?.nombre ?? null, filas: [] }
    grupo.filas.push(f)
    grupos.set(clave, grupo)
  }

  for (const { nombre, filas: miembros } of grupos.values()) {
    const [primera, ...resto] = miembros
    errores.set(primera!.id, validarFila(primera!.valores, ctx))
    for (const f of resto) {
      // Las celdas vacías de datos del envío se toman de la primera fila; sus errores se muestran allá.
      const tomados: Partial<ValoresFila> = {}
      for (const c of CLAVES_ENVIO) if (!f.valores[c].trim() && primera!.valores[c].trim()) tomados[c] = primera!.valores[c]
      const e = validarFila({ ...f.valores, ...tomados }, ctx)
      for (const c of Object.keys(tomados) as ClaveColumna[]) delete e[c]
      if (tomados.origen || tomados.destino) delete e.destino
      for (const c of CLAVES_ENVIO) {
        if (!e[c] && !tomados[c] && f.valores[c].trim() && !mismoDato(c, f.valores[c], primera!.valores[c])) {
          e[c] = `Debe coincidir con la primera fila ${nombre ?? 'del envío'}`
        }
      }
      errores.set(f.id, e)
      if (Object.keys(tomados).length) heredados.set(f.id, tomados)
    }
  }

  // Un N.º de guía solo puede estar en un envío (si no, el servidor rechazaría el segundo).
  const enviosPorGuia = new Map<string, Set<string>>()
  for (const [clave, g] of grupos) {
    for (const f of g.filas) {
      const guia = normalizarGuia(f.valores.numeroGuia)
      if (guia) enviosPorGuia.set(guia, (enviosPorGuia.get(guia) ?? new Set()).add(clave))
    }
  }
  for (const g of grupos.values()) {
    for (const f of g.filas) {
      const guia = normalizarGuia(f.valores.numeroGuia)
      if (guia && enviosPorGuia.get(guia)!.size > 1) errores.get(f.id)!.numeroGuia ??= `La guía ${guia} está en otro envío`
    }
  }

  const envios: EnvioImportado[] = []
  for (const [clave, { nombre, filas: miembros }] of grupos) {
    const [primera] = miembros
    if (miembros.length > MAX_ITEMS) {
      for (const f of miembros) errores.get(f.id)!.tipoCarga ??= `Máximo ${MAX_ITEMS} tipos de carga por envío`
    }

    const v = primera!.valores
    const ruta = resolverRuta(v.origen, v.destino, ctx.rutas)
    const zona = resolverZona(v.zona) ?? 'URBANA'
    const items: ItemSolicitud[] = []
    for (const f of miembros) {
      const tipo = resolverTipo(f.valores.tipoCarga, ctx.tipos)
      const cantidad = leerNumero(f.valores.cantidad)
      const peso = leerNumero(f.valores.pesoKg)
      if (tipo && cantidad !== null && peso !== null) items.push({ tipoCarga: tipo.codigo, cantidad, pesoKg: peso })
    }
    const sinErrores = miembros.every((f) => Object.keys(errores.get(f.id)!).length === 0)
    // La guía puede venir en cualquier fila del envío (las demás la dejan vacía).
    const numeroGuia = miembros.map((f) => normalizarGuia(f.valores.numeroGuia)).find((g) => g !== null) ?? null
    const formaPago = resolverFormaPago(v.formaPago)
    const solicitud: NuevoEnvio | null =
      sinErrores && ruta && formaPago
        ? {
            remitente: {
              nombre: v.remitenteNombre.trim(),
              telefono: v.remitenteTelefono.trim(),
              direccion: v.remitenteDireccion.trim() || null,
            },
            destinatario: {
              nombre: v.destinatarioNombre.trim(),
              telefono: v.destinatarioTelefono.trim(),
              direccion: v.destinatarioDireccion.trim(),
            },
            rutaId: ruta.id,
            items,
            formaPago,
            zona,
            descripcion: v.descripcion.trim() || undefined,
            numeroGuia: numeroGuia ?? undefined,
          }
        : null
    envios.push({
      clave,
      nombre,
      filas: miembros.map((f) => f.id),
      numeroGuia,
      ruta,
      solicitud,
      costo: calcularCosto(items, zona, ctx.tipos),
      totalPiezas: items.reduce((s, i) => s + i.cantidad, 0),
      pesoTotalKg: round2(items.reduce((s, i) => s + i.cantidad * i.pesoKg, 0)),
    })
  }

  const validos = envios.filter((e) => e.solicitud)
  const filasConError = [...errores.values()].filter((e) => Object.keys(e).length > 0).length
  return { envios, errores, validos, filasConError, heredados }
}

/**
 * Vista previa: agrega una fila de carga al envío de `filaId` (justo después de su última fila). Si ese envío aún
 * no tiene «Envío» ni N.º de guía, se le asigna el siguiente número de «Envío» libre para que queden unidas.
 */
export function agregarCargaAlEnvio(filas: FilaImportacion[], filaId: string, nuevoId: string): FilaImportacion[] {
  const base = filas.find((f) => f.id === filaId)
  if (!base) return filas
  const g = grupoDeFila(base.valores)
  const delGrupo = (f: FilaImportacion) => (g ? grupoDeFila(f.valores)?.clave === g.clave : f.id === filaId)
  let resultado = filas
  const nueva = filaVacia(nuevoId)
  if (base.valores.envio.trim()) nueva.valores.envio = base.valores.envio.trim()
  else if (g) nueva.valores.numeroGuia = base.valores.numeroGuia.trim()
  else {
    const usados = filas.map((f) => Number(f.valores.envio.trim())).filter((n) => Number.isInteger(n) && n > 0)
    const envio = String(Math.max(0, ...usados) + 1)
    nueva.valores.envio = envio
    resultado = filas.map((f) => (f.id === filaId ? { ...f, valores: { ...f.valores, envio } } : f))
  }
  const ultima = resultado.reduce((idx, f, i) => (delGrupo(f) || f.id === filaId ? i : idx), -1)
  return [...resultado.slice(0, ultima + 1), nueva, ...resultado.slice(ultima + 1)]
}

/** Fila del Excel vacía (todas sus celdas en blanco): se ignora al importar. */
export const esFilaVacia = (v: Partial<ValoresFila>) => Object.values(v).every((x) => !String(x ?? '').trim())

/**
 * Asigna cada encabezado del Excel a su columna (sin importar el orden, tildes ni mayúsculas;
 * se aceptan también la clave interna y «Peso (kg)»). Devuelve las columnas obligatorias que faltan.
 */
export function mapearEncabezados(encabezados: string[]): { indices: Partial<Record<ClaveColumna, number>>; faltan: Columna[] } {
  const indices: Partial<Record<ClaveColumna, number>> = {}
  const alias = (c: Columna) => {
    const base = [c.titulo, c.clave, c.titulo.replace(/\s*\(.*\)$/, '')]
    if (c.clave === 'pesoKg') base.push('Peso (kg)', 'Peso')
    if (c.clave === 'numeroGuia') base.push('Guía', 'N° guía', 'No. guía', 'Numero de guia')
    if (c.clave === 'envio') base.push('N.º envío', 'N° envío', 'No. envío', 'Grupo', 'Pedido')
    return base.map(normalizar)
  }
  encabezados.forEach((h, i) => {
    const n = normalizar(h ?? '')
    if (!n) return
    const col = COLUMNAS.find((c) => indices[c.clave] === undefined && alias(c).includes(n))
    if (col) indices[col.clave] = i
  })
  return { indices, faltan: COLUMNAS.filter((c) => c.requerida && indices[c.clave] === undefined) }
}

/**
 * Envío provisional (aún no creado) para previsualizar su guía: mismos datos que se enviarán, costo
 * calculado con el catálogo y número de guía 0 si se asignará al crearlo.
 */
export function envioBorrador(e: EnvioImportado, tipos: TipoCargaPublico[], operador: string | null, ahora = new Date()): Envio | null {
  const s = e.solicitud
  if (!s || !e.ruta) return null
  const unidades = new Map<string, number>()
  for (const i of s.items) unidades.set(i.tipoCarga, (unidades.get(i.tipoCarga) ?? 0) + i.cantidad)
  const items = s.items.map((i) => {
    const tipo = tipos.find((t) => t.codigo === i.tipoCarga)!
    const costoUnitario = precioUnitario(tipo, s.zona ?? 'URBANA', unidades.get(i.tipoCarga)!).precio
    return { ...i, costoUnitario, subtotal: round2(costoUnitario * i.cantidad) }
  })
  const fecha = ahora.toISOString()
  return {
    id: `borrador-${e.clave}`,
    numeroGuia: e.numeroGuia ? Number(e.numeroGuia) : 0,
    clienteId: null,
    remitente: { nombre: s.remitente.nombre, telefono: s.remitente.telefono, direccion: s.remitente.direccion ?? null },
    destinatario: s.destinatario,
    ruta: { id: e.ruta.id, origen: e.ruta.origen.nombre, destino: e.ruta.destino.nombre },
    items,
    totalPiezas: e.totalPiezas,
    pesoTotalKg: e.pesoTotalKg,
    zona: s.zona ?? 'URBANA',
    descripcion: s.descripcion ?? null,
    costo: e.costo,
    formaPago: s.formaPago,
    estado: 'REGISTRADO',
    registro: { fecha, operador },
    entrega: null,
    evidencia: null,
    origen: { canal: 'PANEL', integracionId: null, integracion: null },
    referenciaExterna: null,
    creadoEn: fecha,
    actualizadoEn: fecha,
  } as Envio
}
