import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { PoliticaDatos } from '@/types/api'
import { DatosPersonalesPage } from './DatosPersonalesPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const politica: PoliticaDatos = {
  mesesRetencion: 12,
  ultimaDepuracion: { fecha: '2026-10-18T05:00:00.000Z', envios: 3, clientes: 0, evidencias: 1 },
  pendientes: { envios: 7, clientes: 2 },
}

function servidor() {
  const depurar = vi.fn((body: { simular?: boolean }) =>
    jsonResponse({ simulado: !!body.simular, envios: 7, clientes: 2, evidencias: 4, fechaCorte: '2025-10-18T05:00:00.000Z' }),
  )
  const guardar = vi.fn((body: { mesesRetencion: number }) => jsonResponse({ ...politica, mesesRetencion: body.mesesRetencion }))
  mockFetch((url, init) => {
    if (url.endsWith('/datos-personales/politica') && init?.method === 'PUT') return guardar(JSON.parse(init.body as string))
    if (url.endsWith('/datos-personales/politica')) return jsonResponse(politica)
    if (url.endsWith('/datos-personales/depurar')) return depurar(JSON.parse(init!.body as string))
    if (url.includes('/datos-personales/solicitudes')) return jsonResponse({ datos: [], pagina: 1, porPagina: 10, total: 0, totalPaginas: 0 })
    return jsonResponse([])
  })
  return { depurar, guardar }
}

describe('DatosPersonalesPage', () => {
  it('explica la LOPDP y muestra el plazo, la última depuración y lo pendiente', async () => {
    servidor()
    renderWithProviders(<DatosPersonalesPage />)
    expect(screen.getByText(/Ley Orgánica de Protección de Datos Personales/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'política de privacidad' })).toHaveAttribute('href', '/privacidad')
    expect(await screen.findByLabelText('Plazo de conservación')).toHaveValue(12)
    expect(screen.getByTestId('pendiente-depurar')).toHaveTextContent('7 envíos · 2 clientes')
    expect(screen.getByText('Aún no se ha atendido ninguna solicitud.')).toBeInTheDocument()
  })

  it('valida el rango de meses y guarda la política', async () => {
    const { guardar } = servidor()
    const user = userEvent.setup()
    renderWithProviders(<DatosPersonalesPage />)
    const meses = await screen.findByLabelText('Plazo de conservación')
    await user.clear(meses)
    await user.type(meses, '6')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Mínimo 12 meses')).toBeInTheDocument()
    expect(guardar).not.toHaveBeenCalled()

    await user.clear(meses)
    await user.type(meses, '24')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await vi.waitFor(() => expect(guardar).toHaveBeenCalledWith({ mesesRetencion: 24 }))
  })

  it('«Depurar ahora» primero simula, muestra los conteos y ejecuta solo al confirmar', async () => {
    const { depurar } = servidor()
    const user = userEvent.setup()
    renderWithProviders(<DatosPersonalesPage />)
    await user.click(await screen.findByRole('button', { name: 'Depurar ahora' }))

    const dialogo = await screen.findByRole('alertdialog')
    expect(depurar).toHaveBeenCalledTimes(1)
    expect(depurar.mock.calls[0]![0]).toEqual({ simular: true })
    expect(within(dialogo).getByTestId('simulacion-depuracion')).toHaveTextContent('7 envíos anonimizados')
    expect(within(dialogo).getByTestId('simulacion-depuracion')).toHaveTextContent('2 clientes inactivos eliminados')

    await user.click(within(dialogo).getByRole('button', { name: 'Depurar' }))
    await vi.waitFor(() => expect(depurar).toHaveBeenCalledTimes(2))
    expect(depurar.mock.calls[1]![0]).toEqual({ simular: false })
  })
})
