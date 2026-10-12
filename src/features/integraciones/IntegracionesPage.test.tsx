import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOKEN_KEY } from '@/lib/api'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { ApiKey, Ciudad, EntregaWebhook, Integracion, Pagina, SolicitudApi } from '@/types/api'
import { IntegracionDetallePage } from './IntegracionDetallePage'
import { IntegracionesPage } from './IntegracionesPage'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

const admin = { id: 'u1', nombre: 'Admin', email: 'admin@pcargo.ec', rol: 'ADMIN' }
const ciudades: Ciudad[] = [
  { id: 1, nombre: 'Ibarra', activa: true },
  { id: 2, nombre: 'Atuntaqui', activa: true },
  { id: 9, nombre: 'Cayambe', activa: false },
]

const keyLive: ApiKey = {
  id: 'k1',
  nombre: 'Servidor producción',
  modo: 'live',
  prefijo: 'pc_live_Ab3dE6gH',
  alcances: ['envios:crear', 'envios:leer'],
  creadaEn: '2026-10-01T10:00:00.000Z',
  ultimoUsoEn: null,
  revocadaEn: null,
}

const base: Integracion = {
  id: 'i1',
  nombre: 'Tienda Kichwa',
  activa: true,
  remitente: { nombre: 'Tienda Kichwa', telefono: '0991112233', direccion: 'Bolívar 3-45' },
  ciudadOrigenId: 1,
  ciudadOrigen: 'Ibarra',
  formaPagoPorDefecto: 'CONTRATO',
  clienteId: null,
  ipsPermitidas: [],
  keys: [keyLive],
  webhook: null,
  envios: 12,
  ultimoEnvio: '2026-10-10T15:00:00.000Z',
  creadaEn: '2026-10-01T09:00:00.000Z',
}

const pagina = <T,>(datos: T[]): Pagina<T> => ({ datos, pagina: 1, porPagina: 10, total: datos.length, totalPaginas: datos.length ? 1 : 0 })

beforeEach(() => localStorage.setItem(TOKEN_KEY, 'token-de-prueba'))
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

type Handler = (url: string, init?: RequestInit) => Response | undefined

/** Servidor simulado: rutas comunes + las específicas de cada prueba (que tienen prioridad). */
function servidor(especifico: Handler = () => undefined) {
  return mockFetch((url, init) => {
    const r = especifico(url, init)
    if (r) return r
    if (url.endsWith('/auth/me')) return jsonResponse(admin)
    if (url.includes('/ciudades')) return jsonResponse(ciudades)
    if (url.includes('/clientes')) return jsonResponse([])
    return jsonResponse({ error: { code: 'NO_ENCONTRADO', message: `sin mock: ${url}` } }, 404)
  })
}

const llamadas = (f: ReturnType<typeof mockFetch>, metodo: string, fragmento: string) =>
  f.mock.calls.filter(([u, i]) => (i?.method ?? 'GET') === metodo && String(u).includes(fragmento))

describe('IntegracionesPage (lista)', () => {
  it('muestra nombre, ciudad, estado, envíos, último envío y si tiene webhook', async () => {
    servidor((url) => (url.endsWith('/integraciones') ? jsonResponse([base, { ...base, id: 'i2', nombre: 'Distribuidora Norte', activa: false, envios: 0, ultimoEnvio: null, webhook: { url: 'https://x.ec/h', eventos: ['envio.creado'], activo: true, secretoPrefijo: 'whsec_ab12' } }]) : undefined))
    renderWithProviders(<IntegracionesPage />)
    const tabla = await screen.findByRole('table', { name: 'Integraciones' })
    const filas = within(tabla).getAllByRole('row')
    expect(within(filas[1]!).getByText('Tienda Kichwa')).toBeInTheDocument()
    expect(within(filas[1]!).getByText('Ibarra')).toBeInTheDocument()
    expect(within(filas[1]!).getByText('Activa')).toBeInTheDocument()
    expect(within(filas[1]!).getByText('12')).toBeInTheDocument()
    expect(within(filas[1]!).getByText('No')).toBeInTheDocument()
    expect(within(filas[2]!).getByText('Inactiva')).toBeInTheDocument()
    expect(within(filas[2]!).getByText('Sí')).toBeInTheDocument()
  })

  it('estado vacío con acceso a crear la primera integración', async () => {
    servidor((url) => (url.endsWith('/integraciones') ? jsonResponse([]) : undefined))
    renderWithProviders(<IntegracionesPage />)
    expect(await screen.findByText('Aún no hay integraciones')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Nueva integración/ })).toHaveLength(2)
  })

  it('crea una integración con remitente fijo, ciudad activa, IPs y la abre', async () => {
    const user = userEvent.setup()
    const fetchMock = servidor((url, init) => {
      if (url.endsWith('/integraciones') && init?.method === 'POST') return jsonResponse({ ...base, id: 'i9' }, 201)
      if (url.endsWith('/integraciones')) return jsonResponse([])
      return undefined
    })
    renderWithProviders(<IntegracionesPage />, {
      route: '/integraciones',
      path: '/integraciones',
      extraRoutes: [{ path: '/integraciones/:id', element: <p>Detalle abierto</p> }],
    })
    await user.click((await screen.findAllByRole('button', { name: /Nueva integración/ }))[0]!)
    const dialogo = await screen.findByRole('dialog')

    // Sin datos: valida antes de llamar al servidor.
    await user.click(within(dialogo).getByRole('button', { name: 'Crear integración' }))
    expect(await within(dialogo).findByText('Elige la ciudad de origen')).toBeInTheDocument()
    expect(llamadas(fetchMock, 'POST', '/integraciones')).toHaveLength(0)

    await user.type(within(dialogo).getByLabelText('Nombre de la empresa'), 'Tienda Kichwa')
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Tienda Kichwa Cía. Ltda.')
    await user.type(within(dialogo).getByLabelText('Teléfono'), '0991112233')
    await user.type(within(dialogo).getByLabelText('Dirección de recogida'), 'Bolívar 3-45')
    await user.click(within(dialogo).getByRole('combobox', { name: 'Ciudad de origen' }))
    // Solo ciudades activas.
    expect(screen.queryByRole('option', { name: /Cayambe/ })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('option', { name: 'Atuntaqui' }))

    const ip = within(dialogo).getByLabelText('IPs permitidas')
    await user.type(ip, '999.1.1.1{Enter}')
    expect(within(dialogo).getByText(/Escribe una IPv4, IPv6 o un rango CIDR/)).toBeInTheDocument()
    await user.clear(ip)
    await user.type(ip, '203.0.113.0/24{Enter}')
    expect(within(dialogo).getByRole('list', { name: 'IPs permitidas' })).toHaveTextContent('203.0.113.0/24')

    await user.click(within(dialogo).getByRole('button', { name: 'Crear integración' }))
    expect(await screen.findByText('Detalle abierto')).toBeInTheDocument()
    const [, init] = llamadas(fetchMock, 'POST', '/integraciones')[0]!
    expect(JSON.parse(String(init!.body))).toEqual({
      nombre: 'Tienda Kichwa',
      activa: true,
      remitente: { nombre: 'Tienda Kichwa Cía. Ltda.', telefono: '0991112233', direccion: 'Bolívar 3-45' },
      ciudadOrigenId: 2,
      formaPagoPorDefecto: 'CONTRATO',
      clienteId: null,
      ipsPermitidas: ['203.0.113.0/24'],
    })
  })
})

function renderDetalle(especifico: Handler, tab?: string) {
  const fetchMock = servidor(especifico)
  renderWithProviders(<IntegracionDetallePage />, {
    route: `/integraciones/i1${tab ? `?tab=${tab}` : ''}`,
    path: '/integraciones/:id',
  })
  return fetchMock
}

describe('IntegracionDetallePage — API keys', () => {
  it('crear key muestra la key una sola vez, con copiar y aviso', async () => {
    const user = userEvent.setup()
    const nueva: ApiKey = { ...keyLive, id: 'k2', nombre: 'Pruebas', modo: 'test', prefijo: 'pc_test_Zx9yW8vU', alcances: ['cotizar'] }
    let integracion = base
    const fetchMock = renderDetalle((url, init) => {
      if (url.endsWith('/integraciones/i1/keys') && init?.method === 'POST') {
        integracion = { ...base, keys: [...base.keys, nueva] }
        return jsonResponse({ key: 'pc_test_Zx9yW8vU_s3cr3tS3cr3tS3cr3tS3cr3tS3cr3tAb', apiKey: nueva }, 201)
      }
      if (url.endsWith('/integraciones/i1')) return jsonResponse(integracion)
      return undefined
    })

    const tabla = await screen.findByRole('table', { name: 'API keys' })
    expect(within(tabla).getByText('pc_live_Ab3dE6gH…')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Crear key' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Crear API key' })
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Pruebas')
    await user.click(within(dialogo).getByRole('radio', { name: /Prueba/ }))
    // Quita dos alcances: queda solo "cotizar".
    await user.click(within(dialogo).getByRole('checkbox', { name: 'Crear envíos' }))
    await user.click(within(dialogo).getByRole('checkbox', { name: 'Consultar envíos' }))
    await user.click(within(dialogo).getByRole('button', { name: 'Crear key' }))

    const secreto = await screen.findByRole('dialog', { name: 'API key creada' })
    expect(within(secreto).getByTestId('secreto-una-vez')).toHaveTextContent('pc_test_Zx9yW8vU_s3cr3tS3cr3tS3cr3tS3cr3tS3cr3tAb')
    expect(within(secreto).getByText('No se volverá a mostrar.')).toBeInTheDocument()
    expect(within(secreto).getByRole('button', { name: 'Copiar al portapapeles' })).toBeInTheDocument()
    const [, init] = llamadas(fetchMock, 'POST', '/keys')[0]!
    expect(JSON.parse(String(init!.body))).toEqual({ nombre: 'Pruebas', modo: 'test', alcances: ['cotizar'] })

    await user.click(within(secreto).getByRole('button', { name: 'Ya la guardé' }))
    await waitFor(() => expect(screen.queryByTestId('secreto-una-vez')).not.toBeInTheDocument())
    // La lista solo muestra el prefijo: la key completa ya no aparece en ninguna parte.
    expect(await screen.findByText('pc_test_Zx9yW8vU…')).toBeInTheDocument()
    expect(screen.queryByText(/s3cr3t/)).not.toBeInTheDocument()
  })

  it('exige al menos un alcance', async () => {
    const user = userEvent.setup()
    renderDetalle((url) => (url.endsWith('/integraciones/i1') ? jsonResponse(base) : undefined))
    await user.click(await screen.findByRole('button', { name: 'Crear key' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Crear API key' })
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Sin alcances')
    for (const nombre of ['Crear envíos', 'Consultar envíos', 'Cotizar']) {
      await user.click(within(dialogo).getByRole('checkbox', { name: nombre }))
    }
    await user.click(within(dialogo).getByRole('button', { name: 'Crear key' }))
    expect(await within(dialogo).findByText('Elige al menos un alcance')).toBeInTheDocument()
  })

  it('revocar pide confirmación y llama a DELETE', async () => {
    const user = userEvent.setup()
    let integracion = base
    const fetchMock = renderDetalle((url, init) => {
      if (url.endsWith('/integraciones/i1/keys/k1') && init?.method === 'DELETE') {
        integracion = { ...base, keys: [{ ...keyLive, revocadaEn: '2026-10-11T12:00:00.000Z' }] }
        return new Response(null, { status: 204 })
      }
      if (url.endsWith('/integraciones/i1')) return jsonResponse(integracion)
      return undefined
    })
    await user.click(await screen.findByRole('button', { name: 'Revocar Servidor producción' }))
    const confirmacion = await screen.findByRole('alertdialog')
    expect(confirmacion).toHaveTextContent('pc_live_Ab3dE6gH')
    expect(llamadas(fetchMock, 'DELETE', '/keys/k1')).toHaveLength(0)
    await user.click(within(confirmacion).getByRole('button', { name: 'Revocar key' }))
    await waitFor(() => expect(llamadas(fetchMock, 'DELETE', '/keys/k1')).toHaveLength(1))
    expect(await screen.findByText('Revocada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revocar Servidor producción' })).not.toBeInTheDocument()
  })
})

const entregaFallida: EntregaWebhook = {
  id: 'w1',
  evento: 'envio.estado_actualizado',
  envioId: 'e1',
  numeroGuia: 40462,
  estado: 'FALLIDO',
  intentos: 8,
  ultimoStatus: 500,
  ultimoError: 'Internal Server Error',
  proximoIntentoEn: null,
  creadoEn: '2026-10-10T10:00:00.000Z',
  entregadoEn: null,
}

describe('IntegracionDetallePage — webhook', () => {
  it('al configurarlo por primera vez muestra el secreto whsec_ una sola vez', async () => {
    const user = userEvent.setup()
    let integracion = base
    const fetchMock = renderDetalle((url, init) => {
      if (url.endsWith('/integraciones/i1/webhook') && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body))
        integracion = { ...base, webhook: { ...body, secretoPrefijo: 'whsec_MfKQ' } }
        return jsonResponse({ secreto: 'whsec_MfKQ9r8GKYqXnMOv1mXQZ3Gx5bLdTn0P4wIeQ0yW3hU=', integracion })
      }
      if (url.includes('/webhook/entregas')) return jsonResponse(pagina([]))
      if (url.endsWith('/integraciones/i1')) return jsonResponse(integracion)
      return undefined
    }, 'webhook')

    expect(await screen.findByText('Sin webhook')).toBeInTheDocument()
    await user.type(screen.getByLabelText('URL'), 'https://tienda.example/webhooks/pcargo')
    await user.click(screen.getByRole('checkbox', { name: 'Evidencia de entrega' }))
    await user.click(screen.getByRole('button', { name: 'Guardar webhook' }))

    const secreto = await screen.findByRole('dialog', { name: 'Secreto del webhook' })
    expect(within(secreto).getByTestId('secreto-una-vez')).toHaveTextContent('whsec_MfKQ9r8GKYqXnMOv1mXQZ3Gx5bLdTn0P4wIeQ0yW3hU=')
    expect(within(secreto).getByText('No se volverá a mostrar.')).toBeInTheDocument()
    const [, init] = llamadas(fetchMock, 'PUT', '/webhook')[0]!
    expect(JSON.parse(String(init!.body))).toEqual({
      url: 'https://tienda.example/webhooks/pcargo',
      eventos: ['envio.creado', 'envio.estado_actualizado'],
      activo: true,
    })
    await user.click(within(secreto).getByRole('button', { name: 'Ya la guardé' }))
    expect(await screen.findByText('Webhook configurado')).toBeInTheDocument()
    expect(screen.getByText('whsec_MfKQ…')).toBeInTheDocument()
    expect(screen.queryByText(/9r8GKYqX/)).not.toBeInTheDocument()
  })

  it('rotar el secreto pide confirmación y muestra el nuevo; la prueba muestra status y error', async () => {
    const user = userEvent.setup()
    const conWebhook: Integracion = {
      ...base,
      webhook: { url: 'https://tienda.example/h', eventos: ['envio.creado'], activo: true, secretoPrefijo: 'whsec_ab12' },
    }
    const fetchMock = renderDetalle((url, init) => {
      if (url.endsWith('/webhook/rotar-secreto')) return jsonResponse({ secreto: 'whsec_NUEVO0000000000000000000000000000000000000=' })
      if (url.endsWith('/webhook/prueba')) return jsonResponse({ ...entregaFallida, id: 'w9', intentos: 1, ultimoStatus: 404, ultimoError: 'Not Found' })
      if (url.includes('/webhook/entregas')) return jsonResponse(pagina([]))
      if (url.endsWith('/integraciones/i1') && init?.method === 'GET') return jsonResponse(conWebhook)
      return undefined
    }, 'webhook')

    await user.click(await screen.findByRole('button', { name: 'Enviar evento de prueba' }))
    const resultado = await screen.findByRole('status')
    expect(resultado).toHaveTextContent('La URL no aceptó el evento')
    expect(resultado).toHaveTextContent('404')
    expect(resultado).toHaveTextContent('Not Found')

    await user.click(screen.getByRole('button', { name: 'Rotar secreto' }))
    const confirmacion = await screen.findByRole('alertdialog')
    expect(llamadas(fetchMock, 'POST', '/rotar-secreto')).toHaveLength(0)
    await user.click(within(confirmacion).getByRole('button', { name: 'Rotar secreto' }))
    const secreto = await screen.findByRole('dialog', { name: 'Secreto del webhook' })
    expect(within(secreto).getByTestId('secreto-una-vez')).toHaveTextContent('whsec_NUEVO')
  })

  it('lista entregas filtrables por estado y reintenta una fallida', async () => {
    const user = userEvent.setup()
    const conWebhook: Integracion = {
      ...base,
      webhook: { url: 'https://tienda.example/h', eventos: ['envio.creado'], activo: true, secretoPrefijo: 'whsec_ab12' },
    }
    const entregada: EntregaWebhook = { ...entregaFallida, id: 'w2', estado: 'ENTREGADO', intentos: 1, ultimoStatus: 200, ultimoError: null, numeroGuia: 40463 }
    const fetchMock = renderDetalle((url, init) => {
      if (url.endsWith('/entregas/w1/reintentar')) return jsonResponse({ ...entregaFallida, estado: 'ENTREGADO', ultimoStatus: 200 })
      if (url.includes('/webhook/entregas')) {
        const estado = new URL(url, 'http://x').searchParams.get('estado')
        return jsonResponse(pagina(estado === 'FALLIDO' ? [entregaFallida] : [entregaFallida, entregada]))
      }
      if (url.endsWith('/integraciones/i1') && init?.method === 'GET') return jsonResponse(conWebhook)
      return undefined
    }, 'webhook')

    const tabla = await screen.findByRole('table', { name: 'Entregas del webhook' })
    expect(within(tabla).getAllByRole('row')).toHaveLength(3)
    expect(within(tabla).getByText('Internal Server Error')).toBeInTheDocument()
    // Solo las fallidas tienen "Reintentar".
    expect(within(tabla).getAllByRole('button', { name: /Reintentar/ })).toHaveLength(1)

    await user.click(screen.getByRole('combobox', { name: 'Filtrar entregas por estado' }))
    await user.click(await screen.findByRole('option', { name: 'Fallido' }))
    await waitFor(() => expect(llamadas(fetchMock, 'GET', 'estado=FALLIDO').length).toBeGreaterThan(0))

    await user.click(await screen.findByRole('button', { name: 'Reintentar entrega envio.estado_actualizado de la guía 40462' }))
    await waitFor(() => expect(llamadas(fetchMock, 'POST', '/entregas/w1/reintentar')).toHaveLength(1))
  })
})

describe('IntegracionDetallePage — actividad y guía', () => {
  it('la actividad muestra método, ruta, status, IP, key, referencia, duración y request id copiable', async () => {
    const solicitud: SolicitudApi = {
      id: 's1',
      fecha: '2026-10-11T10:00:00.000Z',
      metodo: 'POST',
      ruta: '/api/v1/integraciones/envios',
      status: 201,
      ip: '203.0.113.10',
      keyPrefijo: 'pc_live_Ab3dE6gH',
      idempotencyKey: 'PED-1001',
      referenciaExterna: 'PED-1001',
      duracionMs: 42,
      requestId: '5b0d6c1e-8f3a-4c2b-9e7d-1a2b3c4d5e6f',
    }
    renderDetalle((url) => {
      if (url.includes('/solicitudes')) return jsonResponse({ ...pagina([solicitud]), porPagina: 20 })
      if (url.endsWith('/integraciones/i1')) return jsonResponse(base)
      return undefined
    }, 'actividad')
    const tabla = await screen.findByRole('table', { name: 'Solicitudes a la API' })
    for (const texto of ['POST', '201', '203.0.113.10', 'pc_live_Ab3dE6gH', 'PED-1001', '42 ms']) {
      expect(within(tabla).getAllByText(texto, { exact: false }).length).toBeGreaterThan(0)
    }
    expect(within(tabla).getByRole('button', { name: `Copiar request id ${solicitud.requestId}` })).toBeInTheDocument()
  })

  it('«Cómo integrarse» trae ejemplos con la ciudad de origen real y enlaces a la guía y OpenAPI', async () => {
    renderDetalle((url) => (url.endsWith('/integraciones/i1') ? jsonResponse(base) : undefined), 'guia')
    const seccion = await screen.findByRole('region', { name: 'Cómo integrarse' })
    expect(within(seccion).getByText(/recoge en Ibarra/)).toBeInTheDocument()
    expect(within(seccion).getByText(/Idempotency-Key: PED-1001/)).toBeInTheDocument()
    expect(within(seccion).getByRole('link', { name: /Guía para desarrolladores/ })).toHaveAttribute('href', '/desarrolladores')
    expect(within(seccion).getByRole('link', { name: /Especificación OpenAPI/ }).getAttribute('href')).toMatch(
      /\/api\/v1\/integraciones\/openapi\.json$/,
    )
  })
})
