import { screen } from '@testing-library/react'
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
}

function servidor() {
  const guardar = vi.fn((body: { mesesRetencion: number }) => jsonResponse({ ...politica, mesesRetencion: body.mesesRetencion }))
  const llamadas: string[] = []
  mockFetch((url, init) => {
    llamadas.push(url)
    if (url.endsWith('/datos-personales/politica') && init?.method === 'PUT') return guardar(JSON.parse(init.body as string))
    if (url.endsWith('/datos-personales/politica')) return jsonResponse(politica)
    if (url.includes('/datos-personales/solicitudes')) return jsonResponse({ datos: [], pagina: 1, porPagina: 10, total: 0, totalPaginas: 0 })
    return jsonResponse([])
  })
  return { guardar, llamadas }
}

describe('DatosPersonalesPage', () => {
  it('explica la LOPDP y muestra solo el plazo declarado, aclarando que no se borra nada automáticamente', async () => {
    const { llamadas } = servidor()
    renderWithProviders(<DatosPersonalesPage />)
    expect(screen.getByText(/Ley Orgánica de Protección de Datos Personales/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'política de privacidad' })).toHaveAttribute('href', '/privacidad')
    expect(await screen.findByLabelText('Plazo de conservación')).toHaveValue(12)
    expect(screen.getByTestId('aviso-conservacion')).toHaveTextContent('no borra datos automáticamente')
    expect(screen.getByTestId('aviso-conservacion')).toHaveTextContent('cuando el titular lo solicita')
    expect(screen.queryByRole('button', { name: /depurar/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/depuración/i)).not.toBeInTheDocument()
    expect(llamadas.some((u) => u.includes('/depurar'))).toBe(false)
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
})
