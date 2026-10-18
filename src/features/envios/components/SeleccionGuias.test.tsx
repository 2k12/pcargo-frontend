import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderWithProviders } from '@/test/utils'
import type { Envio, Estado } from '@/types/api'
import { SeleccionGuias } from './SeleccionGuias'

afterEach(() => {
  vi.unstubAllGlobals()
})

const envio = (id: string, numeroGuia: number, estado: Estado) => ({ id, numeroGuia, estado }) as Envio

function servidor(asignar = vi.fn((body: { envioIds: string[] }) => jsonResponse({ asignados: body.envioIds.length }))) {
  mockFetch((url, init) => {
    if (url.endsWith('/usuarios/repartidores')) return jsonResponse([{ id: 'u3', nombre: 'Rider Uno' }, { id: 'u4', nombre: 'Ana Moto' }])
    if (url.endsWith('/envios/asignar') && init?.method === 'POST') return asignar(JSON.parse(init.body as string))
    return jsonResponse([])
  })
  return asignar
}

describe('SeleccionGuias — asignar repartidor', () => {
  it('asigna a todos los seleccionados que no terminaron y limpia la selección', async () => {
    const asignar = servidor()
    const onLimpiar = vi.fn()
    renderWithProviders(
      <SeleccionGuias
        envios={[envio('e1', 101, 'EN_TRANSITO'), envio('e2', 102, 'REGISTRADO'), envio('e3', 103, 'ENTREGADO')]}
        onLimpiar={onLimpiar}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Asignar repartidor' }))
    // Los repartidores se ofrecen ordenados por nombre.
    const opciones = await screen.findAllByRole('menuitem')
    expect(opciones.map((o) => o.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Ana Moto'), expect.stringContaining('Rider Uno')]))
    await userEvent.click(screen.getByRole('menuitem', { name: /Rider Uno/ }))

    await vi.waitFor(() => expect(asignar).toHaveBeenCalledTimes(1))
    // La guía entregada se omite: el servidor rechazaría todo el lote.
    expect(asignar.mock.calls[0]![0]).toEqual({ envioIds: ['e1', 'e2'], repartidorId: 'u3' })
    await vi.waitFor(() => expect(onLimpiar).toHaveBeenCalled())
  })

  it('«Quitar asignación» envía repartidorId null', async () => {
    const asignar = servidor()
    renderWithProviders(<SeleccionGuias envios={[envio('e1', 101, 'EN_REPARTO')]} onLimpiar={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Asignar repartidor' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Quitar asignación' }))
    await vi.waitFor(() => expect(asignar).toHaveBeenCalledWith({ envioIds: ['e1'], repartidorId: null }))
  })

  it('no llama al servidor si todas las guías ya terminaron', async () => {
    const asignar = servidor()
    renderWithProviders(<SeleccionGuias envios={[envio('e3', 103, 'CANCELADO')]} onLimpiar={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Asignar repartidor' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /Rider Uno/ }))
    await new Promise((r) => setTimeout(r, 50))
    expect(asignar).not.toHaveBeenCalled()
  })
})
