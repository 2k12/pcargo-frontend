import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { TOKEN_KEY } from '@/lib/api'
import { jsonResponse, mockFetch, renderWithProviders, tipoCargaFixture } from '@/test/utils'
import type { ArticuloRestringido, CambioTipoCarga, Pagina, TipoCarga } from '@/types/api'
import { CatalogoPage } from './CatalogoPage'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

const admin = { id: 'u1', nombre: 'Admin', email: 'admin@pcargo.ec', rol: 'ADMIN' }

const sobre = tipoCargaFixture({ codigo: 'SOBRE', nombre: 'Sobre', precio: 3, pesoMaxKg: 0.5, orden: 1 })
const paquete = tipoCargaFixture({ codigo: 'PAQUETE', nombre: 'Paquete', precio: 3, pesoMaxKg: 50, orden: 2 })
const tela = tipoCargaFixture({
  codigo: 'TELA',
  nombre: 'Rollo de tela',
  precio: 1.25,
  precioRural: 1.5,
  mayoreo: { minimoExclusivo: 50, precio: 1 },
  pesoMaxKg: 50,
  orden: 3,
})
const nevera = tipoCargaFixture({ codigo: 'NEVERA', nombre: 'Nevera', precio: 20, pesoMaxKg: 80, activo: false, orden: 4 })
const TIPOS: TipoCarga[] = [sobre, paquete, tela, nevera]

const articulo = (id: string, categoria: ArticuloRestringido['categoria'], titulo: string, orden: number, extra: Partial<ArticuloRestringido> = {}): ArticuloRestringido => ({
  id,
  categoria,
  titulo,
  detalle: '',
  icono: categoria === 'NOTA' ? null : 'dinero',
  activo: true,
  orden,
  actualizadoEn: '2026-10-12T00:00:00.000Z',
  actualizadoPor: 'Admin',
  ...extra,
})
const ARTICULOS: ArticuloRestringido[] = [
  articulo('p1', 'PROHIBIDO', 'Dinero en efectivo', 1, { detalle: 'Billetes ni monedas.' }),
  articulo('p2', 'PROHIBIDO', 'Animales vivos', 2, { icono: 'animal' }),
  articulo('c1', 'CONDICIONADO', 'Perecibles', 1, { icono: 'perecible' }),
  articulo('n1', 'NOTA', 'No entregamos en apartados postales.', 1),
]

beforeEach(() => localStorage.setItem(TOKEN_KEY, 'token-de-prueba'))
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

type Handler = (url: string, init?: RequestInit) => Response | undefined

function servidor(especifico: Handler = () => undefined) {
  return mockFetch((url, init) => {
    const r = especifico(url, init)
    if (r) return r
    const metodo = init?.method ?? 'GET'
    if (url.endsWith('/auth/me')) return jsonResponse(admin)
    if (metodo === 'GET' && url.includes('/tipos-carga?todos=true')) return jsonResponse(TIPOS)
    if (metodo === 'GET' && url.endsWith('/articulos-restringidos')) return jsonResponse(ARTICULOS)
    return jsonResponse({ error: { code: 'NO_ENCONTRADO', message: `sin mock: ${metodo} ${url}` } }, 404)
  })
}

const llamadas = (f: ReturnType<typeof mockFetch>, metodo: string, fragmento: string) =>
  f.mock.calls.filter(([u, i]) => (i?.method ?? 'GET') === metodo && String(u).includes(fragmento))
const cuerpo = (f: ReturnType<typeof mockFetch>, metodo: string, fragmento: string) =>
  JSON.parse(String(llamadas(f, metodo, fragmento).at(-1)![1]!.body))

function render(route = '/catalogo') {
  return renderWithProviders(
    <>
      <CatalogoPage />
      <Toaster />
    </>,
    { route, path: '/catalogo' },
  )
}

const fila = async (nombre: string) => within(await screen.findByRole('list', { name: 'Tipos de carga' })).getByRole('listitem', { name: nombre })

describe('CatalogoPage — tipos de carga', () => {
  it('lista nombre, código, precios, mayoreo, peso máximo y estado, con el aviso sobre envíos ya registrados', async () => {
    servidor()
    render()
    expect(screen.getByRole('heading', { name: 'Tarifas y tipos de carga' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(
      'Los envíos ya registrados conservan su precio; los cambios aplican a cotizaciones y envíos nuevos.',
    )
    const t = await fila('Rollo de tela')
    expect(t).toHaveTextContent('TELA')
    expect(t).toHaveTextContent('$1,25')
    expect(t).toHaveTextContent('$1,50')
    expect(t).toHaveTextContent('más de 50 → $1,00')
    expect(t).toHaveTextContent('50 kg')
    expect(await fila('Sobre')).toHaveTextContent('Igual al urbano')
    const inactiva = await fila('Nevera')
    expect(inactiva).toHaveTextContent('Inactivo')
    expect(within(inactiva).getByRole('switch', { name: 'Activar Nevera' })).not.toBeChecked()
  })

  it('crea un tipo: genera el código desde el nombre, valida el código y el mayoreo, y envía el contrato', async () => {
    const user = userEvent.setup()
    const f = servidor((url, init) =>
      init?.method === 'POST' && url.endsWith('/tipos-carga')
        ? jsonResponse({ ...JSON.parse(String(init.body)), activo: true, orden: 5, actualizadoEn: null, actualizadoPor: 'Admin' }, 201)
        : undefined,
    )
    render()
    await fila('Sobre')
    await user.click(screen.getByRole('button', { name: 'Nuevo tipo' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo tipo de carga' })

    await user.type(within(dialogo).getByLabelText('Nombre'), 'Caja grande (XL)')
    const codigo = within(dialogo).getByLabelText('Código')
    expect(codigo).toHaveValue('CAJA_GRANDE_XL')

    // Código inválido: empieza con número.
    await user.clear(codigo)
    await user.type(codigo, '1caja')
    await user.type(within(dialogo).getByLabelText('Precio urbano'), '6')
    await user.type(within(dialogo).getByLabelText('Peso máximo por unidad (kg)'), '40')
    await user.click(within(dialogo).getByRole('checkbox', { name: /Aplicar mayoreo/ }))
    await user.type(within(dialogo).getByLabelText('Más de (unidades)'), '10,5')
    await user.type(within(dialogo).getByLabelText('Precio por volumen'), '6')
    await user.click(within(dialogo).getByRole('button', { name: 'Crear tipo' }))

    expect(await within(dialogo).findByText(/empieza con una letra mayúscula/)).toBeInTheDocument()
    expect(within(dialogo).getByText('Entero de 1 a 9999')).toBeInTheDocument()
    expect(within(dialogo).getByText('Debe ser menor que el precio urbano')).toBeInTheDocument()
    expect(llamadas(f, 'POST', '/tipos-carga')).toHaveLength(0)

    // Al escribir se normaliza a mayúsculas y guion bajo.
    await user.clear(codigo)
    await user.type(codigo, 'caja-grande')
    expect(codigo).toHaveValue('CAJA_GRANDE')
    const minimo = within(dialogo).getByLabelText('Más de (unidades)')
    await user.clear(minimo)
    await user.type(minimo, '10')
    const pm = within(dialogo).getByLabelText('Precio por volumen')
    await user.clear(pm)
    await user.type(pm, '5,50')
    await user.click(within(dialogo).getByRole('button', { name: 'Crear tipo' }))

    await waitFor(() => expect(llamadas(f, 'POST', '/tipos-carga')).toHaveLength(1))
    expect(cuerpo(f, 'POST', '/tipos-carga')).toEqual({
      codigo: 'CAJA_GRANDE',
      nombre: 'Caja grande (XL)',
      precio: 6,
      precioRural: null,
      mayoreo: { minimoExclusivo: 10, precio: 5.5 },
      pesoMaxKg: 40,
      activo: true,
    })
    expect(await screen.findByText('Tipo «Caja grande (XL)» creado')).toBeInTheDocument()
    // Tras guardar se vuelve a pedir el catálogo.
    await waitFor(() => expect(llamadas(f, 'GET', '/tipos-carga?todos=true').length).toBeGreaterThan(1))
  })

  it('edita el precio enviando solo el campo que cambió; el código no se puede editar', async () => {
    const user = userEvent.setup()
    const f = servidor((url, init) =>
      init?.method === 'PATCH' && url.endsWith('/tipos-carga/SOBRE') ? jsonResponse({ ...sobre, precio: 3.5 }) : undefined,
    )
    render()
    await user.click(within(await fila('Sobre')).getByRole('button', { name: 'Editar Sobre' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar «Sobre»' })
    expect(within(dialogo).getByLabelText('Código')).toHaveAttribute('readonly')
    const precio = within(dialogo).getByLabelText('Precio urbano')
    expect(precio).toHaveValue('3')
    await user.clear(precio)
    await user.type(precio, '3,50')
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(llamadas(f, 'PATCH', '/tipos-carga/SOBRE')).toHaveLength(1))
    expect(cuerpo(f, 'PATCH', '/tipos-carga/SOBRE')).toEqual({ precio: 3.5 })
    expect(await screen.findByText('«Sobre» actualizado')).toBeInTheDocument()
  })

  it('desactivar pide confirmación; cancelar no cambia nada', async () => {
    const user = userEvent.setup()
    const f = servidor((url, init) =>
      init?.method === 'PATCH' && url.endsWith('/tipos-carga/PAQUETE') ? jsonResponse({ ...paquete, activo: false }) : undefined,
    )
    render()
    const switchPaquete = within(await fila('Paquete')).getByRole('switch', { name: 'Desactivar Paquete' })

    await user.click(switchPaquete)
    let confirmacion = await screen.findByRole('alertdialog')
    expect(confirmacion).toHaveTextContent('¿Desactivar «Paquete»?')
    await user.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(llamadas(f, 'PATCH', '/tipos-carga/PAQUETE')).toHaveLength(0)

    await user.click(switchPaquete)
    confirmacion = await screen.findByRole('alertdialog')
    await user.click(within(confirmacion).getByRole('button', { name: 'Desactivar' }))
    await waitFor(() => expect(llamadas(f, 'PATCH', '/tipos-carga/PAQUETE')).toHaveLength(1))
    expect(cuerpo(f, 'PATCH', '/tipos-carga/PAQUETE')).toEqual({ activo: false })
    expect(await screen.findByText('«Paquete» desactivado')).toBeInTheDocument()
  })

  it('activar un tipo inactivo no pide confirmación', async () => {
    const user = userEvent.setup()
    const f = servidor((url, init) =>
      init?.method === 'PATCH' && url.endsWith('/tipos-carga/NEVERA') ? jsonResponse({ ...nevera, activo: true }) : undefined,
    )
    render()
    await user.click(within(await fila('Nevera')).getByRole('switch', { name: 'Activar Nevera' }))
    await waitFor(() => expect(llamadas(f, 'PATCH', '/tipos-carga/NEVERA')).toHaveLength(1))
    expect(cuerpo(f, 'PATCH', '/tipos-carga/NEVERA')).toEqual({ activo: true })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('eliminar un tipo con envíos (409) explica que hay que desactivarlo', async () => {
    const user = userEvent.setup()
    const f = servidor((url, init) =>
      init?.method === 'DELETE' && url.endsWith('/tipos-carga/SOBRE')
        ? jsonResponse({ error: { code: 'CONFLICTO', message: 'El tipo de carga tiene envíos' } }, 409)
        : undefined,
    )
    render()
    await user.click(within(await fila('Sobre')).getByRole('button', { name: 'Eliminar Sobre' }))
    const confirmacion = await screen.findByRole('alertdialog')
    await user.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(llamadas(f, 'DELETE', '/tipos-carga/SOBRE')).toHaveLength(1))
    expect(await screen.findByText('«Sobre» tiene envíos: desactívalo en lugar de eliminarlo.')).toBeInTheDocument()
    // Sigue en la lista.
    expect(await fila('Sobre')).toBeInTheDocument()
  })

  it('eliminar un tipo sin envíos lo quita', async () => {
    const user = userEvent.setup()
    const f = servidor((url, init) =>
      init?.method === 'DELETE' && url.endsWith('/tipos-carga/NEVERA') ? new Response(null, { status: 204 }) : undefined,
    )
    render()
    await user.click(within(await fila('Nevera')).getByRole('button', { name: 'Eliminar Nevera' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(llamadas(f, 'DELETE', '/tipos-carga/NEVERA')).toHaveLength(1))
    expect(await screen.findByText('«Nevera» eliminado')).toBeInTheDocument()
  })

  it('reordena con los botones subir/bajar (teclado) y guarda el orden completo', async () => {
    const user = userEvent.setup()
    // Servidor con estado: tras el PUT, la lista vuelve en el orden nuevo.
    let tipos = TIPOS
    const f = servidor((url, init) => {
      if (init?.method === 'PUT' && url.endsWith('/tipos-carga/orden')) {
        tipos = [paquete, sobre, tela, nevera].map((t, i) => ({ ...t, orden: i + 1 }))
        return jsonResponse(tipos)
      }
      if (url.includes('/tipos-carga?todos=true')) return jsonResponse(tipos)
      return undefined
    })
    render()
    const lista = await screen.findByRole('list', { name: 'Tipos de carga' })
    expect(within(lista).getByRole('button', { name: 'Subir Sobre' })).toBeDisabled()
    expect(within(lista).getByRole('button', { name: 'Bajar Nevera' })).toBeDisabled()

    within(lista).getByRole('button', { name: 'Bajar Sobre' }).focus()
    await user.keyboard('{Enter}')

    await waitFor(() => expect(llamadas(f, 'PUT', '/tipos-carga/orden')).toHaveLength(1))
    expect(cuerpo(f, 'PUT', '/tipos-carga/orden')).toEqual({ codigos: ['PAQUETE', 'SOBRE', 'TELA', 'NEVERA'] })
    // La lista se reordena al instante y se anuncia a lectores de pantalla.
    expect(within(lista).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual([
      'Paquete',
      'Sobre',
      'Rollo de tela',
      'Nevera',
    ])
    expect(screen.getByText('Sobre: posición 2 de 4')).toBeInTheDocument()
  })
})

describe('CatalogoPage — historial de cambios', () => {
  const pagina = (datos: CambioTipoCarga[]): Pagina<CambioTipoCarga> => ({ datos, pagina: 1, porPagina: 20, total: datos.length, totalPaginas: 1 })
  const cambios: CambioTipoCarga[] = [
    {
      id: 'h2',
      codigo: 'TELA',
      fecha: '2026-10-12T15:30:00.000Z',
      usuario: 'Admin',
      accion: 'MODIFICADO',
      cambios: [
        { campo: 'precio', antes: 1.25, despues: 1.4 },
        { campo: 'precioRural', antes: 1.5, despues: null },
        { campo: 'mayoreo', antes: null, despues: { minimoExclusivo: 50, precio: 1 } },
        { campo: 'pesoMaxKg', antes: 50, despues: 45.5 },
      ],
    },
    { id: 'h1', codigo: 'NEVERA', fecha: '2026-10-11T10:00:00.000Z', usuario: null, accion: 'DESACTIVADO', cambios: [{ campo: 'activo', antes: true, despues: false }] },
  ]

  it('muestra fecha, usuario, acción y los cambios formateados en USD y kg', async () => {
    servidor((url) => (url.includes('/tipos-carga/historial') ? jsonResponse(pagina(cambios)) : undefined))
    render('/catalogo?tab=historial')
    const tabla = await screen.findByRole('table', { name: 'Historial de cambios de tipos de carga' })
    const filas = within(tabla).getAllByRole('row')
    expect(filas).toHaveLength(3)
    const tela = filas[1]!
    expect(tela).toHaveTextContent('Admin')
    expect(tela).toHaveTextContent('Rollo de tela')
    expect(tela).toHaveTextContent('Modificado')
    expect(within(tela).getByText('Precio urbano: $1,25 → $1,40')).toBeInTheDocument()
    expect(within(tela).getByText('Precio rural: $1,50 → igual al urbano')).toBeInTheDocument()
    expect(within(tela).getByText('Mayoreo: sin mayoreo → más de 50 → $1,00')).toBeInTheDocument()
    expect(within(tela).getByText('Peso máximo: 50 kg → 45,5 kg')).toBeInTheDocument()
    const neveraFila = filas[2]!
    expect(neveraFila).toHaveTextContent('Desactivado')
    expect(within(neveraFila).getByText('Estado: Activo → Inactivo')).toBeInTheDocument()
    expect(neveraFila).toHaveTextContent('—')
  })

  it('filtra por tipo de carga', async () => {
    const user = userEvent.setup()
    const f = servidor((url) => (url.includes('/tipos-carga/historial') ? jsonResponse(pagina(cambios)) : undefined))
    render('/catalogo?tab=historial')
    await screen.findByRole('table', { name: 'Historial de cambios de tipos de carga' })
    await user.click(screen.getByRole('combobox', { name: 'Tipo de carga' }))
    await user.click(await screen.findByRole('option', { name: 'Rollo de tela' }))
    await waitFor(() => expect(llamadas(f, 'GET', '/tipos-carga/historial?codigo=TELA')).toHaveLength(1))
  })

  it('sin cambios muestra un estado vacío', async () => {
    servidor((url) => (url.includes('/tipos-carga/historial') ? jsonResponse(pagina([])) : undefined))
    render('/catalogo?tab=historial')
    expect(await screen.findByText('Sin cambios registrados')).toBeInTheDocument()
  })
})

describe('CatalogoPage — qué no transportamos', () => {
  const grupo = async (nombre: string) => within(await screen.findByRole('region', { name: nombre }))

  it('muestra los tres grupos y una vista previa con solo los publicados', async () => {
    servidor((url, init) =>
      (init?.method ?? 'GET') === 'GET' && url.endsWith('/articulos-restringidos')
        ? jsonResponse([...ARTICULOS, articulo('p3', 'PROHIBIDO', 'Artículo retirado', 3, { activo: false })])
        : undefined,
    )
    render('/catalogo?tab=articulos')
    const prohibidos = await grupo('Prohibidos')
    expect(prohibidos.getByText('Dinero en efectivo')).toBeInTheDocument()
    expect(prohibidos.getByRole('listitem', { name: 'Artículo retirado' })).toHaveTextContent('Oculto')
    expect((await grupo('Con condiciones')).getByText('Perecibles')).toBeInTheDocument()
    expect((await grupo('Notas')).getByText('No entregamos en apartados postales.')).toBeInTheDocument()
    const vista = screen.getByTestId('vista-previa-articulos')
    expect(within(vista).getByRole('list', { name: 'Artículos prohibidos' })).toHaveTextContent('Dinero en efectivo')
    expect(within(vista).queryByText('Artículo retirado')).not.toBeInTheDocument()
  })

  it('crea un artículo con título, detalle (contador) e icono de la rejilla', async () => {
    const user = userEvent.setup()
    const f = servidor((url, init) =>
      init?.method === 'POST' && url.endsWith('/articulos-restringidos')
        ? jsonResponse(articulo('p9', 'PROHIBIDO', 'Baterías sueltas', 3, { icono: 'bateria' }), 201)
        : undefined,
    )
    render('/catalogo?tab=articulos')
    await user.click((await grupo('Prohibidos')).getByRole('button', { name: 'Agregar a Prohibidos' }))
    const dialogo = await screen.findByRole('dialog')
    await user.type(within(dialogo).getByLabelText('Título'), 'Baterías sueltas')
    await user.type(within(dialogo).getByLabelText('Detalle (opcional)'), 'De litio.')
    expect(within(dialogo).getByText('9/300')).toBeInTheDocument()
    const iconos = within(dialogo).getByRole('radiogroup', { name: 'Icono' })
    expect(within(iconos).getAllByRole('radio')).toHaveLength(18)
    expect(within(iconos).getByRole('radio', { name: 'Prohibido' })).toHaveAttribute('aria-checked', 'true')
    await user.click(within(iconos).getByRole('radio', { name: 'Batería' }))
    await user.click(within(dialogo).getByRole('button', { name: 'Agregar' }))

    await waitFor(() => expect(llamadas(f, 'POST', '/articulos-restringidos')).toHaveLength(1))
    expect(cuerpo(f, 'POST', '/articulos-restringidos')).toEqual({
      categoria: 'PROHIBIDO',
      titulo: 'Baterías sueltas',
      detalle: 'De litio.',
      icono: 'bateria',
      activo: true,
    })
  })

  it('valida el título y las notas no llevan icono', async () => {
    const user = userEvent.setup()
    const f = servidor((url, init) =>
      init?.method === 'POST' && url.endsWith('/articulos-restringidos')
        ? jsonResponse(articulo('n9', 'NOTA', 'Embala bien.', 2), 201)
        : undefined,
    )
    render('/catalogo?tab=articulos')
    await user.click((await grupo('Notas')).getByRole('button', { name: 'Agregar a Notas' }))
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).queryByRole('radiogroup', { name: 'Icono' })).not.toBeInTheDocument()
    await user.type(within(dialogo).getByLabelText('Texto de la nota'), 'E')
    await user.click(within(dialogo).getByRole('button', { name: 'Agregar' }))
    expect(await within(dialogo).findByText('Mínimo 2 caracteres')).toBeInTheDocument()
    await user.type(within(dialogo).getByLabelText('Texto de la nota'), 'mbala bien.')
    await user.click(within(dialogo).getByRole('button', { name: 'Agregar' }))
    await waitFor(() => expect(llamadas(f, 'POST', '/articulos-restringidos')).toHaveLength(1))
    expect(cuerpo(f, 'POST', '/articulos-restringidos')).toMatchObject({ categoria: 'NOTA', titulo: 'Embala bien.', icono: null })
  })

  it('edita, oculta, reordena y elimina (con confirmación)', async () => {
    const user = userEvent.setup()
    const f = servidor((url, init) => {
      const m = init?.method
      if (m === 'PATCH' && url.endsWith('/articulos-restringidos/p1')) return jsonResponse({ ...ARTICULOS[0], ...JSON.parse(String(init!.body)) })
      if (m === 'PUT' && url.endsWith('/articulos-restringidos/orden')) return jsonResponse(ARTICULOS)
      if (m === 'DELETE' && url.endsWith('/articulos-restringidos/p2')) return new Response(null, { status: 204 })
      return undefined
    })
    render('/catalogo?tab=articulos')
    const prohibidos = await grupo('Prohibidos')

    // Editar
    await user.click(prohibidos.getByRole('button', { name: 'Editar Dinero en efectivo' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar artículo' })
    const titulo = within(dialogo).getByLabelText('Título')
    await user.clear(titulo)
    await user.type(titulo, 'Dinero')
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(llamadas(f, 'PATCH', '/articulos-restringidos/p1')).toHaveLength(1))
    expect(cuerpo(f, 'PATCH', '/articulos-restringidos/p1')).toMatchObject({ titulo: 'Dinero', categoria: 'PROHIBIDO', icono: 'dinero' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Ocultar
    await user.click(prohibidos.getByRole('switch', { name: 'Ocultar Animales vivos' }))
    await waitFor(() => expect(llamadas(f, 'PATCH', '/articulos-restringidos/p2')).toHaveLength(1))
    expect(cuerpo(f, 'PATCH', '/articulos-restringidos/p2')).toEqual({ activo: false })

    // Reordenar dentro del grupo
    await user.click(prohibidos.getByRole('button', { name: 'Subir Animales vivos' }))
    await waitFor(() => expect(llamadas(f, 'PUT', '/articulos-restringidos/orden')).toHaveLength(1))
    expect(cuerpo(f, 'PUT', '/articulos-restringidos/orden')).toEqual({ categoria: 'PROHIBIDO', ids: ['p2', 'p1'] })

    // Eliminar con confirmación
    await user.click(prohibidos.getByRole('button', { name: 'Eliminar Animales vivos' }))
    const confirmacion = await screen.findByRole('alertdialog')
    expect(confirmacion).toHaveTextContent('¿Eliminar «Animales vivos»?')
    await user.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(llamadas(f, 'DELETE', '/articulos-restringidos/p2')).toHaveLength(1))
  })
})
