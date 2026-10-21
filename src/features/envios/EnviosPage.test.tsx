import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders, simularMovil } from '@/test/utils'
import type { Envio, Pagina } from '@/types/api'
import { EnviosPage } from './EnviosPage'

const generarGuias = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('./guiaPdf', async (original) => ({ ...(await original<typeof import('./guiaPdf')>()), generarGuias }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const vacia: Pagina<Envio> = { datos: [], pagina: 1, porPagina: 20, total: 0, totalPaginas: 0 }

const envio = (n: number) =>
  ({
    id: `e${n}`,
    numeroGuia: 40000 + n,
    remitente: { nombre: 'Ana', telefono: '0991112233' },
    destinatario: { nombre: `Cliente ${n}`, telefono: '0994445566', direccion: 'Quito' },
    ruta: { id: 7, origen: 'Ibarra', destino: 'Quito' },
    items: [{ tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 0.2, costoUnitario: 4, subtotal: 4 }],
    totalPiezas: 1,
    pesoTotalKg: 0.2,
    descripcion: null,
    costo: 4,
    formaPago: 'PAGADO',
    estado: 'EN_TRANSITO',
    registro: { fecha: '2026-10-07T10:00:00.000Z', operador: 'Operador' },
    entrega: null,
    creadoEn: '2026-10-07T10:00:00.000Z',
    actualizadoEn: '2026-10-07T10:00:00.000Z',
  }) as unknown as Envio

/** Simula el servidor: 45 envíos paginados según ?pagina=&porPagina=. */
function servidorPaginado() {
  return mockFetch((url) => {
    if (!url.includes('/envios')) return jsonResponse([])
    const p = new URL(url, 'http://x').searchParams
    const pagina = Number(p.get('pagina') ?? 1)
    const porPagina = Number(p.get('porPagina') ?? 20)
    const total = 45
    const datos = Array.from({ length: total }, (_, i) => envio(i + 1)).slice((pagina - 1) * porPagina, pagina * porPagina)
    return jsonResponse({ datos, pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) })
  })
}

const urlsEnvios = (fetch: ReturnType<typeof mockFetch>) =>
  fetch.mock.calls.map(([u]) => String(u)).filter((u) => u.includes('/envios'))

describe('EnviosPage', () => {
  it('toma los filtros de la URL, los envía a la API y permite limpiarlos', async () => {
    const fetch = mockFetch((url) => jsonResponse(url.includes('/envios') ? vacia : []))
    renderWithProviders(<EnviosPage />, { route: '/envios?estado=ENTREGADO&formaPago=AL_COBRO', path: '/envios' })

    expect(await screen.findByText('No hay envíos')).toBeInTheDocument()
    const urls = () => urlsEnvios(fetch)
    expect(urls().some((u) => u.includes('estado=ENTREGADO') && u.includes('formaPago=AL_COBRO'))).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: /Limpiar filtros/ }))
    expect(screen.queryByRole('button', { name: /Limpiar filtros/ })).not.toBeInTheDocument()
    await vi.waitFor(() => expect(urls().at(-1)).not.toContain('estado='))
  })

  it('con ?guia= (QR leído con la sesión abierta) abre el detalle de ese envío y limpia la URL', async () => {
    const fetch = mockFetch((url) => {
      if (/\/envios\/e5$/.test(url)) return jsonResponse({ ...envio(5), historial: [] })
      if (url.includes('q=40005')) return jsonResponse({ ...vacia, datos: [envio(5)], total: 1, totalPaginas: 1 })
      return jsonResponse(url.includes('/envios') ? vacia : [])
    })
    renderWithProviders(<EnviosPage />, { route: '/envios?guia=0040005', path: '/envios' })

    const detalle = await screen.findByRole('dialog')
    await vi.waitFor(() => expect(detalle).toHaveTextContent('40005'))
    expect(urlsEnvios(fetch).some((u) => u.includes('/envios/e5'))).toBe(true)
  })

  it('pide al servidor solo la página visible y navega entre páginas', async () => {
    const fetch = servidorPaginado()
    renderWithProviders(<EnviosPage />, { route: '/envios', path: '/envios' })

    expect(await screen.findByText('1–20 de 45')).toBeInTheDocument()
    expect(urlsEnvios(fetch).at(-1)).toContain('pagina=1')
    expect(urlsEnvios(fetch).at(-1)).toContain('porPagina=20')

    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(await screen.findByText('21–40 de 45')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()
    expect(urlsEnvios(fetch).at(-1)).toContain('pagina=2')

    await userEvent.click(screen.getByRole('button', { name: 'Última página' }))
    expect(await screen.findByText('41–45 de 45')).toBeInTheDocument()
  })

  it('marca varios envíos (también en otras páginas) e imprime sus guías juntas, cuatro por hoja', async () => {
    servidorPaginado()
    renderWithProviders(<EnviosPage />, { route: '/envios', path: '/envios' })
    await screen.findByText('1–20 de 45')
    expect(screen.queryByRole('region', { name: 'Guías seleccionadas' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar guía 40001' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar guía 40002' }))
    // Marcar no abre el detalle del envío.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await screen.findByText('21–40 de 45')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar guía 40021' }))

    const barra = screen.getByRole('region', { name: 'Guías seleccionadas' })
    expect(barra).toHaveTextContent('3 guías seleccionadas · 1 hoja A4')
    await userEvent.click(within(barra).getByRole('button', { name: /Imprimir guías/ }))
    expect(generarGuias).toHaveBeenCalledWith(
      [expect.objectContaining({ numeroGuia: 40001 }), expect.objectContaining({ numeroGuia: 40002 }), expect.objectContaining({ numeroGuia: 40021 })],
      'imprimir',
    )

    await userEvent.click(within(barra).getByRole('button', { name: /Quitar selección/ }))
    expect(screen.queryByRole('region', { name: 'Guías seleccionadas' })).not.toBeInTheDocument()
  }, 15_000)

  it('la casilla del encabezado marca y desmarca todos los envíos de la página', async () => {
    servidorPaginado()
    renderWithProviders(<EnviosPage />, { route: '/envios', path: '/envios' })
    await screen.findByText('1–20 de 45')
    const todos = screen.getByRole('checkbox', { name: 'Seleccionar todos los envíos de la página' })
    await userEvent.click(todos)
    expect(screen.getByRole('region', { name: 'Guías seleccionadas' })).toHaveTextContent('20 guías seleccionadas · 5 hojas A4')
    await userEvent.click(todos)
    expect(screen.queryByRole('region', { name: 'Guías seleccionadas' })).not.toBeInTheDocument()
  })

  it('respeta la página de la URL y vuelve a la primera al cambiar un filtro', async () => {
    const fetch = servidorPaginado()
    renderWithProviders(<EnviosPage />, { route: '/envios?pagina=2', path: '/envios' })

    expect(await screen.findByText('21–40 de 45')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar envíos' }), 'Ana')
    await vi.waitFor(() => expect(urlsEnvios(fetch).at(-1)).toContain('q=Ana'))
    expect(urlsEnvios(fetch).at(-1)).toContain('pagina=1')
  })

  it('si la página de la URL ya no existe, muestra la última', async () => {
    servidorPaginado()
    renderWithProviders(<EnviosPage />, { route: '/envios?pagina=9', path: '/envios' })
    expect(await screen.findByText('41–45 de 45')).toBeInTheDocument()
  })

  describe('origen (contrato v10)', () => {
    const porApi = {
      ...(envio(1) as object),
      id: 'api1',
      origen: { canal: 'API', integracionId: 'i1', integracion: 'Tienda Kichwa' },
      referenciaExterna: 'PED-1001',
    } as unknown as Envio
    const porPanel = { ...(envio(2) as object), origen: { canal: 'PANEL', integracionId: null, integracion: null }, referenciaExterna: null } as unknown as Envio
    const resumenCanal = {
      porCanal: [
        { canal: 'PANEL', integracionId: null, nombre: 'Panel', envios: 9, monto: 30 },
        { canal: 'API', integracionId: 'i1', nombre: 'Tienda Kichwa', envios: 3, monto: 9 },
        { canal: 'API', integracionId: 'i2', nombre: 'Distribuidora Norte', envios: 1, monto: 3 },
      ],
    }
    const servidor = () =>
      mockFetch((url) => {
        if (url.includes('/dashboard/resumen')) return jsonResponse(resumenCanal)
        if (url.includes('/envios')) return jsonResponse({ datos: [porApi, porPanel], pagina: 1, porPagina: 20, total: 2, totalPaginas: 1 })
        return jsonResponse([])
      })

    it('marca solo los envíos por API («API · integración»); los del panel, lo habitual, no llevan insignia', async () => {
      servidor()
      renderWithProviders(<EnviosPage />, { route: '/envios', path: '/envios' })
      const tabla = await screen.findByRole('table')
      const filas = within(tabla).getAllByRole('row')
      expect(within(filas[1]!).getByTestId('origen-badge')).toHaveTextContent('API · Tienda Kichwa')
      expect(within(filas[2]!).queryByTestId('origen-badge')).not.toBeInTheDocument()
    })

    it('filtra por canal e integración (en la URL) y, sin acceso a /integraciones, toma las opciones del resumen', async () => {
      const fetch = servidor()
      renderWithProviders(<EnviosPage />, { route: '/envios?canal=API', path: '/envios' })
      await vi.waitFor(() => expect(urlsEnvios(fetch).at(-1)).toContain('canal=API'))
      // Sin sesión de ADMIN no se consulta GET /integraciones (403 para un OPERADOR).
      expect(fetch.mock.calls.some(([u]) => /\/api\/integraciones/.test(String(u)))).toBe(false)

      await userEvent.click(await screen.findByRole('combobox', { name: 'Filtrar por integración' }))
      await userEvent.click(await screen.findByRole('option', { name: 'Tienda Kichwa' }))
      await vi.waitFor(() => expect(urlsEnvios(fetch).at(-1)).toContain('integracionId=i1'))
      expect(urlsEnvios(fetch).at(-1)).toContain('canal=API')

      // Volver a «Panel» quita la integración.
      await userEvent.click(screen.getByRole('combobox', { name: 'Filtrar por origen' }))
      await userEvent.click(await screen.findByRole('option', { name: 'Panel' }))
      await vi.waitFor(() => expect(urlsEnvios(fetch).at(-1)).toContain('canal=PANEL'))
      expect(urlsEnvios(fetch).at(-1)).not.toContain('integracionId')
      expect(screen.queryByRole('combobox', { name: 'Filtrar por integración' })).not.toBeInTheDocument()
    })
  })

  describe('en móvil', () => {
    it('muestra solo el buscador y un botón «Filtros»; los filtros van en una hoja inferior', async () => {
      simularMovil()
      const fetch = servidorPaginado()
      renderWithProviders(<EnviosPage />, { route: '/envios?estado=ENTREGADO', path: '/envios' })

      expect(await screen.findByRole('textbox', { name: 'Buscar envíos' })).toBeInTheDocument()
      expect(screen.queryByRole('combobox', { name: 'Filtrar por estado' })).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Filtros (1 activo)' }))
      const hoja = await screen.findByRole('dialog', { name: 'Filtros' })
      expect(within(hoja).getByRole('combobox', { name: 'Filtrar por estado' })).toBeInTheDocument()
      expect(within(hoja).getByRole('combobox', { name: 'Filtrar por forma de pago' })).toBeInTheDocument()
      expect(within(hoja).getByRole('combobox', { name: 'Filtrar por ruta' })).toBeInTheDocument()

      await userEvent.click(within(hoja).getByRole('button', { name: 'Limpiar' }))
      await vi.waitFor(() => expect(urlsEnvios(fetch).at(-1)).not.toContain('estado='))
      await userEvent.click(within(hoja).getByRole('button', { name: 'Ver resultados' }))
      expect(await screen.findByRole('button', { name: 'Filtros' })).toBeInTheDocument()
    })
  })
})

describe('EnviosPage — repartidor (contrato v12)', () => {
  it('muestra el repartidor asignado y filtra por repartidor o «Sin asignar»', async () => {
    const asignado = { ...envio(1), repartidor: { id: 'u3', nombre: 'Rider Uno' } } as Envio
    const fetch = mockFetch((url) => {
      if (url.endsWith('/usuarios/repartidores')) return jsonResponse([{ id: 'u3', nombre: 'Rider Uno' }])
      if (url.includes('/envios')) return jsonResponse({ datos: [asignado], pagina: 1, porPagina: 20, total: 1, totalPaginas: 1 })
      return jsonResponse([])
    })
    renderWithProviders(<EnviosPage />, { route: '/envios', path: '/envios' })
    const fila = await screen.findByRole('row', { name: /Cliente 1/ })
    expect(within(fila).getByTitle('Repartidor asignado')).toHaveTextContent('Rider Uno')

    await userEvent.click(screen.getByRole('combobox', { name: 'Filtrar por repartidor' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Sin asignar' }))
    await vi.waitFor(() => expect(urlsEnvios(fetch).at(-1)).toContain('repartidorId=ninguno'))

    await userEvent.click(screen.getByRole('combobox', { name: 'Filtrar por repartidor' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Rider Uno' }))
    await vi.waitFor(() => expect(urlsEnvios(fetch).at(-1)).toContain('repartidorId=u3'))
  })
})

describe('EnviosPage — fecha, estado y cambio rápido de estado', () => {
  it('filtra por la fecha elegida (desde = hasta) y por estado desde el desplegable', async () => {
    const fetch = mockFetch((url) => jsonResponse(url.includes('/envios') ? vacia : []))
    renderWithProviders(<EnviosPage />, { route: '/envios?fecha=2026-10-20&estado=EN_REPARTO', path: '/envios' })
    expect(await screen.findByText('No hay envíos')).toBeInTheDocument()
    const u = new URL(urlsEnvios(fetch).at(-1)!, 'http://x').searchParams
    expect([u.get('desde'), u.get('hasta'), u.get('estado')]).toEqual(['2026-10-20', '2026-10-20', 'EN_REPARTO'])
    expect(screen.getByLabelText('Filtrar por fecha de registro')).toHaveValue('2026-10-20')
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toHaveTextContent('En reparto')
    // Ya no hay pestañas de estado: en su lugar van los cambios rápidos.
    expect(screen.queryByRole('group', { name: 'Estado' })).not.toBeInTheDocument()
  })

  it('los cambios rápidos se habilitan al marcar y solo cambian las guías que pueden pasar a ese estado', async () => {
    const user = userEvent.setup()
    const cambios: { url: string; body: unknown }[] = []
    const registrado = { ...envio(2), estado: 'REGISTRADO' } as Envio
    mockFetch((url, init) => {
      if (init?.method === 'PATCH') {
        cambios.push({ url, body: JSON.parse(String(init.body)) })
        return jsonResponse({ ...envio(1), estado: 'EN_REPARTO' })
      }
      if (url.includes('/envios')) return jsonResponse({ ...vacia, datos: [envio(1), registrado], total: 2, totalPaginas: 1 })
      return jsonResponse([])
    })
    renderWithProviders(<EnviosPage />, { route: '/envios', path: '/envios' })
    await screen.findByText('Cliente 1')

    const grupo = screen.getByRole('group', { name: 'Cambiar estado de las guías marcadas' })
    const boton = (nombre: RegExp) => within(grupo).getByRole('button', { name: nombre })
    expect(boton(/Despachar/)).toBeDisabled()
    expect(boton(/Enviar a reparto/)).toBeDisabled()
    expect(within(grupo).queryByRole('button', { name: /entregado|novedad/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar guía 40001' }))
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar guía 40002' }))
    expect(boton(/Despachar/)).toBeEnabled()
    expect(boton(/Cancelar envío/)).toBeEnabled()

    await user.click(boton(/Enviar a reparto/))
    await vi.waitFor(() => expect(cambios).toHaveLength(1))
    expect(cambios[0]!.url).toContain('/envios/e1/estado')
    expect(cambios[0]!.body).toEqual({ estado: 'EN_REPARTO' })
    // Tras el cambio se limpia la selección.
    await vi.waitFor(() => expect(screen.getByRole('checkbox', { name: 'Seleccionar guía 40001' })).not.toBeChecked())
  })
})
