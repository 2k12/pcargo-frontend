import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import { EnviosPage } from './EnviosPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EnviosPage', () => {
  it('toma los filtros de la URL, los envía a la API y permite limpiarlos', async () => {
    const fetch = mockFetch(() => jsonResponse([]))
    renderWithProviders(<EnviosPage />, { route: '/envios?estado=ENTREGADO&formaPago=AL_COBRO', path: '/envios' })

    expect(await screen.findByText('No hay envíos')).toBeInTheDocument()
    const urls = () => fetch.mock.calls.map(([u]) => String(u)).filter((u) => u.includes('/envios'))
    expect(urls().some((u) => u.includes('estado=ENTREGADO') && u.includes('formaPago=AL_COBRO'))).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: /Limpiar filtros/ }))
    expect(screen.queryByRole('button', { name: /Limpiar filtros/ })).not.toBeInTheDocument()
    await vi.waitFor(() => expect(urls().at(-1)).not.toContain('estado='))
  })
})
