import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CampoFiltro, FiltrosMovil, OpcionesFiltro } from './FiltrosMovil'

describe('FiltrosMovil', () => {
  it('muestra cuántos filtros hay activos y abre la hoja con los controles', async () => {
    render(
      <FiltrosMovil activos={2} onLimpiar={() => {}}>
        <CampoFiltro label="Estado">
          <input aria-label="control de prueba" />
        </CampoFiltro>
      </FiltrosMovil>,
    )
    expect(screen.queryByLabelText('control de prueba')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Filtros (2 activos)' }))
    expect(await screen.findByRole('dialog', { name: 'Filtros' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Estado' })).toContainElement(screen.getByLabelText('control de prueba'))
  })

  it('"Limpiar" se deshabilita sin filtros y "Ver resultados" cierra la hoja', async () => {
    const onLimpiar = vi.fn()
    const { rerender } = render(
      <FiltrosMovil activos={0} onLimpiar={onLimpiar}>
        <p>contenido</p>
      </FiltrosMovil>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    expect(await screen.findByRole('button', { name: 'Limpiar' })).toBeDisabled()

    rerender(
      <FiltrosMovil activos={1} onLimpiar={onLimpiar}>
        <p>contenido</p>
      </FiltrosMovil>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(onLimpiar).toHaveBeenCalledOnce()

    await userEvent.click(screen.getByRole('button', { name: 'Ver resultados' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('OpcionesFiltro', () => {
  it('marca la opción elegida y avisa del cambio', async () => {
    const onChange = vi.fn()
    render(
      <OpcionesFiltro
        label="Periodo"
        value="7d"
        onChange={onChange}
        options={[
          { value: '7d', label: '7 días' },
          { value: '30d', label: '30 días' },
        ]}
      />,
    )
    expect(screen.getByRole('radio', { name: '7 días' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: '30 días' }))
    expect(onChange).toHaveBeenCalledWith('30d')
  })
})
