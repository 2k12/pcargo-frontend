import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { EnvioPortal } from '@/types/api'
import { EnviosPortalPage } from './EnviosPortalPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const envio: EnvioPortal = {
  id: 'e1',
  numeroGuia: 40470,
  estado: 'ENTREGADO',
  destinatario: { nombre: 'Almacén El Sol', telefono: '0994445566', direccion: 'Av. 10 de Agosto, Quito' },
  ruta: { id: 13, origen: 'Atuntaqui', destino: 'Quito' },
  zona: 'URBANA',
  items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3, costoUnitario: 3, subtotal: 6 }],
  totalPiezas: 2,
  pesoTotalKg: 6,
  descripcion: null,
  costo: 6,
  formaPago: 'CONTRATO',
  referenciaExterna: null,
  creadoEn: '2026-10-18T13:00:00.000Z',
  actualizadoEn: '2026-10-18T18:00:00.000Z',
  entrega: { resultado: 'ENTREGADO', fecha: '2026-10-18T18:00:00.000Z', nota: null },
  evidencia: { recibidoPor: 'María Pérez', subidaEn: '2026-10-18T18:01:00.000Z' },
}

const resumen = { cliente: { id: 'c1', nombre: 'Textiles Atuntaqui', telefono: '0991112233', direccion: null }, porDia: [], porFormaPago: [] }

describe('EnviosPortalPage', () => {
  it('lista los envíos con filtro de estado y abre el detalle con historial, quién recibió y la guía', async () => {
    const fetch = mockFetch((url) => {
      if (url.includes('/portal/resumen')) return jsonResponse(resumen)
      if (url.endsWith('/portal/envios/e1'))
        return jsonResponse({
          ...envio,
          historial: [
            { estado: 'REGISTRADO', nota: 'Registrado desde el portal de clientes', fecha: '2026-10-18T13:00:00.000Z' },
            { estado: 'ENTREGADO', nota: null, fecha: '2026-10-18T18:00:00.000Z' },
          ],
        })
      if (url.includes('/portal/envios')) return jsonResponse({ datos: [envio], pagina: 1, porPagina: 20, total: 1, totalPaginas: 1 })
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderWithProviders(<EnviosPortalPage />, { route: '/portal/envios', path: '/portal/envios' })

    const fila = await screen.findByRole('row', { name: /Almacén El Sol/ })
    expect(within(fila).getByText('Recibió María Pérez')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Filtrar por estado' }))
    await user.click(await screen.findByRole('option', { name: 'Entregado' }))
    await vi.waitFor(() =>
      expect(fetch.mock.calls.map(([u]) => String(u)).some((u) => u.includes('/portal/envios?estado=ENTREGADO'))).toBe(true),
    )

    await user.click(screen.getByRole('row', { name: /Almacén El Sol/ }))
    const detalle = await screen.findByRole('dialog')
    expect(await within(detalle).findByText('Guía 40470')).toBeInTheDocument()
    expect(within(detalle).getByTestId('recibido-por')).toHaveTextContent('María Pérez')
    expect(within(detalle).getByText('Registrado desde el portal de clientes')).toBeInTheDocument()
    expect(within(detalle).getByRole('button', { name: /Imprimir guía/ })).toBeInTheDocument()
  })
})
