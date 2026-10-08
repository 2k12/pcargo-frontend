import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CarruselCiudades } from './CarruselCiudades'

const ciudades = [
  { id: 1, nombre: 'Ibarra' },
  { id: 2, nombre: 'Atuntaqui' },
  { id: 3, nombre: 'Otavalo' },
  { id: 4, nombre: 'Quito' },
]

describe('CarruselCiudades', () => {
  it('expone la lista de ciudades una sola vez para lectores de pantalla', () => {
    render(<CarruselCiudades ciudades={ciudades} />)
    const region = screen.getByRole('region', { name: 'Ciudades con cobertura' })
    const accesible = within(region).getAllByRole('list').filter((ul) => !ul.closest('[aria-hidden="true"]'))
    expect(accesible).toHaveLength(1)
    expect(within(accesible[0]!).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Ibarra',
      'Atuntaqui',
      'Otavalo',
      'Quito',
    ])
  })

  it('anima una pista decorativa duplicada y con suficientes chips aunque haya pocas ciudades', () => {
    render(<CarruselCiudades ciudades={ciudades} />)
    const pista = screen.getByTestId('carrusel-ciudades')
    expect(pista).toHaveAttribute('aria-hidden', 'true')
    // Desvanece por la izquierda (máscara) antes de llegar a los datos de PCargo.
    expect(pista.className).toContain('mask-image:linear-gradient(to_right,transparent')
    const animada = pista.firstElementChild as HTMLElement
    expect(animada).toHaveClass('animate-marquesina')
    // 4 ciudades → 3 vueltas (12 nombres) por copia, y 2 copias para un bucle sin saltos.
    const copias = animada.querySelectorAll(':scope > ul')
    expect(copias).toHaveLength(2)
    expect(copias[0]!.querySelectorAll('li')).toHaveLength(12)
    expect(animada.style.getPropertyValue('--duracion-marquesina')).toBe('36s')
  })

  it('no muestra nada si aún no hay ciudades', () => {
    const { container } = render(<CarruselCiudades ciudades={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
