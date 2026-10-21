import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Envio, Pagina } from '@/types/api'
import { ReportesPage } from './ReportesPage'

const crearReportePdf = vi.fn(async (titulo: string, _fecha: string, _envios: Envio[]) => ({
  blob: new Blob(['%PDF']),
  nombreArchivo: 'reporte.pdf',
  titulo,
}))
const compartirPdf = vi.fn(async () => 'compartido' as const)

vi.mock('./reportePdf', () => ({
  crearReportePdf: (titulo: string, fecha: string, envios: Envio[]) => crearReportePdf(titulo, fecha, envios),
  compartirPdf: () => compartirPdf(),
  MENSAJE_ERROR_REPORTE: 'error',
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

const envio = (numeroGuia: number, costo: number, extra: Partial<Envio> = {}) =>
  ({
    id: `e${numeroGuia}`,
    numeroGuia,
    costo,
    formaPago: 'PAGADO',
    estado: 'REGISTRADO',
    remitente: { nombre: 'Ana', telefono: '0991112233', direccion: null },
    destinatario: { nombre: `Destinatario ${numeroGuia}`, telefono: '0994445566', direccion: 'Quito centro' },
    ruta: { id: 7, origen: 'Ibarra', destino: 'Quito' },
    ...extra,
  }) as unknown as Envio

const pagina = (datos: Envio[]): Pagina<Envio> => ({ datos, pagina: 1, porPagina: 100, total: datos.length, totalPaginas: datos.length ? 1 : 0 })

function servidor(delDia: Envio[], otras: Envio[] = []) {
  return mockFetch((url) => {
    const u = new URL(url, 'http://x')
    if (u.pathname.endsWith('/envios') && u.searchParams.get('desde')) return jsonResponse(pagina(delDia))
    if (u.pathname.endsWith('/envios') && u.searchParams.get('q')) {
      return jsonResponse(pagina(otras.filter((e) => String(e.numeroGuia) === u.searchParams.get('q'))))
    }
    return jsonResponse({ error: { code: 'NO_ENCONTRADO', message: 'no' } }, 404)
  })
}

const guias = () =>
  within(screen.getByRole('list', { name: 'Orden de las guías' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent?.match(/\d{7}(?=\D)/)?.[0])

describe('ReportesPage', () => {
  it('carga las guías del día (sin las canceladas), en orden de número, con el total', async () => {
    const fetch = servidor([envio(40462, 3.5), envio(40460, 12), envio(40461, 5, { estado: 'CANCELADO' })])
    renderWithProviders(<ReportesPage />)
    await waitFor(() => expect(guias()).toEqual(['0040460', '0040462']))
    const consulta = new URL(String(fetch.mock.calls[0]![0]), 'http://x').searchParams
    expect(consulta.get('desde')).toBe(consulta.get('hasta'))
    const totales = screen.getByRole('region', { name: 'Totales' })
    expect(within(totales).getByText('2')).toBeInTheDocument()
    expect(within(totales).getByText(/15,50/)).toBeInTheDocument()
  })

  it('permite cambiar el orden, quitar guías y agregar otra por su número antes de enviar', async () => {
    const user = userEvent.setup()
    servidor([envio(40460, 12), envio(40461, 5), envio(40462, 3.5)], [envio(39999, 1)])
    renderWithProviders(<ReportesPage />)
    await waitFor(() => expect(guias()).toEqual(['0040460', '0040461', '0040462']))

    await user.click(screen.getByRole('button', { name: 'Subir la guía 0040462' }))
    await user.click(screen.getByRole('button', { name: 'Subir la guía 0040462' }))
    expect(guias()).toEqual(['0040462', '0040460', '0040461'])
    await user.click(screen.getByRole('button', { name: 'Bajar la guía 0040462' }))
    expect(guias()).toEqual(['0040460', '0040462', '0040461'])

    await user.click(screen.getByRole('button', { name: 'Quitar la guía 0040461' }))
    await user.type(screen.getByRole('textbox', { name: 'Número de guía para agregar' }), '0039999')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    await waitFor(() => expect(guias()).toEqual(['0040460', '0040462', '0039999']))

    const nombre = screen.getByLabelText('Nombre del reporte')
    await user.clear(nombre)
    await user.type(nombre, 'Cierre del martes')
    await user.click(screen.getByRole('button', { name: /Enviar reporte/ }))

    await waitFor(() => expect(compartirPdf).toHaveBeenCalled())
    const [titulo, , enviadas] = crearReportePdf.mock.calls[0]!
    expect(titulo).toBe('Cierre del martes')
    expect(enviadas.map((e) => e.numeroGuia)).toEqual([40460, 40462, 39999])
    expect(within(screen.getByRole('region', { name: 'Totales' })).getByText(/16,50/)).toBeInTheDocument()
  })

  it('avisa si la guía que se quiere agregar no existe o ya está', async () => {
    const user = userEvent.setup()
    servidor([envio(40460, 12)], [envio(40460, 12)])
    renderWithProviders(<ReportesPage />)
    await waitFor(() => expect(guias()).toEqual(['0040460']))
    const campo = screen.getByRole('textbox', { name: 'Número de guía para agregar' })
    await user.type(campo, '40460')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('Esa guía ya está en el reporte')).toBeInTheDocument()
    await user.clear(campo)
    await user.type(campo, '123')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('No existe la guía 0000123')).toBeInTheDocument()
  })

  it('sin guías ese día no deja enviar', async () => {
    servidor([])
    renderWithProviders(<ReportesPage />)
    expect(await screen.findByText(/No hay guías registradas ese día/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar reporte/ })).toBeDisabled()
  })
})
