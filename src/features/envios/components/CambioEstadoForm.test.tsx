import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CambioEstadoForm } from './CambioEstadoForm'

describe('CambioEstadoForm', () => {
  it('ofrece solo las transiciones permitidas desde EN_REPARTO', () => {
    render(<CambioEstadoForm estado="EN_REPARTO" onTransicion={vi.fn()} />)
    const nombres = screen.getAllByRole('button').map((b) => b.textContent)
    expect(nombres).toEqual(['Marcar entregado', 'No entregado', 'Registrar novedad'])
  })

  it('NO_ENTREGADO exige motivo antes de confirmar', async () => {
    const onTransicion = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<CambioEstadoForm estado="EN_REPARTO" onTransicion={onTransicion} />)

    await user.click(screen.getByRole('button', { name: 'No entregado' }))
    expect(onTransicion).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Motivo (obligatorio)')).toBeInTheDocument()
    const confirmar = screen.getByRole('button', { name: /Confirmar: no entregado/ })
    expect(confirmar).toBeDisabled()

    await user.type(screen.getByLabelText('Motivo (obligatorio)'), '  Destinatario ausente ')
    expect(confirmar).toBeEnabled()
    await user.click(confirmar)
    expect(onTransicion).toHaveBeenCalledWith('NO_ENTREGADO', 'Destinatario ausente')
  })

  it('ENTREGADO no exige nota y envía la nota opcional', async () => {
    const onTransicion = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<CambioEstadoForm estado="EN_REPARTO" onTransicion={onTransicion} />)
    await user.click(screen.getByRole('button', { name: 'Marcar entregado' }))
    expect(onTransicion).toHaveBeenCalledWith('ENTREGADO', '')
  })

  it('tras NO_ENTREGADO ofrece reintentar la entrega', () => {
    render(<CambioEstadoForm estado="NO_ENTREGADO" onTransicion={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Reintentar entrega' })).toBeInTheDocument()
  })

  it('no muestra nada en estados finales', () => {
    const { container } = render(<CambioEstadoForm estado="ENTREGADO" onTransicion={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
