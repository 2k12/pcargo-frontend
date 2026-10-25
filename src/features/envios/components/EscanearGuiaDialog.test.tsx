import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import { hoyEC } from '../fechaGuia'
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

  it('si el número no es envío pero es de un talonario (v20): disponible → «Registrar esta guía»; anulada → motivo', async () => {
    const creadoEn = new Date(Date.now() - 2 * 86_400_000).toISOString()
    const fetch = mockFetch((url) => {
      if (url.includes('/envios?')) return pagina([])
      if (url.endsWith('/talonarios/guia/40501')) {
        return jsonResponse({ numeroGuia: 40501, estado: 'DISPONIBLE', envioId: null, motivo: null, actualizadoEn: null, talonarioId: 't1', nota: 'Camión Quito', creadoEn })
      }
      if (url.endsWith('/talonarios/guia/40502')) {
        return jsonResponse({ numeroGuia: 40502, estado: 'ANULADA', envioId: null, motivo: 'Se mojó', actualizadoEn: creadoEn, talonarioId: 't1', nota: null, creadoEn })
      }
      if (url.includes('/talonarios/guia/')) return jsonResponse({ error: { code: 'NO_ENCONTRADO', message: 'No existe' } }, 404)
      return jsonResponse([])
    })
    const onEncontrado = vi.fn()
    renderWithProviders(<EscanearGuiaDialog onEncontrado={onEncontrado} />)
    await userEvent.click(screen.getByRole('button', { name: /Escanear/ }))
    const campo = screen.getByRole('textbox', { name: 'Número de guía' })

    await userEvent.type(campo, '0040502{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('La guía 0040502 está anulada: Se mojó')
    expect(screen.queryByRole('button', { name: 'Registrar esta guía' })).not.toBeInTheDocument()

    await userEvent.clear(campo)
    await userEvent.type(campo, '999{Enter}')
    expect(await screen.findByText('No hay ningún envío con la guía 999.')).toBeInTheDocument()

    await userEvent.clear(campo)
    await userEvent.type(campo, 'https://pcargo.ec/seguimiento/0040501{Enter}')
    expect(await screen.findByText(/0040501 es de un talonario y todavía no está registrada/)).toBeInTheDocument()
    expect(screen.getByText('Talonario: Camión Quito')).toBeInTheDocument()
    expect(fetch.mock.calls.some(([u]) => String(u).endsWith('/talonarios/guia/40501'))).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Registrar esta guía' }))
    const formulario = await screen.findByRole('dialog', { name: 'Registrar guía 0040501' })
    expect(within(formulario).getByLabelText('N.º de guía')).toHaveValue('0040501')
    expect(within(formulario).getByLabelText('Fecha de la guía')).toHaveAttribute('min', hoyEC(Date.parse(creadoEn)))
    expect(onEncontrado).not.toHaveBeenCalled()
  })
})
