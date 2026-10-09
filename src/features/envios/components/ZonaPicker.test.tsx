import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { Zona } from '@/types/api'
import { ZonaPicker } from './ZonaPicker'

function Controlado() {
  const [zona, setZona] = useState<Zona>('URBANA')
  return <ZonaPicker value={zona} onChange={setZona} />
}

describe('ZonaPicker', () => {
  it('es un solo tab-stop y cambia de zona con las flechas', async () => {
    const user = userEvent.setup()
    render(<Controlado />)
    const urbana = screen.getByRole('radio', { name: 'Urbana' })
    const rural = screen.getByRole('radio', { name: 'Rural' })
    expect(urbana).toHaveAttribute('tabindex', '0')
    expect(rural).toHaveAttribute('tabindex', '-1')

    await user.tab()
    expect(urbana).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(rural).toHaveFocus()
    expect(rural).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowRight}')
    expect(urbana).toHaveAttribute('aria-checked', 'true')
  })
})
