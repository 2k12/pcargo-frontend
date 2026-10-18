import { describe, expect, it } from 'vitest'
import { porAnonimizar, resumenSolicitud, titularSinDatos } from './domain'

describe('datos personales — solicitudes', () => {
  it('cuenta lo que una solicitud anonimiza y si el teléfono no tiene datos', () => {
    const t = { telefono: '099', cliente: null, envios: { total: 5, terminados: 4, enCurso: 1, anonimizados: 1 } }
    expect(porAnonimizar(t)).toBe(3)
    expect(titularSinDatos(t)).toBe(false)
    expect(titularSinDatos({ ...t, envios: { total: 0, terminados: 0, enCurso: 0, anonimizados: 0 } })).toBe(true)
  })

  it('resume el resultado sin mencionar lo que es cero (salvo los envíos)', () => {
    expect(resumenSolicitud({ envios: 2, clientes: 1, evidencias: 0, usuariosDesactivados: 2, enCurso: 0 })).toEqual([
      '2 envíos anonimizados',
      '1 cliente eliminado',
      '2 accesos al portal desactivados',
    ])
  })
})
