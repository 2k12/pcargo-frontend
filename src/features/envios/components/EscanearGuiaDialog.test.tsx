import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import { EscanearGuiaDialog } from './EscanearGuiaDialog'

afterEach(() => vi.unstubAllGlobals())

const pagina = (datos: { id: string; numeroGuia: number }[]) =>
  jsonResponse({ datos, pagina: 1, porPagina: 100, total: datos.length, totalPaginas: 1 })

describe('EscanearGuiaDialog (panel)', () => {
  it('con el número escrito o el enlace del QR abre el envío de esa guía exacta', async () => {
    const fetch = mockFetch((url) =>
      url.includes('/envios?') ? pagina([{ id: 'otro', numeroGuia: 140461 }, { id: 'e1', numeroGuia: 40461 }]) : jsonResponse({}, 404),
    )
    const onEncontrado = vi.fn()
    renderWithProviders(<EscanearGuiaDialog onEncontrado={onEncontrado} />)
    await userEvent.click(screen.getByRole('button', { name: /Escanear/ }))
    // Sin BarcodeDetector (jsdom) no se abre la cámara: se escribe lo que dice el QR.
    expect(screen.queryByLabelText('Cámara para leer el QR de la guía')).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: 'Número de guía' }), 'https://pcargo.ec/seguimiento/0040461{Enter}')

    await vi.waitFor(() => expect(onEncontrado).toHaveBeenCalledWith('e1'))
    expect(String(fetch.mock.calls[0]![0])).toContain('q=40461')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('avisa si no hay envío con esa guía o si el texto no es un número', async () => {
    mockFetch(() => pagina([]))
    const onEncontrado = vi.fn()
    renderWithProviders(<EscanearGuiaDialog onEncontrado={onEncontrado} />)
    await userEvent.click(screen.getByRole('button', { name: /Escanear/ }))
    const campo = screen.getByRole('textbox', { name: 'Número de guía' })

    await userEvent.type(campo, '777{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay ningún envío con la guía 777')

    await userEvent.clear(campo)
    await userEvent.type(campo, 'abc{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent(/solo los números/)
    expect(onEncontrado).not.toHaveBeenCalled()
  })
})
