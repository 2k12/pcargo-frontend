import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import { DatosPersonalesPage } from './DatosPersonalesPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DatosPersonalesPage', () => {
  it('solo atiende solicitudes del titular: sin plazo de conservación ni depuración, y aclara que nada se borra solo', async () => {
    const llamadas: string[] = []
    mockFetch((url) => {
      llamadas.push(url)
      if (url.includes('/datos-personales/solicitudes')) return jsonResponse({ datos: [], pagina: 1, porPagina: 10, total: 0, totalPaginas: 0 })
      return jsonResponse([])
    })
    renderWithProviders(<DatosPersonalesPage />)

    expect(screen.getByText(/Ley Orgánica de Protección de Datos Personales/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'política de privacidad' })).toHaveAttribute('href', '/privacidad')
    expect(screen.getByTestId('aviso-sin-borrado')).toHaveTextContent('no elimina datos por su cuenta')
    expect(screen.getByRole('region', { name: 'Solicitud de eliminación' })).toBeInTheDocument()
    expect(await screen.findByText('Aún no se ha atendido ninguna solicitud.')).toBeInTheDocument()

    expect(screen.queryByLabelText('Plazo de conservación')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /depurar/i })).not.toBeInTheDocument()
    expect(llamadas.some((u) => u.includes('/politica') || u.includes('/depurar'))).toBe(false)
  })
})
