import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { DatosTitular, SolicitudDatos } from '@/types/api'
import { SolicitudEliminacion } from './SolicitudEliminacion'

afterEach(() => {
  vi.unstubAllGlobals()
})

const titular: DatosTitular = {
  telefono: '099 111 2233',
  cliente: { id: 'c1', nombre: 'Textiles Atuntaqui', accesosPortal: 2 },
  envios: { total: 6, terminados: 5, enCurso: 1, anonimizados: 1 },
}

const atendida: SolicitudDatos = {
  id: 's1',
  tipo: 'ELIMINACION',
  nombreTitular: 'María López',
  telefonoFinal: '…2233',
  canal: 'WHATSAPP',
  nota: null,
  fecha: '2026-10-18T20:00:00.000Z',
  atendidaPor: 'Administrador PCargo',
  resultado: { envios: 4, clientes: 1, evidencias: 2, usuariosDesactivados: 2, enCurso: 1 },
}

function servidor() {
  const atender = vi.fn((_body: unknown) => jsonResponse(atendida, 201))
  const fetch = mockFetch((url, init) => {
    if (url.includes('/datos-personales/titular')) return jsonResponse(titular)
    if (url.endsWith('/datos-personales/solicitudes') && init?.method === 'POST') return atender(JSON.parse(init.body as string))
    return jsonResponse([])
  })
  return { fetch, atender }
}

describe('SolicitudEliminacion', () => {
  it('busca el teléfono, muestra qué se borra y qué está en curso, confirma y muestra el resultado', async () => {
    const { fetch, atender } = servidor()
    const user = userEvent.setup()
    renderWithProviders(<SolicitudEliminacion />)

    await user.type(screen.getByLabelText('Teléfono del titular'), '099 111 2233')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(fetch.mock.calls.some(([u]) => String(u).includes('/datos-personales/titular?telefono=099+111+2233'))).toBe(true)

    const resumen = await screen.findByRole('list', { name: 'Qué se elimina' })
    expect(within(resumen).getByText(/envíos terminados: se borran/)).toBeInTheDocument()
    expect(within(resumen).getByText('4')).toBeInTheDocument()
    expect(within(resumen).getByText(/«Textiles Atuntaqui» se elimina y se desactivan 2 accesos al portal/)).toBeInTheDocument()
    expect(within(resumen).getByText(/envíos en curso no se tocan/)).toBeInTheDocument()

    // El nombre del titular es obligatorio.
    await user.click(screen.getByRole('button', { name: /Eliminar datos/ }))
    expect(await screen.findByText('Escribe el nombre del titular')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Nombre del titular'), 'María López')
    await user.click(screen.getByRole('combobox', { name: 'Canal de la solicitud' }))
    await user.click(await screen.findByRole('option', { name: 'WhatsApp' }))
    await user.click(screen.getByRole('button', { name: /Eliminar datos/ }))

    const confirmacion = await screen.findByRole('alertdialog')
    expect(within(confirmacion).getByText('irreversible')).toBeInTheDocument()
    expect(atender).not.toHaveBeenCalled()
    await user.click(within(confirmacion).getByRole('button', { name: 'Eliminar definitivamente' }))

    await vi.waitFor(() => expect(atender).toHaveBeenCalledTimes(1))
    expect(atender.mock.calls[0]![0]).toEqual({ telefono: '099 111 2233', nombreTitular: 'María López', canal: 'WHATSAPP' })
    const resultado = await screen.findByRole('status', { name: 'Resultado de la solicitud' })
    expect(within(resultado).getByText('Datos de María López eliminados')).toBeInTheDocument()
    expect(within(resultado).getByText('· 4 envíos anonimizados')).toBeInTheDocument()
    expect(within(resultado).getByText(/1 envío sigue en curso/)).toBeInTheDocument()
  })

  it('valida el teléfono antes de consultar', async () => {
    const { fetch } = servidor()
    renderWithProviders(<SolicitudEliminacion />)
    await userEvent.type(screen.getByLabelText('Teléfono del titular'), '12')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByText('Escribe un teléfono de 7 a 15 dígitos')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
