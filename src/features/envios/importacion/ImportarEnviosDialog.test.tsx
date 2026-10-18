import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExcelJS from 'exceljs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders, tipoCargaFixture } from '@/test/utils'
import { RUTAS, TIPOS } from './fixtures'
import { ImportarEnviosDialog } from './ImportarEnviosDialog'

const generarGuias = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../guiaPdf', async (original) => ({ ...(await original<typeof import('../guiaPdf')>()), generarGuias }))

afterEach(() => vi.unstubAllGlobals())

async function excel(filas: unknown[][]): Promise<File> {
  const libro = new ExcelJS.Workbook()
  const hoja = libro.addWorksheet('Envíos')
  hoja.addRow([
    'N.º guía', 'Remitente *', 'Teléfono remitente *', 'Dirección remitente', 'Destinatario *', 'Teléfono destinatario *',
    'Dirección destinatario *', 'Origen *', 'Destino *', 'Zona', 'Tipo de carga *', 'Cantidad *', 'Peso por unidad (kg) *',
    'Forma de pago *', 'Descripción',
  ])
  filas.forEach((f) => hoja.addRow(f))
  const buffer = await libro.xlsx.writeBuffer()
  return new File([buffer], 'pedidos.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

function servidor() {
  let numero = 50000
  const creados: unknown[] = []
  const fetch = mockFetch((url, init) => {
    if (url.includes('/tipos-carga')) return jsonResponse(TIPOS.map((t) => tipoCargaFixture(t)))
    if (url.includes('/rutas')) return jsonResponse(RUTAS)
    if (url.includes('/ciudades')) return jsonResponse([{ id: 1, nombre: 'Ibarra', activa: true }, { id: 4, nombre: 'Quito', activa: true }])
    if (url.endsWith('/envios') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body))
      creados.push(body)
      if (body.numeroGuia === '777') return jsonResponse({ error: { code: 'CONFLICTO', message: 'Ya existe un envío con la guía 777' } }, 409)
      return jsonResponse({ ...body, id: `e${numero}`, numeroGuia: Number(body.numeroGuia ?? ++numero), items: [] }, 201)
    }
    return jsonResponse([])
  })
  return { fetch, creados }
}

describe('ImportarEnviosDialog', () => {
  it('lee el Excel, marca los errores por celda, permite corregirlos e importa las guías válidas', async () => {
    const { creados } = servidor()
    renderWithProviders(<ImportarEnviosDialog />)
    await userEvent.click(screen.getByRole('button', { name: /Importar/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Importar envíos' })
    expect(within(dialogo).getByRole('list', { name: 'Columnas de la plantilla' })).toHaveTextContent('Remitente *')

    await userEvent.upload(
      within(dialogo).getByLabelText('Archivo de Excel'),
      await excel([
        ['', 'Ana', '0991112233', '', 'Luis', '0994445566', 'Av. Siempre Viva 123', 'Ibarra', 'Quito', '', 'Paquete', 2, 1.5, 'Pagado'],
        ['', 'Eva', '0991112234', '', 'Rosa', '0994445567', 'Calle Larga 45', 'Ibarra', 'Quitoo', '', 'Paquetes', 1, 3, 'Al cobro'],
      ]),
    )

    expect(await within(dialogo).findByText(/pedidos\.xlsx · 2 filas · 2 guías/)).toBeInTheDocument()
    expect(within(dialogo).getByText('1 guía lista')).toBeInTheDocument()
    const destino = within(dialogo).getByRole('combobox', { name: 'Destino, fila 3' })
    expect(destino).toHaveAttribute('aria-invalid', 'true')
    expect(destino).toHaveAttribute('title', 'No hay ruta Ibarra → Quitoo')

    // Corrige la celda en la vista previa.
    await userEvent.clear(destino)
    await userEvent.type(destino, 'Quito')
    expect(destino).toHaveAttribute('aria-invalid', 'false')
    expect(within(dialogo).getByText('2 guías listas')).toBeInTheDocument()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Importar 2 guías' }))
    expect(await within(dialogo).findByText('2 guías creadas')).toBeInTheDocument()
    expect(creados).toEqual([
      expect.objectContaining({ rutaId: 7, formaPago: 'PAGADO', items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 1.5 }] }),
      expect.objectContaining({ destinatario: expect.objectContaining({ nombre: 'Rosa' }), formaPago: 'AL_COBRO' }),
    ])

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Imprimir 2 guías' }))
    expect(generarGuias).toHaveBeenCalledWith([expect.objectContaining({ numeroGuia: 50001 }), expect.objectContaining({ numeroGuia: 50002 })], 'imprimir')
  }, 20_000)

  it('lo que el servidor rechaza queda en la tabla con su motivo para reintentar', async () => {
    servidor()
    renderWithProviders(<ImportarEnviosDialog />)
    await userEvent.click(screen.getByRole('button', { name: /Importar/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Importar envíos' })
    await userEvent.upload(
      within(dialogo).getByLabelText('Archivo de Excel'),
      await excel([
        ['777', 'Ana', '0991112233', '', 'Luis', '0994445566', 'Av. Siempre Viva 123', 'Ibarra', 'Quito', '', 'Sobre', 1, 0.2, 'Pagado'],
        ['', 'Eva', '0991112234', '', 'Rosa', '0994445567', 'Calle Larga 45', 'Ibarra', 'Ibarra', 'Rural', 'Cartón', 1, 3, 'Contrato'],
      ]),
    )
    await userEvent.click(await within(dialogo).findByRole('button', { name: 'Importar 2 guías' }))
    expect(await within(dialogo).findByText('1 guía creada')).toBeInTheDocument()
    expect(within(dialogo).getByText(/1 guía no se pudo crear; quedan 1 fila por revisar/)).toBeInTheDocument()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Revisar y reintentar' }))
    expect(within(dialogo).getByRole('textbox', { name: 'N.º guía, fila 2' })).toHaveValue('777')
    expect(within(dialogo).queryByRole('textbox', { name: 'Remitente, fila 3' })).not.toBeInTheDocument()
    expect(within(dialogo).getByTitle('Ya existe un envío con la guía 777')).toBeInTheDocument()
  }, 20_000)

  it('avisa si el archivo no tiene el formato de la plantilla', async () => {
    servidor()
    renderWithProviders(<ImportarEnviosDialog />)
    await userEvent.click(screen.getByRole('button', { name: /Importar/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Importar envíos' })
    const libro = new ExcelJS.Workbook()
    libro.addWorksheet('Hoja1').addRow(['Cliente', 'Monto'])
    const archivo = new File([await libro.xlsx.writeBuffer()], 'otro.xlsx')
    await userEvent.upload(within(dialogo).getByLabelText('Archivo de Excel'), archivo)
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(/Faltan columnas: Remitente/)
  })
})
