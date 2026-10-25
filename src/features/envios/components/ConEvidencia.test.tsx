import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { EvidenciaEntrega } from '@/types/api'
import { ConEvidencia } from './ConEvidencia'

const evidencia: EvidenciaEntrega = {
  recibidoPor: 'María Andrade',
  tipo: 'image/jpeg',
  bytes: 1000,
  subidaEn: '2026-10-08T15:10:00.000Z',
  subidaPor: null,
}

describe('ConEvidencia', () => {
  it('no muestra nada sin evidencia', () => {
    const { container } = render(<ConEvidencia envio={{ evidencia: null }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('evidencia completa', () => {
    render(<ConEvidencia envio={{ evidencia }} />)
    expect(screen.getByRole('img', { name: 'Con prueba de entrega' })).toBeInTheDocument()
  })

  it('indica evidencia incompleta si falta el nombre o la foto (v19)', () => {
    const { rerender } = render(<ConEvidencia envio={{ evidencia: { ...evidencia, recibidoPor: null } }} />)
    const sinNombre = screen.getByRole('img', { name: /Prueba de entrega incompleta: falta el nombre/ })
    expect(sinNombre.parentElement?.title).not.toMatch(/null/)

    rerender(<ConEvidencia envio={{ evidencia: { ...evidencia, tipo: null, bytes: null } }} />)
    expect(screen.getByRole('img', { name: /Prueba de entrega incompleta: falta la foto/ })).toBeInTheDocument()
  })
})
