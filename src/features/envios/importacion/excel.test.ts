import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { crearPlantilla, ErrorPlantilla, leerExcel } from './excel'
import { COLUMNAS, NOMBRE_HOJA } from './importacion'
import { TIPOS } from './fixtures'

async function libroDe(blob: Blob) {
  const libro = new ExcelJS.Workbook()
  await libro.xlsx.load(await blob.arrayBuffer())
  return libro
}

async function blobDe(libro: ExcelJS.Workbook) {
  return new Blob([await libro.xlsx.writeBuffer()])
}

describe('plantilla de Excel', () => {
  it('trae los encabezados, listas desplegables e instrucciones', async () => {
    const libro = await libroDe(await crearPlantilla(TIPOS, [{ nombre: 'Ibarra' }, { nombre: 'Quito' }]))
    const hoja = libro.getWorksheet(NOMBRE_HOJA)!
    const encabezados = (hoja.getRow(1).values as string[]).slice(1)
    expect(encabezados).toEqual(COLUMNAS.map((c) => (c.requerida ? `${c.titulo} *` : c.titulo)))
    expect(hoja.getCell('H2').dataValidation).toMatchObject({ type: 'list', formulae: ['Listas!$A$1:$A$2'] })
    expect(libro.getWorksheet('Listas')!.getCell('B1').value).toBe('Sobre')
    expect(libro.getWorksheet('Instrucciones')!.getCell('A2').value).toBe('N.º guía')
  })

  it('la plantilla llenada se lee de vuelta, sin filas vacías y con el 0 de los teléfonos', async () => {
    const libro = await libroDe(await crearPlantilla(TIPOS, [{ nombre: 'Ibarra' }]))
    const hoja = libro.getWorksheet(NOMBRE_HOJA)!
    hoja.getRow(2).values = ['40461', 'Ana', 991112233, '', 'Luis', '0994445566', 'Av. Siempre Viva 123', 'Ibarra', 'Quito', '', 'Paquete', 2, 1.5, 'Pagado', 'Ropa']
    hoja.getRow(4).values = ['', 'Eva', '062950111', '', 'Rosa', '0999999999', 'Calle Larga 45', 'Ibarra', 'Ibarra', 'Rural', 'Sobre', 1, 0.2, 'Al cobro']
    const filas = await leerExcel(await blobDe(libro))
    expect(filas).toHaveLength(2)
    expect(filas[0]).toMatchObject({
      filaExcel: 2,
      valores: { numeroGuia: '40461', remitenteNombre: 'Ana', remitenteTelefono: '0991112233', cantidad: '2', pesoKg: '1.5', descripcion: 'Ropa' },
    })
    expect(filas[1]).toMatchObject({ filaExcel: 4, valores: { zona: 'Rural', remitenteTelefono: '062950111' } })
  })

  it('rechaza un archivo sin las columnas obligatorias o que no es Excel', async () => {
    const libro = new ExcelJS.Workbook()
    libro.addWorksheet('Hoja1').addRow(['Nombre', 'Teléfono'])
    await expect(leerExcel(await blobDe(libro))).rejects.toThrow(/Faltan columnas: Remitente/)
    await expect(leerExcel(new Blob(['hola']))).rejects.toBeInstanceOf(ErrorPlantilla)
  })
})
