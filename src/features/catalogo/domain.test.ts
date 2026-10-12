import { describe, expect, it } from 'vitest'
import { tipoCargaFixture } from '@/test/utils'
import {
  articuloSchema,
  cambiosTipo,
  CODIGO_TIPO_REGEX,
  codigoDesdeNombre,
  datosDesdeForm,
  formatearValorCambio,
  formDesdeTipo,
  leerDecimal,
  mover,
  normalizarCodigo,
  TIPO_FORM_VACIO,
  textoCambio,
  tipoCargaSchema,
} from './domain'
import { ICONOS_ARTICULO, iconoArticulo, LISTA_ICONOS_ARTICULO } from './iconos'

const tela = tipoCargaFixture({
  codigo: 'TELA',
  nombre: 'Rollo de tela',
  precio: 1.25,
  precioRural: 1.5,
  mayoreo: { minimoExclusivo: 50, precio: 1 },
  pesoMaxKg: 50,
})

const errores = (v: object) => {
  const r = tipoCargaSchema.safeParse({ ...TIPO_FORM_VACIO, ...v })
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]))
}
const valido = { nombre: 'Caja grande', codigo: 'CAJA_GRANDE', precio: '6', pesoMaxKg: '40' }

describe('código del tipo de carga', () => {
  it('se genera desde el nombre: sin tildes, mayúsculas, guion bajo, empieza con letra y máximo 30', () => {
    expect(codigoDesdeNombre('Caja grande')).toBe('CAJA_GRANDE')
    expect(codigoDesdeNombre('Plumón pequeño')).toBe('PLUMON_PEQUENO')
    expect(codigoDesdeNombre('  20 kg: saco ')).toBe('KG_SACO')
    expect(codigoDesdeNombre('Ñandú (XL)')).toBe('NANDU_XL')
    expect(codigoDesdeNombre('a'.repeat(40))).toHaveLength(30)
    expect(normalizarCodigo('caja-grande xl')).toBe('CAJA_GRANDE_XL')
  })

  it('respeta el patrón del contrato', () => {
    for (const ok of ['SOBRE', 'CAJA_GRANDE', 'T2', 'A'.repeat(30)]) expect(CODIGO_TIPO_REGEX.test(ok)).toBe(true)
    for (const mal of ['S', '2CAJA', 'caja', 'CAJA-GRANDE', '_CAJA', 'A'.repeat(31)]) expect(CODIGO_TIPO_REGEX.test(mal)).toBe(false)
  })
})

describe('formulario de tipo de carga (validaciones del contrato v11)', () => {
  it('acepta un tipo válido; el precio rural vacío es «igual al urbano» y admite coma decimal', () => {
    expect(errores(valido)).toEqual({})
    expect(datosDesdeForm({ ...TIPO_FORM_VACIO, ...valido, precioRural: '7,25' })).toEqual({
      nombre: 'Caja grande',
      precio: 6,
      precioRural: 7.25,
      mayoreo: null,
      pesoMaxKg: 40,
      activo: true,
    })
    expect(datosDesdeForm({ ...TIPO_FORM_VACIO, ...valido }).precioRural).toBeNull()
  })

  it('rechaza nombre, código, precios y peso fuera de rango', () => {
    expect(errores({ ...valido, nombre: 'C' }).nombre).toBe('Mínimo 2 caracteres')
    expect(errores({ ...valido, nombre: 'x'.repeat(41) }).nombre).toBe('Máximo 40 caracteres')
    expect(errores({ ...valido, codigo: 'caja' }).codigo).toMatch(/letra mayúscula/)
    expect(errores({ ...valido, precio: '' }).precio).toBe('Ingresa el precio urbano')
    expect(errores({ ...valido, precio: '0' }).precio).toBe('Debe ser mayor que 0')
    expect(errores({ ...valido, precio: '1000,01' }).precio).toBe('Máximo 1000')
    expect(errores({ ...valido, precio: '1,255' }).precio).toBe('Máximo 2 decimales')
    expect(errores({ ...valido, precio: 'tres' }).precio).toMatch(/Escribe un número/)
    expect(errores({ ...valido, precioRural: '-1' }).precioRural).toMatch(/Escribe un número/)
    expect(errores({ ...valido, pesoMaxKg: '1001' }).pesoMaxKg).toBe('Máximo 1000 kg')
  })

  it('el mayoreo es opcional; si se marca exige entero 1–9999 y un precio menor que el urbano', () => {
    expect(errores({ ...valido, conMayoreo: false, mayoreoMinimo: 'x' })).toEqual({})
    expect(errores({ ...valido, conMayoreo: true })).toEqual({
      mayoreoMinimo: 'Entero de 1 a 9999',
      mayoreoPrecio: 'Ingresa el precio por volumen',
    })
    expect(errores({ ...valido, conMayoreo: true, mayoreoMinimo: '10000', mayoreoPrecio: '5' }).mayoreoMinimo).toBe('Entero de 1 a 9999')
    expect(errores({ ...valido, conMayoreo: true, mayoreoMinimo: '2,5', mayoreoPrecio: '5' }).mayoreoMinimo).toBe('Entero de 1 a 9999')
    expect(errores({ ...valido, conMayoreo: true, mayoreoMinimo: '10', mayoreoPrecio: '6' }).mayoreoPrecio).toBe(
      'Debe ser menor que el precio urbano',
    )
    expect(errores({ ...valido, conMayoreo: true, mayoreoMinimo: '10', mayoreoPrecio: '5,5' })).toEqual({})
    expect(datosDesdeForm({ ...TIPO_FORM_VACIO, ...valido, conMayoreo: true, mayoreoMinimo: '10', mayoreoPrecio: '5,5' }).mayoreo).toEqual({
      minimoExclusivo: 10,
      precio: 5.5,
    })
  })

  it('al editar solo envía lo que cambió', () => {
    const form = formDesdeTipo(tela)
    expect(form).toMatchObject({ precio: '1.25', precioRural: '1.5', conMayoreo: true, mayoreoMinimo: '50', mayoreoPrecio: '1' })
    expect(cambiosTipo(tela, datosDesdeForm(form))).toEqual({})
    expect(cambiosTipo(tela, datosDesdeForm({ ...form, precio: '1,40' }))).toEqual({ precio: 1.4 })
    expect(cambiosTipo(tela, datosDesdeForm({ ...form, precioRural: '', conMayoreo: false }))).toEqual({ precioRural: null, mayoreo: null })
  })

  it('lee decimales con coma o punto', () => {
    expect(leerDecimal('1,5')).toBe(1.5)
    expect(leerDecimal(' 2.25 ')).toBe(2.25)
    expect(leerDecimal('')).toBeUndefined()
    expect(Number.isNaN(leerDecimal('1,2,3'))).toBe(true)
  })
})

describe('historial: cambios formateados', () => {
  it('muestra USD, kg, mayoreo, estado y «igual al urbano»', () => {
    expect(textoCambio({ campo: 'precio', antes: 3, despues: 3.5 })).toBe('Precio urbano: $3,00 → $3,50')
    expect(textoCambio({ campo: 'precioRural', antes: null, despues: 1.5 })).toBe('Precio rural: igual al urbano → $1,50')
    expect(textoCambio({ campo: 'pesoMaxKg', antes: 35, despues: 40.5 })).toBe('Peso máximo: 35 kg → 40,5 kg')
    expect(textoCambio({ campo: 'mayoreo', antes: { minimoExclusivo: 50, precio: 1 }, despues: null })).toBe(
      'Mayoreo: más de 50 → $1,00 → sin mayoreo',
    )
    expect(textoCambio({ campo: 'activo', antes: true, despues: false })).toBe('Estado: Activo → Inactivo')
    expect(textoCambio({ campo: 'nombre', antes: null, despues: 'Caja' })).toBe('Nombre: — → Caja')
    expect(formatearValorCambio('mayoreo.precio', 0.9)).toBe('$0,90')
    expect(formatearValorCambio('campoNuevo', 'x')).toBe('x')
  })
})

describe('utilidades', () => {
  it('mueve un elemento una posición sin salirse de la lista', () => {
    expect(mover(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(mover(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
    const l = ['a', 'b']
    expect(mover(l, 0, -1)).toBe(l)
    expect(mover(l, 1, 1)).toBe(l)
  })

  it('el mapa de iconos cubre los 18 IconoArticulo del contrato y tiene respaldo', () => {
    expect(LISTA_ICONOS_ARTICULO).toHaveLength(18)
    expect(iconoArticulo('dinero')).toBe(ICONOS_ARTICULO.dinero.icon)
    expect(iconoArticulo(null)).toBe(ICONOS_ARTICULO.prohibido.icon)
    expect(iconoArticulo(null, 'alerta')).toBe(ICONOS_ARTICULO.alerta.icon)
  })

  it('artículo: título 2–80, detalle hasta 300 e icono obligatorio salvo en las notas', () => {
    const base = { categoria: 'PROHIBIDO' as const, titulo: 'Armas', detalle: '', icono: 'arma', activo: true }
    expect(articuloSchema.safeParse(base).success).toBe(true)
    expect(articuloSchema.safeParse({ ...base, titulo: 'A' }).success).toBe(false)
    expect(articuloSchema.safeParse({ ...base, detalle: 'x'.repeat(301) }).success).toBe(false)
    expect(articuloSchema.safeParse({ ...base, icono: null }).success).toBe(false)
    expect(articuloSchema.safeParse({ ...base, categoria: 'NOTA', icono: null }).success).toBe(true)
  })
})
