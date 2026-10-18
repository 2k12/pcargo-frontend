import { describe, expect, it } from 'vitest'
import { cambiosUsuario, editarUsuarioSchema, generarPassword, nuevoUsuarioSchema, rolesEditables, toNuevoUsuario } from './domain'

describe('usuarios — contraseña generada', () => {
  it('tiene 12 caracteres, letras y números, sin caracteres confundibles', () => {
    for (let i = 0; i < 50; i++) {
      const p = generarPassword()
      expect(p).toHaveLength(12)
      expect(p).toMatch(/\p{L}/u)
      expect(p).toMatch(/\d/)
      expect(p).not.toMatch(/[0O1lI]/)
    }
  })

  it('garantiza letra y número aunque el azar no los traiga', () => {
    // Azar que siempre elige el primer carácter (una letra): igual debe incluir un número.
    expect(generarPassword(12, () => 0)).toMatch(/\d/)
  })
})

describe('usuarios — formulario', () => {
  const base = { nombre: 'Ana Pérez', email: 'ANA@pcargo.ec', password: 'Clave1234' }

  it('el rol CLIENTE exige elegir el cliente; los demás roles no lo envían', () => {
    expect(nuevoUsuarioSchema.safeParse({ ...base, rol: 'CLIENTE' }).success).toBe(false)
    const ok = nuevoUsuarioSchema.parse({ ...base, rol: 'CLIENTE', clienteId: 'c1' })
    expect(toNuevoUsuario(ok)).toEqual({ nombre: 'Ana Pérez', email: 'ana@pcargo.ec', password: 'Clave1234', rol: 'CLIENTE', clienteId: 'c1' })
    const rep = nuevoUsuarioSchema.parse({ ...base, rol: 'REPARTIDOR', clienteId: 'c1' })
    expect(toNuevoUsuario(rep)).not.toHaveProperty('clienteId')
  })

  it('exige la política de contraseñas', () => {
    expect(nuevoUsuarioSchema.safeParse({ ...base, password: 'corta', rol: 'OPERADOR' }).success).toBe(false)
    expect(nuevoUsuarioSchema.safeParse({ ...base, password: 'sololetras', rol: 'OPERADOR' }).success).toBe(false)
  })

  it('al editar solo envía lo que cambió', () => {
    const u = { nombre: 'Ana', email: 'ana@pcargo.ec', rol: 'OPERADOR' as const }
    expect(cambiosUsuario(u, editarUsuarioSchema.parse({ nombre: 'Ana', email: 'ANA@pcargo.ec', rol: 'OPERADOR' }))).toEqual({})
    expect(cambiosUsuario(u, editarUsuarioSchema.parse({ nombre: 'Ana P', email: 'ana@pcargo.ec', rol: 'REPARTIDOR' }))).toEqual({
      nombre: 'Ana P',
      rol: 'REPARTIDOR',
    })
  })

  it('el rol no cambia de/hacia CLIENTE y un ADMIN no se quita el rol a sí mismo', () => {
    expect(rolesEditables({ rol: 'CLIENTE' }, false)).toEqual(['CLIENTE'])
    expect(rolesEditables({ rol: 'OPERADOR' }, false)).toEqual(['ADMIN', 'OPERADOR', 'REPARTIDOR'])
    expect(rolesEditables({ rol: 'ADMIN' }, true)).toEqual(['ADMIN'])
  })
})
