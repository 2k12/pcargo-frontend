import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { tokenStorage } from '@/lib/api'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Envio, EvidenciaEntrega } from '@/types/api'
import { PruebaEntrega } from './PruebaEntrega'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

const crear = vi.fn(() => 'blob:evidencia-1')
const revocar = vi.fn()

beforeEach(() => {
  URL.createObjectURL = crear
  URL.revokeObjectURL = revocar
})

afterEach(() => {
  vi.unstubAllGlobals()
  crear.mockClear()
  revocar.mockClear()
})

const evidencia: EvidenciaEntrega = {
  recibidoPor: 'María Andrade',
  tipo: 'image/jpeg',
  bytes: 120_000,
  subidaEn: '2026-10-08T15:10:00.000Z',
  subidaPor: 'Repartidor Quito',
}

const entregado: Envio = {
  id: 'e1',
  numeroGuia: 40461,
  clienteId: null,
  remitente: { nombre: 'Ana', telefono: '0991112233', direccion: null },
  destinatario: { nombre: 'Luis', telefono: '0994445566', direccion: 'Quito centro' },
  ruta: { id: 11, origen: 'Ibarra', destino: 'Quito' },
  items: [{ tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 0.2, costoUnitario: 3, subtotal: 3 }],
  totalPiezas: 1,
  pesoTotalKg: 0.2,
  zona: 'URBANA',
  descripcion: null,
  costo: 3,
  costoAdicional: 0,
  formaPago: 'PAGADO',
  estado: 'ENTREGADO',
  fechaGuia: '2026-10-07',
  registro: { fecha: '2026-10-08T03:00:00.000Z', operador: 'Operador' },
  entrega: { resultado: 'ENTREGADO', fecha: '2026-10-08T15:05:00.000Z', operador: 'Repartidor Quito', nota: null },
  evidencia: null,
  origen: { canal: 'PANEL', integracionId: null, integracion: null },
  referenciaExterna: null,
  creadoEn: '2026-10-08T03:00:00.000Z',
  actualizadoEn: '2026-10-08T15:05:00.000Z',
  repartidor: null,
  asignadoEn: null,
  anonimizadoEn: null,
}

const foto = (tipo = 'image/jpeg', nombre = 'guia.jpg') => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], nombre, { type: tipo })

function renderizar(envio: Envio, handler: Parameters<typeof mockFetch>[0] = () => jsonResponse({})) {
  const fetchMock = mockFetch(handler)
  const vista = renderWithProviders(
    <>
      <PruebaEntrega envio={envio} />
      <Toaster />
    </>,
  )
  return { fetchMock, ...vista }
}

const posts = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith('/evidencia') && init?.method === 'POST')

describe('PruebaEntrega — formulario', () => {
  it('no aparece si el envío no está entregado ni tiene evidencia', () => {
    renderizar({ ...entregado, estado: 'EN_REPARTO', entrega: null })
    expect(screen.queryByRole('region', { name: 'Prueba de entrega' })).not.toBeInTheDocument()
  })

  it('valida nombre (2–120) y foto obligatoria antes de subir', async () => {
    const { fetchMock } = renderizar(entregado)
    await userEvent.type(screen.getByLabelText('Nombre de quien recibió'), 'A')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))

    expect(await screen.findByText('Escribe el nombre de quien recibió (mínimo 2 caracteres)')).toBeInTheDocument()
    expect(screen.getByText('Toma o elige la foto de la guía firmada')).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(0)
  })

  it('rechaza archivos que no son JPG, PNG o WebP', async () => {
    const { fetchMock } = renderizar(entregado)
    await userEvent.type(screen.getByLabelText('Nombre de quien recibió'), 'María Andrade')
    fireEvent.change(screen.getByLabelText('Foto de la guía firmada'), {
      target: { files: [foto('application/pdf', 'guia.pdf')] },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))
    expect(await screen.findByText('La foto debe ser JPG, PNG o WebP')).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(0)
  })

  it('el selector abre la cámara trasera en el celular y solo admite imágenes', () => {
    renderizar(entregado)
    const input = screen.getByLabelText('Foto de la guía firmada')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(input).toHaveAttribute('capture', 'environment')
  })

  it('sube FormData con la foto y el nombre, con el token', async () => {
    tokenStorage.set('tok-123')
    const { fetchMock } = renderizar(entregado, (url, init) =>
      url.endsWith('/envios/e1/evidencia') && init?.method === 'POST'
        ? jsonResponse({ ...entregado, evidencia, historial: [] })
        : jsonResponse({}),
    )
    await userEvent.type(screen.getByLabelText('Nombre de quien recibió'), '  María Andrade ')
    await userEvent.upload(screen.getByLabelText('Foto de la guía firmada'), foto())
    expect(screen.getByText('guia.jpg')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1))
    const [url, init] = posts(fetchMock)[0]!
    expect(url).toBe('/api/envios/e1/evidencia')
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok-123')
    expect((init!.headers as Record<string, string>)['Content-Type']).toBeUndefined()
    const body = init!.body as FormData
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('recibidoPor')).toBe('María Andrade')
    const enviado = body.get('foto') as File
    expect(enviado.name).toBe('guia.jpg')
    expect(enviado.type).toBe('image/jpeg')
    expect(await screen.findByText('Prueba de entrega guardada')).toBeInTheDocument()
  })

  it('muestra un aviso claro con 422 ESTADO_INVALIDO', async () => {
    renderizar(entregado, (_url, init) =>
      init?.method === 'POST'
        ? jsonResponse({ error: { code: 'ESTADO_INVALIDO', message: 'El envío no está entregado' } }, 422)
        : jsonResponse({}),
    )
    await userEvent.type(screen.getByLabelText('Nombre de quien recibió'), 'María Andrade')
    await userEvent.upload(screen.getByLabelText('Foto de la guía firmada'), foto())
    await userEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))
    expect(await screen.findByText(/Solo se puede subir la prueba de un envío entregado/)).toBeInTheDocument()
  })

  it('muestra el detalle del servidor con 400 VALIDACION', async () => {
    renderizar(entregado, (_url, init) =>
      init?.method === 'POST'
        ? jsonResponse({ error: { code: 'VALIDACION', message: 'El archivo no es una imagen válida' } }, 400)
        : jsonResponse({}),
    )
    await userEvent.type(screen.getByLabelText('Nombre de quien recibió'), 'María Andrade')
    await userEvent.upload(screen.getByLabelText('Foto de la guía firmada'), foto())
    await userEvent.click(screen.getByRole('button', { name: 'Guardar prueba' }))
    expect(await screen.findByText('Revisa la foto y el nombre: El archivo no es una imagen válida')).toBeInTheDocument()
  })
})

describe('PruebaEntrega — con evidencia', () => {
  const conEvidencia: Envio = { ...entregado, evidencia }
  const imagen = () =>
    new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), { status: 200, headers: { 'Content-Type': 'image/jpeg' } })

  it('muestra quién recibió, la fecha, el operador y la miniatura descargada con el token', async () => {
    tokenStorage.set('tok-123')
    const { fetchMock, unmount } = renderizar(conEvidencia, (url) => (url.endsWith('/evidencia') ? imagen() : jsonResponse({})))
    const seccion = screen.getByRole('region', { name: 'Prueba de entrega' })
    expect(within(seccion).getByText('María Andrade')).toBeInTheDocument()
    expect(within(seccion).getByText(/Repartidor Quito/)).toBeInTheDocument()

    const miniatura = await within(seccion).findByRole('img', { name: 'Guía firmada por María Andrade' })
    expect(miniatura).toHaveAttribute('src', 'blob:evidencia-1')
    const [url, init] = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/evidencia'))!
    expect(url).toBe('/api/envios/e1/evidencia')
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok-123')

    // Clic: se abre en grande.
    await userEvent.click(within(seccion).getByRole('button', { name: 'Ver foto de la guía firmada en grande' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Guía 40461 firmada')

    unmount()
    expect(revocar).toHaveBeenCalledWith('blob:evidencia-1')
  })

  it('«Reemplazar foto» abre el formulario con el nombre actual', async () => {
    renderizar(conEvidencia, (url) => (url.endsWith('/evidencia') ? imagen() : jsonResponse({})))
    await userEvent.click(screen.getByRole('button', { name: 'Reemplazar foto' }))
    expect(screen.getByLabelText('Nombre de quien recibió')).toHaveValue('María Andrade')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('button', { name: 'Reemplazar foto' })).toBeInTheDocument()
  })
})
