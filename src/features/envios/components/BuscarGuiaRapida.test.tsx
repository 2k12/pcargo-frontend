import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { jsonResponse, mockFetch, renderWithProviders, simularMovil } from '@/test/utils'
import type { Envio } from '@/types/api'
import { BuscarGuiaRapida } from './BuscarGuiaRapida'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

afterEach(() => vi.unstubAllGlobals())

const envio = (id: string, numeroGuia: number, guiaFisica: number | null) =>
  ({
    id,
    numeroGuia,
    guiaFisica,
    estado: 'REGISTRADO',
    destinatario: { nombre: `Cliente ${id}`, telefono: '0994445566', direccion: 'Quito' },
    ruta: { id: 7, origen: 'Ibarra', destino: 'Quito' },
  }) as unknown as Envio

/** Muestra la URL actual para comprobar a dónde navega la búsqueda. */
function Ubicacion() {
  const { pathname, search } = useLocation()
  return <output aria-label="Ubicación">{`${pathname}${search}`}</output>
}

function montar(respuestas: Record<string, Envio[]>, talonario?: Record<string, unknown>) {
  const fetch = mockFetch((url) => {
    const m = url.match(/\/envios\/buscar-guia\/(\d+)$/)
    if (m) return jsonResponse(respuestas[m[1]!] ?? [])
    if (url.includes('/talonarios/guia/')) {
      return talonario ? jsonResponse(talonario) : jsonResponse({ error: { code: 'NO_ENCONTRADO', message: 'No existe' } }, 404)
    }
    return jsonResponse([])
  })
  renderWithProviders(
    <>
      <BuscarGuiaRapida />
      <Ubicacion />
      <Toaster />
    </>,
    { route: '/panel', path: '*' },
  )
  return fetch
}

const ubicacion = () => screen.getByRole('status', { name: 'Ubicación' })

describe('BuscarGuiaRapida (barra superior, contrato v21)', () => {
  it('un resultado: busca con buscar-guia (sin ceros) y abre ese envío en Envíos', async () => {
    const fetch = montar({ '40425': [envio('e1', 40425, null)] })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar guía' }), '0040425{Enter}')
    await vi.waitFor(() => expect(ubicacion()).toHaveTextContent('/envios?guia=40425&envio=e1'))
    expect(String(fetch.mock.calls[0]![0])).toContain('/envios/buscar-guia/40425')
    expect(screen.getByRole('searchbox', { name: 'Buscar guía' })).toHaveValue('')
  })

  it('dos resultados: pide elegir entre «N.º sistema» y «Guía física» y abre el elegido', async () => {
    montar({ '40425': [envio('es', 40425, null), envio('ef', 12, 40425)] })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar guía' }), '40425{Enter}')
    const eleccion = await screen.findByRole('dialog', { name: '¿Cuál guía 40425?' })
    const opciones = within(eleccion).getAllByRole('button', { name: /40425/ })
    expect(opciones.map((b) => b.textContent)).toEqual([expect.stringContaining('N.º sistema 40425'), expect.stringContaining('Guía física 40425')])
    await userEvent.click(within(eleccion).getByRole('button', { name: /Guía física 40425/ }))
    await vi.waitFor(() => expect(ubicacion()).toHaveTextContent('/envios?guia=40425&envio=ef'))
  })

  it('sin resultados: talonario disponible → va a Envíos para registrarla; si no, avisa', async () => {
    montar(
      {},
      { numeroGuia: 501, estado: 'DISPONIBLE', envioId: null, motivo: null, actualizadoEn: null, talonarioId: 't1', nota: null, creadoEn: new Date().toISOString() },
    )
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar guía' }), '501{Enter}')
    await vi.waitFor(() => expect(ubicacion()).toHaveTextContent('/envios?guia=501'))
  })

  it('sin resultados ni talonario: toast «No hay ningún envío con la guía N» y no navega', async () => {
    montar({})
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar guía' }), '777{Enter}')
    expect(await screen.findByText('No hay ningún envío con la guía 777')).toBeInTheDocument()
    expect(ubicacion()).toHaveTextContent(/^\/panel$/)
  })

  it('un texto no numérico va a la búsqueda normal de Envíos', async () => {
    const fetch = montar({})
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar guía' }), 'Ana Pérez{Enter}')
    await vi.waitFor(() => expect(ubicacion()).toHaveTextContent('/envios?q=Ana%20P%C3%A9rez'))
    expect(fetch.mock.calls.some(([u]) => String(u).includes('buscar-guia'))).toBe(false)
  })

  it('«/» enfoca el campo en escritorio, salvo si ya se escribe en otro campo', async () => {
    montar({})
    const campo = screen.getByRole('searchbox', { name: 'Buscar guía' })
    await userEvent.keyboard('/')
    expect(campo).toHaveFocus()
    expect(campo).toHaveValue('')
    // Ya escribiendo en un campo, «/» se escribe normalmente.
    await userEvent.keyboard('/')
    expect(campo).toHaveValue('/')
  })

  it('en móvil es una lupa que despliega el campo y se puede cerrar', async () => {
    simularMovil()
    montar({ '40425': [envio('e1', 40425, null)] })
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Buscar guía' }))
    const campo = screen.getByRole('searchbox', { name: 'Buscar guía' })
    expect(campo).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar búsqueda' }))
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Buscar guía' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar guía' }), '40425{Enter}')
    await vi.waitFor(() => expect(ubicacion()).toHaveTextContent('/envios?guia=40425&envio=e1'))
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })
})
