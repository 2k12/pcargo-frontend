import { describe, expect, it } from 'vitest'
import type { Cliente } from '@/types/api'
import { buscarClientes, clientePorTelefono, digitos, normalizar, ordenarClientes } from './domain'

const cliente = (id: string, nombre: string, telefono: string, extra: Partial<Cliente> = {}): Cliente => ({
  id,
  nombre,
  telefono,
  direccion: null,
  notas: null,
  creadoEn: '2026-09-01T00:00:00.000Z',
  consentimientoEn: '2026-10-08T15:00:00.000Z',
  envios: 0,
  monto: 0,
  ultimoEnvio: null,
  ...extra,
})

const clientes = [
  cliente('1', 'Ferretería Imbabura', '06 295 0222', { envios: 3, monto: 20, ultimoEnvio: '2026-10-01T00:00:00Z' }),
  cliente('2', 'Ana López', '0991112233', { envios: 8, monto: 15, ultimoEnvio: '2026-10-07T00:00:00Z' }),
  cliente('3', 'Comercial La Ferre', '0987654321'),
]

describe('clientes/domain', () => {
  it('normaliza texto y teléfonos', () => {
    expect(normalizar('  Ferretería ')).toBe('ferreteria')
    expect(digitos('+593 99-111 2233')).toBe('593991112233')
  })

  it('busca sin tildes, primero por inicio de palabra y luego por contenido o teléfono', () => {
    expect(buscarClientes(clientes, 'ferre').map((c) => c.id)).toEqual(['3', '1'])
    expect(buscarClientes(clientes, 'FERRETERIA').map((c) => c.id)).toEqual(['1'])
    expect(buscarClientes(clientes, '0222').map((c) => c.id)).toEqual(['1'])
    expect(buscarClientes(clientes, 'zzz')).toEqual([])
    expect(buscarClientes(clientes, '', 2)).toHaveLength(2)
  })

  it('reconoce a un cliente por su teléfono aunque esté escrito distinto', () => {
    expect(clientePorTelefono(clientes, '099-111-2233')?.id).toBe('2')
    expect(clientePorTelefono(clientes, '099')).toBeUndefined()
  })

  it('ordena por nombre, envíos, monto o actividad reciente', () => {
    expect(ordenarClientes(clientes, 'nombre').map((c) => c.id)).toEqual(['2', '3', '1'])
    expect(ordenarClientes(clientes, 'envios').map((c) => c.id)).toEqual(['2', '1', '3'])
    expect(ordenarClientes(clientes, 'monto').map((c) => c.id)).toEqual(['1', '2', '3'])
    expect(ordenarClientes(clientes, 'reciente').map((c) => c.id)).toEqual(['2', '1', '3'])
  })
})
