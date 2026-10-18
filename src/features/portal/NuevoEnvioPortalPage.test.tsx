import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { CatalogoPublico, EnvioPortal, ResumenPortal } from '@/types/api'
import { NuevoEnvioPortalPage } from './NuevoEnvioPortalPage'

const generarGuia = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/features/envios/guiaPdf', async (original) => ({
  ...(await original<typeof import('@/features/envios/guiaPdf')>()),
  generarGuia,
}))

afterEach(() => {
  vi.unstubAllGlobals()
  generarGuia.mockClear()
})

const ciudad = (id: number, nombre: string) => ({ id, nombre, activa: true })
const catalogo: CatalogoPublico = {
  ciudades: [ciudad(2, 'Atuntaqui'), ciudad(4, 'Quito')],
  tiposCarga: [{ codigo: 'PAQUETE', nombre: 'Paquete', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 50 }],
  rutas: [{ id: 13, origen: ciudad(2, 'Atuntaqui'), destino: ciudad(4, 'Quito'), tiempoEstimadoMin: 120, activa: true, operativa: true }],
}

const cliente = { id: 'c1', nombre: 'Textiles Atuntaqui', telefono: '0991112233', direccion: 'Sucre 5-12' }
const resumen = { cliente, desde: '2026-10-01', hasta: '2026-10-18', envios: 0, monto: 0, enCurso: 0, entregados: 0, porCobrar: 0, porDia: [], porFormaPago: [], porEstado: {} } as unknown as ResumenPortal

const creado: EnvioPortal = {
  id: 'e9',
  numeroGuia: 40480,
  estado: 'REGISTRADO',
  destinatario: { nombre: 'Almacén El Sol', telefono: '0994445566', direccion: 'Av. 10 de Agosto N20-15' },
  ruta: { id: 13, origen: 'Atuntaqui', destino: 'Quito' },
  zona: 'URBANA',
  items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3, costoUnitario: 3, subtotal: 6 }],
  totalPiezas: 2,
  pesoTotalKg: 6,
  descripcion: null,
  costo: 6,
  formaPago: 'AL_COBRO',
  referenciaExterna: null,
  creadoEn: '2026-10-18T15:00:00.000Z',
  actualizadoEn: '2026-10-18T15:00:00.000Z',
  entrega: null,
  evidencia: null,
}

function servidor() {
  const crear = vi.fn((_body: unknown) => jsonResponse(creado, 201))
  const cotizar = vi.fn((_body: unknown) =>
    jsonResponse({ costo: 6, zona: 'URBANA', totalPiezas: 2, pesoTotalKg: 6, items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3, costoUnitario: 3, subtotal: 6, mayoreo: false }] }),
  )
  mockFetch((url, init) => {
    if (url.endsWith('/portal/catalogo')) return jsonResponse(catalogo)
    if (url.includes('/portal/resumen')) return jsonResponse(resumen)
    if (url.endsWith('/portal/cotizar')) return cotizar(JSON.parse(init!.body as string))
    if (url.endsWith('/portal/envios') && init?.method === 'POST') return crear(JSON.parse(init.body as string))
    return jsonResponse({}, 404)
  })
  return { crear, cotizar }
}

describe('NuevoEnvioPortalPage', () => {
  it('cotiza en vivo con /portal/cotizar, crea el envío y ofrece imprimir la guía con la empresa como remitente', async () => {
    const { crear, cotizar } = servidor()
    const user = userEvent.setup()
    renderWithProviders(<NuevoEnvioPortalPage />)

    expect(await screen.findByText(/Remitente: Textiles Atuntaqui/)).toBeInTheDocument()
    await user.type(await screen.findByLabelText('Nombre'), 'Almacén El Sol')
    await user.type(screen.getByLabelText('Teléfono'), '0994445566')
    await user.type(screen.getByLabelText('Dirección de entrega'), 'Av. 10 de Agosto N20-15')

    await user.click(screen.getByRole('combobox', { name: 'Ruta' }))
    await user.click(await screen.findByRole('option', { name: /Atuntaqui.*Quito/ }))
    await user.click(screen.getByRole('combobox', { name: 'Tipo del ítem 1' }))
    await user.click(await screen.findByRole('option', { name: /Paquete/ }))
    await user.clear(screen.getByLabelText('Cantidad del ítem 1'))
    await user.type(screen.getByLabelText('Cantidad del ítem 1'), '2')
    await user.type(screen.getByLabelText('Peso por unidad del ítem 1'), '3')
    await user.click(screen.getByRole('radio', { name: /Al cobro/ }))

    expect(await screen.findByTestId('cotizacion-total')).toHaveTextContent('6,00')
    expect(cotizar).toHaveBeenLastCalledWith({ rutaId: 13, items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3 }], zona: 'URBANA' })

    await user.click(screen.getByRole('button', { name: 'Crear envío' }))
    await vi.waitFor(() => expect(crear).toHaveBeenCalledTimes(1))
    expect(crear.mock.calls[0]![0]).toEqual({
      destinatario: { nombre: 'Almacén El Sol', telefono: '0994445566', direccion: 'Av. 10 de Agosto N20-15' },
      rutaId: 13,
      items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3 }],
      zona: 'URBANA',
      formaPago: 'AL_COBRO',
    })

    const listo = await screen.findByRole('status', { name: 'Envío creado' })
    expect(within(listo).getByText('40480')).toBeInTheDocument()
    await user.click(within(listo).getByRole('button', { name: 'Imprimir guía' }))
    await vi.waitFor(() => expect(generarGuia).toHaveBeenCalledTimes(1))
    const [envio, accion] = generarGuia.mock.calls[0] as unknown as [{ remitente: unknown; numeroGuia: number }, string]
    expect(accion).toBe('imprimir')
    expect(envio.numeroGuia).toBe(40480)
    expect(envio.remitente).toEqual({ nombre: 'Textiles Atuntaqui', telefono: '0991112233', direccion: 'Sucre 5-12' })
  })

  it('valida destinatario, ruta e ítems antes de crear', async () => {
    const { crear } = servidor()
    renderWithProviders(<NuevoEnvioPortalPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Crear envío' }))
    expect(await screen.findByText('Escribe el nombre de quien recibe')).toBeInTheDocument()
    expect(screen.getByText('Selecciona una ruta')).toBeInTheDocument()
    expect(crear).not.toHaveBeenCalled()
  })
})
