// Plantilla y lectura de Excel para importar envíos. exceljs se carga con import() dinámico:
// solo se descarga al bajar la plantilla o al leer un archivo.
import type { Cell, CellValue, Workbook } from 'exceljs'
import type { Ciudad, TipoCargaPublico } from '@/types/api'
import { FORMA_PAGO_LABEL, FORMAS_PAGO, ZONA_LABEL, ZONAS } from '../domain'
import {
  COLUMNAS,
  esFilaVacia,
  filaVacia,
  mapearEncabezados,
  MAX_FILAS,
  NOMBRE_HOJA,
  type ClaveColumna,
  type FilaImportacion,
  type ValoresFila,
} from './importacion'

export const NOMBRE_PLANTILLA = 'plantilla-envios-pcargo.xlsx'
const AZUL = 'FF1B2A59'

async function nuevoLibro(): Promise<Workbook> {
  const mod = await import('exceljs')
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  return new ExcelJS.Workbook()
}

const letra = (n: number) => {
  let s = ''
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s
  return s
}

/**
 * Filas de la hoja «Ejemplo»: un envío con 2 cartones y 1 paquete (la segunda fila solo lleva la carga) y otro con
 * un sobre. Usa los tipos y ciudades vigentes, sin pasar el peso máximo de cada tipo.
 */
function filasEjemplo(tipos: TipoCargaPublico[], ciudades: Pick<Ciudad, 'nombre'>[]): Partial<ValoresFila>[] {
  const tipo = (codigo: string, i: number) => tipos.find((t) => t.codigo === codigo) ?? tipos[i % Math.max(tipos.length, 1)]
  const peso = (t: TipoCargaPublico | undefined, kg: number) => String(Math.min(kg, t?.pesoMaxKg ?? kg))
  const [carton, paquete, sobre] = [tipo('CARTON', 0), tipo('PAQUETE', 1), tipo('SOBRE', 2)]
  const origen = ciudades[0]?.nombre ?? 'Ibarra'
  const destino = ciudades.at(-1)?.nombre ?? 'Quito'
  const remitente = { remitenteNombre: 'Textiles Atuntaqui', remitenteTelefono: '0991112233', remitenteDireccion: 'Calle Bolívar 12-34' }
  return [
    {
      envio: '1', ...remitente,
      destinatarioNombre: 'Almacén El Sol', destinatarioTelefono: '0994445566', destinatarioDireccion: 'Av. 10 de Agosto N20-15',
      origen, destino, zona: 'Urbana', tipoCarga: carton?.nombre ?? '', cantidad: '2', pesoKg: peso(carton, 8), formaPago: 'Al cobro', costoAdicional: '1.50', descripcion: 'Ropa',
    },
    { envio: '1', tipoCarga: paquete?.nombre ?? '', cantidad: '1', pesoKg: peso(paquete, 3) },
    {
      envio: '2', ...remitente,
      destinatarioNombre: 'Farmacia Cruz Azul', destinatarioTelefono: '0997778899', destinatarioDireccion: 'Sucre 5-12',
      origen, destino: origen, zona: 'Urbana', tipoCarga: sobre?.nombre ?? '', cantidad: '1', pesoKg: peso(sobre, 0.3), formaPago: 'Pagado', descripcion: 'Documentos',
    },
  ]
}

/**
 * Arma la plantilla: hoja «Envíos» con los encabezados y listas desplegables (ciudades, tipos de carga,
 * zona y forma de pago), hoja «Ejemplo» (varios tipos de carga en un envío), hoja «Instrucciones» con el
 * formato de cada columna, y una hoja oculta con las listas.
 */
export async function crearPlantilla(tipos: TipoCargaPublico[], ciudades: Pick<Ciudad, 'nombre'>[]): Promise<Blob> {
  const libro = await nuevoLibro()
  libro.creator = 'PCargo'
  const hoja = libro.addWorksheet(NOMBRE_HOJA, { views: [{ state: 'frozen', ySplit: 1 }] })
  hoja.columns = COLUMNAS.map((c) => ({
    header: c.requerida ? `${c.titulo} *` : c.titulo,
    key: c.clave,
    width: c.ancho + 4,
    style: c.texto ? { numFmt: '@' } : {},
  }))
  const encabezado = hoja.getRow(1)
  encabezado.height = 22
  encabezado.eachCell((celda, i) => {
    const col = COLUMNAS[i - 1]!
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.requerida ? AZUL : 'FF5B6684' } }
    celda.alignment = { vertical: 'middle' }
    celda.note = `${col.ayuda}\nEjemplo: ${col.ejemplo}`
  })

  // Listas para los desplegables (en una hoja oculta: una lista larga no cabe en la validación directa).
  const listas = libro.addWorksheet('Listas', { state: 'veryHidden' })
  const valores: Record<string, string[]> = {
    ciudades: ciudades.map((c) => c.nombre),
    tipos: tipos.map((t) => t.nombre),
    zonas: ZONAS.map((z) => ZONA_LABEL[z]),
    pagos: FORMAS_PAGO.map((f) => FORMA_PAGO_LABEL[f]),
  }
  const rangos: Record<string, string> = {}
  Object.entries(valores).forEach(([nombre, lista], i) => {
    const col = letra(i + 1)
    lista.forEach((v, j) => (listas.getCell(`${col}${j + 1}`).value = v))
    rangos[nombre] = `Listas!$${col}$1:$${col}$${Math.max(lista.length, 1)}`
  })
  const desplegable: Partial<Record<ClaveColumna, string>> = {
    origen: rangos.ciudades,
    destino: rangos.ciudades,
    tipoCarga: rangos.tipos,
    zona: rangos.zonas,
    formaPago: rangos.pagos,
  }
  COLUMNAS.forEach((c, i) => {
    const rango = desplegable[c.clave]
    const col = letra(i + 1)
    for (let fila = 2; fila <= 501; fila++) {
      const celda = hoja.getCell(`${col}${fila}`)
      if (rango) {
        celda.dataValidation = {
          type: 'list',
          allowBlank: !c.requerida,
          formulae: [rango],
          showErrorMessage: false,
        }
      } else if (c.clave === 'cantidad') {
        celda.dataValidation = { type: 'whole', operator: 'between', formulae: [1, 999], allowBlank: true }
      }
    }
  })

  // Ejemplo con las mismas columnas: no se importa (solo se lee la hoja «Envíos»).
  const ejemplo = libro.addWorksheet('Ejemplo', { views: [{ state: 'frozen', ySplit: 1 }] })
  ejemplo.columns = COLUMNAS.map((c) => ({ header: c.requerida ? `${c.titulo} *` : c.titulo, key: c.clave, width: c.ancho + 4 }))
  ejemplo.getRow(1).eachCell((celda) => {
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B6684' } }
  })
  for (const f of filasEjemplo(tipos, ciudades)) ejemplo.addRow(f)
  ejemplo.addRow({})
  ejemplo.addRow({ envio: 'Envío 1: 2 cartones y 1 paquete para el mismo destinatario, con $1,50 de costo adicional. La segunda fila solo lleva Envío, Tipo, Cantidad y Peso.' })
  ejemplo.addRow({ envio: 'Envío 2: un sobre (una sola fila). Esta hoja no se importa: llena la hoja «Envíos».' })

  const ayuda = libro.addWorksheet('Instrucciones')
  ayuda.columns = [
    { header: 'Columna', key: 'titulo', width: 24 },
    { header: 'Obligatoria', key: 'req', width: 12 },
    { header: 'Formato', key: 'ayuda', width: 80 },
    { header: 'Ejemplo', key: 'ejemplo', width: 22 },
  ]
  ayuda.getRow(1).font = { bold: true }
  for (const c of COLUMNAS) ayuda.addRow({ titulo: c.titulo, req: c.requerida ? 'Sí' : 'No', ayuda: c.ayuda, ejemplo: c.ejemplo })
  ayuda.addRow({})
  ayuda.addRow({ titulo: 'Una fila por cada tipo de carga.' })
  ayuda.addRow({
    titulo:
      'Varios tipos en un mismo envío (p. ej. 2 cartones y 1 paquete al mismo destinatario): pon el mismo número en la columna «Envío» en esas filas. ' +
      'En las filas adicionales basta llenar Tipo de carga, Cantidad y Peso; los demás datos se toman de la primera fila del envío. Mira la hoja «Ejemplo».',
  })
  ayuda.addRow({ titulo: `Ciudades: ${valores.ciudades.join(', ')}` })
  ayuda.addRow({ titulo: `Tipos de carga: ${tipos.map((t) => `${t.nombre} (máx. ${t.pesoMaxKg} kg)`).join(', ')}` })
  ayuda.addRow({ titulo: `Formas de pago: ${valores.pagos.join(', ')} · Zona: ${valores.zonas.join(' o ')}` })
  ayuda.addRow({ titulo: 'Costo adicional (opcional): recargo en USD que se suma al costo del envío, p. ej. 2 o 1.50. Vacío: sin recargo.' })

  const buffer = await libro.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export async function descargarPlantilla(tipos: TipoCargaPublico[], ciudades: Pick<Ciudad, 'nombre'>[]): Promise<void> {
  const blob = await crearPlantilla(tipos, ciudades)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = NOMBRE_PLANTILLA
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Texto de una celda: resultados de fórmula, texto enriquecido, hipervínculos, fechas. */
function textoCelda(valor: CellValue): string {
  if (valor === null || valor === undefined) return ''
  if (valor instanceof Date) return valor.toLocaleDateString('es-EC')
  if (typeof valor === 'object') {
    if ('result' in valor) return textoCelda(valor.result as CellValue)
    if ('richText' in valor) return valor.richText.map((r) => r.text).join('')
    if ('text' in valor) return String(valor.text)
    if ('error' in valor) return ''
  }
  return String(valor)
}

/**
 * Excel guarda «0991112233» como el número 991112233 si la celda no es de texto: en Ecuador los teléfonos
 * nacionales empiezan con 0, así que se lo devolvemos (salvo que venga con el código de país 593).
 */
function telefonoCelda(celda: Cell): string {
  const v = celda.value
  if (typeof v === 'number') {
    const s = String(Math.trunc(v))
    return s.startsWith('593') || s.startsWith('0') ? s : `0${s}`
  }
  return textoCelda(v).trim()
}

export class ErrorPlantilla extends Error {}

/** Lee la hoja «Envíos» (o la primera) y devuelve las filas con datos, sin validar. */
export async function leerExcel(archivo: Blob): Promise<FilaImportacion[]> {
  const libro = await nuevoLibro()
  try {
    await libro.xlsx.load(await archivo.arrayBuffer())
  } catch {
    throw new ErrorPlantilla('No se pudo leer el archivo. Usa un Excel .xlsx (puedes partir de la plantilla).')
  }
  const hoja = libro.getWorksheet(NOMBRE_HOJA) ?? libro.worksheets.find((h) => h.state === 'visible')
  if (!hoja) throw new ErrorPlantilla('El archivo no tiene hojas.')

  const encabezados: string[] = []
  hoja.getRow(1).eachCell({ includeEmpty: true }, (celda, i) => {
    encabezados[i - 1] = textoCelda(celda.value).replace(/\*\s*$/, '').trim()
  })
  const { indices, faltan } = mapearEncabezados(encabezados)
  if (faltan.length) {
    throw new ErrorPlantilla(`Faltan columnas: ${faltan.map((c) => c.titulo).join(', ')}. Descarga la plantilla para ver el formato.`)
  }

  const filas: FilaImportacion[] = []
  for (let n = 2; n <= hoja.rowCount; n++) {
    const row = hoja.getRow(n)
    const fila = filaVacia(`f${n}`)
    fila.filaExcel = n
    for (const c of COLUMNAS) {
      const i = indices[c.clave]
      if (i === undefined) continue
      const celda = row.getCell(i + 1)
      fila.valores[c.clave] = c.clave.endsWith('Telefono') ? telefonoCelda(celda) : textoCelda(celda.value).trim()
    }
    if (esFilaVacia(fila.valores)) continue
    filas.push(fila)
    if (filas.length > MAX_FILAS) throw new ErrorPlantilla(`El archivo tiene más de ${MAX_FILAS} filas. Divídelo en varios.`)
  }
  if (!filas.length) throw new ErrorPlantilla('La hoja no tiene filas con datos.')
  return filas
}
