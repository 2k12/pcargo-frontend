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
  guiaFisica: null,
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
  reparto('e1', 40461, 'EN_REPARTO', { formaPago: 'AL_COBRO', porCobrar: 12.5, guiaFisica: 501 }),
  reparto('e2', 40462, 'EN_TRANSITO', { ruta: { id: 2, origen: 'Ibarra', destino: 'Otavalo' } }),
]

type Llamada = { url: string; method: string; body: unknown }

const entregadoEn = { resultado: 'ENTREGADO' as const, fecha: '2026-10-18T15:00:00.000Z', operador: null, nota: null }
const hoy = [
  // Entregado sin nada: falta el nombre y la foto.
  reparto('h1', 40471, 'ENTREGADO', { entrega: entregadoEn }),
  // Solo foto: la evidencia existe sin nombre.
  reparto('h2', 40472, 'ENTREGADO', { entrega: entregadoEn, evidencia: { recibidoPor: null, conFoto: true, subidaEn: '2026-10-18T15:01:00.000Z' } }),
  // Con nombre: se puede editar.
  reparto('h3', 40473, 'ENTREGADO', { entrega: entregadoEn, evidencia: { recibidoPor: 'Rosa Vega', conFoto: true, subidaEn: '2026-10-18T15:02:00.000Z' } }),
]

function servidor() {
  const llamadas: Llamada[] = []
  mockFetch((url, init) => {
    const method = init?.method ?? 'GET'
    const body = init?.body instanceof FormData ? init.body : init?.body ? JSON.parse(init.body as string) : undefined
    if (method !== 'GET') llamadas.push({ url, method, body })
    if (url.includes('/repartidor/envios?vista=pendientes')) return jsonResponse(pendientes)
    if (url.includes('/repartidor/envios?vista=hoy')) return jsonResponse(hoy)
    const ev = /\/repartidor\/envios\/(h\d)\/evidencia$/.exec(url)
    if (ev && method === 'POST') return jsonResponse(hoy.find((h) => h.id === ev[1]))
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
    // Contrato v21: la guía física antigua junto al número del sistema; sin ella no se muestra nada.
    expect(within(tarjeta).getByTestId('guia-fisica')).toHaveTextContent('física 0000501')
    expect(within(screen.getByRole('article', { name: 'Guía 40462' })).queryByTestId('guia-fisica')).not.toBeInTheDocument()
    expect(within(tarjeta).getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:0994445566')
    expect(within(tarjeta).getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/593994445566\?text=/)
    expect(within(tarjeta).getByRole('link', { name: /Av\. Amazonas/ }).getAttribute('href')).toContain('google.com/maps/search')
    expect(screen.getByText(/2 entregas/)).toBeInTheDocument()
  })

  it('«Entregado» con nombre y foto: marca ENTREGADO y después guarda ambos como evidencia', async () => {
    const llamadas = servidor()
    const user = userEvent.setup()
    renderWithProviders(<EntregasPage vista="pendientes" />)
    const tarjeta = await screen.findByRole('article', { name: 'Guía 40461' })
    await user.click(within(tarjeta).getByRole('button', { name: 'Entregado' }))

    const hoja = await screen.findByRole('dialog')
    expect(within(hoja).getByText(/Cobra .*12,50/)).toBeInTheDocument()
    // Si se escribe, el nombre necesita al menos 2 letras.
    await user.type(within(hoja).getByLabelText(/¿Quién recibe\?/), 'M')
    await user.click(within(hoja).getByRole('button', { name: 'Confirmar entrega' }))
    expect(await within(hoja).findByText(/mínimo 2 caracteres/)).toBeInTheDocument()
    expect(llamadas).toHaveLength(0)

    const input = within(hoja).getByLabelText('Foto de la guía firmada')
    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).toHaveAttribute('capture', 'environment')
    await user.upload(input, new File(['foto'], 'guia.jpg', { type: 'image/jpeg' }))
    expect(within(hoja).getByText('Foto lista')).toBeInTheDocument()
    await user.type(within(hoja).getByLabelText(/¿Quién recibe\?/), 'aría Pérez')
    await user.click(within(hoja).getByRole('button', { name: 'Confirmar entrega' }))

    await vi.waitFor(() => expect(llamadas).toHaveLength(2))
    // El nombre ya no va en la nota: se guarda como evidencia (v19).
    expect(llamadas[0]).toMatchObject({ method: 'PATCH', body: { estado: 'ENTREGADO' } })
    expect((llamadas[0]!.body as { nota?: string }).nota).toBeUndefined()
    expect(llamadas[0]!.url).toMatch(/\/repartidor\/envios\/e1\/estado$/)
    expect(llamadas[1]!.url).toMatch(/\/repartidor\/envios\/e1\/evidencia$/)
    const fd = llamadas[1]!.body as FormData
    expect(fd.get('recibidoPor')).toBe('María Pérez')
    expect(fd.get('foto')).toBeInstanceOf(File)
  })

  it('«Entregado» sin nombre ni foto: solo marca ENTREGADO, sin evidencia (v19)', async () => {
    const llamadas = servidor()
    const user = userEvent.setup()
    renderWithProviders(<EntregasPage vista="pendientes" />)
    const tarjeta = await screen.findByRole('article', { name: 'Guía 40461' })
    await user.click(within(tarjeta).getByRole('button', { name: 'Entregado' }))
    const hoja = await screen.findByRole('dialog')
    await user.click(within(hoja).getByRole('button', { name: 'Confirmar entrega' }))

    await vi.waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]).toMatchObject({ method: 'PATCH', body: { estado: 'ENTREGADO' } })
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(llamadas.some((l) => l.url.endsWith('/evidencia'))).toBe(false)
  })

  it('«Entregado» solo con nombre: la evidencia lleva el nombre y no la foto (v19)', async () => {
    const llamadas = servidor()
    const user = userEvent.setup()
    renderWithProviders(<EntregasPage vista="pendientes" />)
    const tarjeta = await screen.findByRole('article', { name: 'Guía 40461' })
    await user.click(within(tarjeta).getByRole('button', { name: 'Entregado' }))
    const hoja = await screen.findByRole('dialog')
    await user.type(within(hoja).getByLabelText(/¿Quién recibe\?/), 'Luis Andrade')
    await user.click(within(hoja).getByRole('button', { name: 'Confirmar entrega' }))

    await vi.waitFor(() => expect(llamadas).toHaveLength(2))
    const fd = llamadas[1]!.body as FormData
    expect(fd.get('recibidoPor')).toBe('Luis Andrade')
    expect(fd.has('foto')).toBe(false)
  })

  it('«Hoy» indica qué falta y no muestra "null" en las entregas sin nombre', async () => {
    servidor()
    renderWithProviders(<EntregasPage vista="hoy" />)
    const sinNada = await screen.findByRole('article', { name: 'Guía 40471' })
    expect(within(sinNada).getByText('Falta nombre')).toBeInTheDocument()
    expect(within(sinNada).getByText('Falta foto')).toBeInTheDocument()
    expect(within(sinNada).getByRole('button', { name: 'Completar entrega' })).toBeInTheDocument()

    const soloFoto = screen.getByRole('article', { name: 'Guía 40472' })
    expect(within(soloFoto).getByText('Falta nombre')).toBeInTheDocument()
    expect(within(soloFoto).queryByText('Falta foto')).not.toBeInTheDocument()
    expect(soloFoto).not.toHaveTextContent('null')

    const conNombre = screen.getByRole('article', { name: 'Guía 40473' })
    expect(within(conNombre).getByText(/recibió Rosa Vega/)).toBeInTheDocument()
    expect(within(conNombre).queryByText(/^Falta/)).not.toBeInTheDocument()
    expect(within(conNombre).getByRole('button', { name: 'Editar entrega' })).toBeInTheDocument()
  })

  it('«Completar entrega» guarda luego solo el nombre (v19)', async () => {
    const llamadas = servidor()
    const user = userEvent.setup()
    renderWithProviders(<EntregasPage vista="hoy" />)
    const tarjeta = await screen.findByRole('article', { name: 'Guía 40471' })
    await user.click(within(tarjeta).getByRole('button', { name: 'Completar entrega' }))
    const hoja = await screen.findByRole('dialog')

    // Sin nombre ni foto no hay nada que guardar.
    await user.click(within(hoja).getByRole('button', { name: 'Guardar' }))
    expect(await within(hoja).findByText('Escribe quién recibió o toma la foto de la guía firmada')).toBeInTheDocument()
    expect(llamadas).toHaveLength(0)

    await user.type(within(hoja).getByLabelText('¿Quién recibió?'), 'Carmen Ruiz')
    await user.click(within(hoja).getByRole('button', { name: 'Guardar' }))
    await vi.waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]!.url).toMatch(/\/repartidor\/envios\/h1\/evidencia$/)
    const fd = llamadas[0]!.body as FormData
    expect(fd.get('recibidoPor')).toBe('Carmen Ruiz')
    expect(fd.has('foto')).toBe(false)
  })

  it('«Completar entrega» guarda luego solo la foto (v19)', async () => {
    const llamadas = servidor()
    const user = userEvent.setup()
    renderWithProviders(<EntregasPage vista="hoy" />)
    const tarjeta = await screen.findByRole('article', { name: 'Guía 40471' })
    await user.click(within(tarjeta).getByRole('button', { name: 'Completar entrega' }))
    const hoja = await screen.findByRole('dialog')
    await user.upload(within(hoja).getByLabelText('Foto de la guía firmada'), new File(['foto'], 'guia.jpg', { type: 'image/jpeg' }))
    await user.click(within(hoja).getByRole('button', { name: 'Guardar' }))

    await vi.waitFor(() => expect(llamadas).toHaveLength(1))
    const fd = llamadas[0]!.body as FormData
    expect(fd.has('recibidoPor')).toBe(false)
    expect(fd.get('foto')).toBeInstanceOf(File)
  })

  it('«Editar entrega» trae el nombre actual y solo envía lo que cambió', async () => {
    const llamadas = servidor()
    const user = userEvent.setup()
    renderWithProviders(<EntregasPage vista="hoy" />)
    const tarjeta = await screen.findByRole('article', { name: 'Guía 40473' })
    await user.click(within(tarjeta).getByRole('button', { name: 'Editar entrega' }))
    const hoja = await screen.findByRole('dialog')
    const nombre = within(hoja).getByLabelText('¿Quién recibió?')
    expect(nombre).toHaveValue('Rosa Vega')

    await user.click(within(hoja).getByRole('button', { name: 'Guardar' }))
    expect(await within(hoja).findByText('No hay cambios para guardar')).toBeInTheDocument()
    expect(llamadas).toHaveLength(0)

    await user.clear(nombre)
    await user.type(nombre, 'Rosa María Vega')
    await user.click(within(hoja).getByRole('button', { name: 'Guardar' }))
    await vi.waitFor(() => expect(llamadas).toHaveLength(1))
    expect((llamadas[0]!.body as FormData).get('recibidoPor')).toBe('Rosa María Vega')
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
