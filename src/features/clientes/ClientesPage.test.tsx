import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Cliente } from '@/types/api'
import { ClientesPage } from './ClientesPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ana: Cliente = {
  id: 'c1',
  nombre: 'Ana López',
  telefono: '0991112233',
  direccion: 'Bolívar 3-20, Ibarra',
  notas: null,
  creadoEn: '2026-09-01T00:00:00.000Z',
  envios: 4,
  monto: 32.5,
  ultimoEnvio: null,
}

function setup(lista: Cliente[] = [ana]) {
  let clientes = [...lista]
  const fetch = mockFetch((url, init) => {
    if (url.includes('/clientes') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body))
      const nuevo = { ...ana, ...body, id: 'c2', envios: 0, monto: 0 }
      clientes = [...clientes, nuevo]
      return jsonResponse(nuevo, 201)
    }
    if (url.includes('/clientes/') && init?.method === 'DELETE') {
      clientes = clientes.filter((c) => !url.endsWith(c.id))
      return new Response(null, { status: 204 })
    }
    if (url.includes('/clientes')) return jsonResponse(clientes)
    return jsonResponse([])
  })
  renderWithProviders(<ClientesPage />, { route: '/clientes', path: '/clientes' })
  return fetch
}

describe('ClientesPage', () => {
  it('lista los clientes con sus ingresos en verde y busca por nombre o teléfono', async () => {
    setup([ana, { ...ana, id: 'c2', nombre: 'Luis Mora', telefono: '0985556677', monto: 0, envios: 0 }])
    expect(await screen.findByText('Ana López')).toBeInTheDocument()
    expect(screen.getByText('+$32,50')).toHaveClass('text-brand-green-text')

    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar clientes' }), '5556')
    expect(screen.queryByText('Ana López')).not.toBeInTheDocument()
    expect(screen.getByText('Luis Mora')).toBeInTheDocument()
  })

  it('registra un cliente nuevo con solo nombre y teléfono', async () => {
    const fetch = setup([])
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar el primero' }))
    const dialogo = await screen.findByRole('dialog')
    await userEvent.type(within(dialogo).getByLabelText('Nombre o razón social'), 'Comercial Otavalo')
    await userEvent.type(within(dialogo).getByLabelText('Teléfono'), '062920333')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar cliente' }))

    expect(await screen.findByText('Comercial Otavalo')).toBeInTheDocument()
    const post = fetch.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(String(post[1]!.body))).toEqual({
      nombre: 'Comercial Otavalo',
      telefono: '062920333',
      direccion: null,
      notas: null,
    })
  })

  it('valida el teléfono antes de enviar', async () => {
    const fetch = setup([])
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo cliente' }))
    const dialogo = await screen.findByRole('dialog')
    await userEvent.type(within(dialogo).getByLabelText('Nombre o razón social'), 'Pedro')
    await userEvent.type(within(dialogo).getByLabelText('Teléfono'), '12')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar cliente' }))
    expect(await within(dialogo).findByText('Teléfono inválido')).toBeInTheDocument()
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('elimina un cliente tras confirmar', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Acciones de Ana López' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))
    const confirmar = await screen.findByRole('dialog')
    expect(within(confirmar).getByText(/Sus 4 envíos se conservan/)).toBeInTheDocument()
    await userEvent.click(within(confirmar).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Aún no hay clientes registrados')).toBeInTheDocument()
  })
})
