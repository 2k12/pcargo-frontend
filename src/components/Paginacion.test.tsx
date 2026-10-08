import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { rangoPagina } from '@/lib/paginacion'
import { Paginacion } from './Paginacion'

describe('rangoPagina', () => {
  it('calcula el rango visible y lo recorta al total', () => {
    expect(rangoPagina(1, 20, 135)).toEqual({ desde: 1, hasta: 20 })
    expect(rangoPagina(7, 20, 135)).toEqual({ desde: 121, hasta: 135 })
    expect(rangoPagina(1, 20, 0)).toEqual({ desde: 0, hasta: 0 })
  })
})

describe('Paginacion', () => {
  it('muestra el resumen y navega entre páginas', async () => {
    const onPagina = vi.fn()
    render(<Paginacion pagina={2} porPagina={20} total={135} totalPaginas={7} onPagina={onPagina} />)
    expect(screen.getByText('21–40 de 135')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 7')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }))
    await userEvent.click(screen.getByRole('button', { name: 'Última página' }))
    await userEvent.click(screen.getByRole('button', { name: 'Primera página' }))
    expect(onPagina.mock.calls.map(([p]) => p)).toEqual([3, 1, 7, 1])
  })

  it('deshabilita los extremos y la navegación mientras carga', () => {
    const { rerender } = render(
      <Paginacion pagina={1} porPagina={20} total={30} totalPaginas={2} onPagina={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeEnabled()
    rerender(<Paginacion pagina={1} porPagina={20} total={30} totalPaginas={2} onPagina={() => {}} cargando />)
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()
  })

  it('sin resultados lo indica', () => {
    render(<Paginacion pagina={1} porPagina={20} total={0} totalPaginas={0} onPagina={() => {}} />)
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
    expect(screen.getByText('Página 0 de 0')).toBeInTheDocument()
  })
})
