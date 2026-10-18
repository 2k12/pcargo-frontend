import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { EnvioReparto, Estado } from '@/types/api'
import { EntregasPage } from './EntregasPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const reparto = (id: string, numeroGuia: number, estado: Estado, extra: Partial<EnvioReparto> = {}): EnvioReparto => ({
  id,
  numeroGuia,
  estado,
  remitente: { nombre: 'Textiles Atuntaqui', telefono: '0991112233', direccion: null },
  destinatario: { nombre: `Cliente ${numeroGuia}`, telefono: '0994445566', direccion: 'Av. Amazonas N20-15' },
  ruta: { id: 1, origen: 'Ibarra', destino: 'Quito' },
  zona: 'URBANA',
  items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3 }],
  totalPiezas: 2,
  pesoTotalKg: 6,
  descripcion: null,
  formaPago: 'CONTRATO',
  costo: 6,
  porCobrar: 0,
  entrega: null,
  evidencia: null,
  asignadoEn: '2026-10-18T08:00:00.000Z',
  actualizadoEn: '2026-10-18T08:00:00.000Z',
  ...extra,
})

const pendientes = [
  reparto('e1', 40461, 'EN_REPARTO', { formaPago: 'AL_COBRO', porCobrar: 12.5 }),
  reparto('e2', 40462, 'EN_TRANSITO', { ruta: { id: 2, origen: 'Ibarra', destino: 'Otavalo' } }),
]

type Llamada = { url: string; method: string; body: unknown }

function servidor() {
  const llamadas: Llamada[] = []
  mockFetch((url, init) => {
    const method = init?.method ?? 'GET'
    const body = init?.body instanceof FormData ? init.body : init?.body ? JSON.parse(init.body as string) : undefined
    if (method !== 'GET') llamadas.push({ url, method, body })
    if (url.includes('/repartidor/envios?vista=pendientes')) return jsonResponse(pendientes)
    const estado = /\/repartidor\/envios\/(\w+)\/estado$/.exec(url)
    if (estado && method === 'PATCH') {
      const e = pendientes.find((p) => p.id === estado[1])!
      return jsonResponse({ ...e, estado: (body as { estado: Estado }).estado })
    }
    if (/\/repartidor\/envios\/e1\/evidencia$/.test(url)) return jsonResponse({ ...pendientes[0], estado: 'ENTREGADO' })
    return jsonResponse([])
  })
  return llamadas
}

describe('EntregasPage — app del repartidor', () => {
  it('agrupa por destino y muestra contacto, mapa y lo que hay que cobrar', async () => {
    servidor()
    renderWithProviders(<EntregasPage vista="pendientes" />)
    const quito = await screen.findByRole('region', { name: 'Destino Quito' })
    expect(screen.getByRole('region', { name: 'Destino Otavalo' })).toBeInTheDocument()
    const tarjeta = within(quito).getByRole('article', { name: 'Guía 40461' })
    expect(within(tarjeta).getByText(/Cobrar .*12,50/)).toBeInTheDocument()
    expect(within(tarjeta).getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:0994445566')
    expect(within(tarjeta).getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/593994445566\?text=/)
    expect(within(tarjeta).getByRole('link', { name: /Av\. Amazonas/ }).getAttribute('href')).toContain('google.com/maps/search')
    expect(screen.getByText(/2 entregas/)).toBeInTheDocument()
  })

  it('«Entregado» pide quién recibe, marca ENTREGADO y después sube la foto', async () => {
    const llamadas = servidor()
    const user = userEvent.setup()
    renderWithProviders(<EntregasPage vista="pendientes" />)
    const tarjeta = await screen.findByRole('article', { name: 'Guía 40461' })
    await user.click(within(tarjeta).getByRole('button', { name: 'Entregado' }))

    const hoja = await screen.findByRole('dialog')
    expect(within(hoja).getByText(/Cobra .*12,50/)).toBeInTheDocument()
    await user.click(within(hoja).getByRole('button', { name: 'Confirmar entrega' }))
    expect(await within(hoja).findByText(/Escribe quién recibe/)).toBeInTheDocument()
    expect(llamadas).toHaveLength(0)

    const input = within(hoja).getByLabelText('Foto de la guía firmada')
    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).toHaveAttribute('capture', 'environment')
    await user.upload(input, new File(['foto'], 'guia.jpg', { type: 'image/jpeg' }))
    expect(within(hoja).getByText('Foto lista')).toBeInTheDocument()
    await user.type(within(hoja).getByLabelText('¿Quién recibe?'), 'María Pérez')
    await user.click(within(hoja).getByRole('button', { name: 'Confirmar entrega' }))

    await vi.waitFor(() => expect(llamadas).toHaveLength(2))
    expect(llamadas[0]).toMatchObject({ method: 'PATCH', body: { estado: 'ENTREGADO', nota: 'Recibió: María Pérez' } })
    expect(llamadas[0]!.url).toMatch(/\/repartidor\/envios\/e1\/estado$/)
    expect(llamadas[1]!.url).toMatch(/\/repartidor\/envios\/e1\/evidencia$/)
    const fd = llamadas[1]!.body as FormData
    expect(fd.get('recibidoPor')).toBe('María Pérez')
    expect(fd.get('foto')).toBeInstanceOf(File)
  })

  it('«No entregado» exige el motivo', async () => {
    const llamadas = servidor()
    const user = userEvent.setup()
    renderWithProviders(<EntregasPage vista="pendientes" />)
    const tarjeta = await screen.findByRole('article', { name: 'Guía 40461' })
    await user.click(within(tarjeta).getByRole('button', { name: 'No entregado' }))
    const hoja = await screen.findByRole('dialog')
    await user.click(within(hoja).getByRole('button', { name: 'Guardar no entregado' }))
    expect(within(hoja).getByText('Escribe el motivo')).toBeInTheDocument()
    expect(llamadas).toHaveLength(0)

    await user.click(within(hoja).getByRole('button', { name: 'No hay nadie' }))
    await user.click(within(hoja).getByRole('button', { name: 'Guardar no entregado' }))
    await vi.waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]).toMatchObject({ method: 'PATCH', body: { estado: 'NO_ENTREGADO', nota: 'No hay nadie' } })
  })

  it('un envío en tránsito ofrece «Salir a reparto»', async () => {
    const llamadas = servidor()
    renderWithProviders(<EntregasPage vista="pendientes" />)
    const tarjeta = await screen.findByRole('article', { name: 'Guía 40462' })
    expect(within(tarjeta).queryByRole('button', { name: 'Entregado' })).not.toBeInTheDocument()
    await userEvent.click(within(tarjeta).getByRole('button', { name: 'Salir a reparto' }))
    await vi.waitFor(() => expect(llamadas[0]).toMatchObject({ method: 'PATCH', body: { estado: 'EN_REPARTO' } }))
  })
})
