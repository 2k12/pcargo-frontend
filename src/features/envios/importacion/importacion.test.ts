import { describe, expect, it } from 'vitest'
import {
  calcularCosto,
  envioBorrador,
  filaVacia,
  mapearEncabezados,
  normalizar,
  resolverFormaPago,
  resolverRuta,
  resolverTipo,
  resolverZona,
  validarImportacion,
  agregarCargaAlEnvio,
  type FilaImportacion,
  type ValoresFila,
} from './importacion'
import { RUTAS, TIPOS } from './fixtures'

const ctx = { tipos: TIPOS, rutas: RUTAS }

export const valoresValidos = (extra: Partial<ValoresFila> = {}): ValoresFila => ({
  ...filaVacia('x').valores,
  remitenteNombre: 'Textiles Atuntaqui',
  remitenteTelefono: '0991112233',
  destinatarioNombre: 'Almacén El Sol',
  destinatarioTelefono: '0994445566',
  destinatarioDireccion: 'Av. 10 de Agosto N20-15',
  origen: 'Ibarra',
  destino: 'Quito',
  tipoCarga: 'Paquete',
  cantidad: '2',
  pesoKg: '1,5',
  formaPago: 'Al cobro',
  ...extra,
})

const fila = (id: string, extra: Partial<ValoresFila> = {}): FilaImportacion => ({ id, filaExcel: 2, valores: valoresValidos(extra) })

describe('normalización y búsqueda', () => {
  it('ignora tildes, mayúsculas y espacios', () => {
    expect(normalizar('  Cartón   GRANDE ')).toBe('carton grande')
  })

  it('reconoce tipos por nombre, código o plural', () => {
    expect(resolverTipo('paquetes', TIPOS)?.codigo).toBe('PAQUETE')
    expect(resolverTipo('CARTONES', TIPOS)?.codigo).toBe('CARTON')
    expect(resolverTipo('rollo de tela', TIPOS)?.codigo).toBe('TELA')
    expect(resolverTipo('tela', TIPOS)?.codigo).toBe('TELA')
    expect(resolverTipo('caja', TIPOS)).toBeUndefined()
  })

  it('reconoce forma de pago y zona (vacía = urbana)', () => {
    expect(resolverFormaPago('al cobro')).toBe('AL_COBRO')
    expect(resolverFormaPago('AL_COBRO')).toBe('AL_COBRO')
    expect(resolverFormaPago('efectivo')).toBeUndefined()
    expect(resolverZona('')).toBe('URBANA')
    expect(resolverZona('rural')).toBe('RURAL')
    expect(resolverZona('campo')).toBeUndefined()
  })

  it('solo acepta rutas operativas', () => {
    expect(resolverRuta('ibarra', 'QUITO', RUTAS)?.id).toBe(7)
    expect(resolverRuta('Otavalo', 'Quito', RUTAS)).toBeUndefined()
  })
})

describe('validarImportacion', () => {
  it('una fila válida produce la solicitud de POST /envios con su costo', () => {
    const r = validarImportacion([fila('a', { numeroGuia: '0040461', zona: 'Rural', descripcion: ' Ropa ' })], ctx)
    expect(r.filasConError).toBe(0)
    expect(r.validos).toHaveLength(1)
    expect(r.validos[0]!.solicitud).toEqual({
      remitente: { nombre: 'Textiles Atuntaqui', telefono: '0991112233', direccion: null },
      destinatario: { nombre: 'Almacén El Sol', telefono: '0994445566', direccion: 'Av. 10 de Agosto N20-15' },
      rutaId: 7,
      items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 1.5 }],
      formaPago: 'AL_COBRO',
      zona: 'RURAL',
      descripcion: 'Ropa',
      numeroGuia: '40461',
    })
    expect(r.validos[0]!.costo).toBe(6)
  })

  it('marca cada celda con su error y no arma la solicitud', () => {
    const r = validarImportacion(
      [fila('a', { remitenteTelefono: 'abc', destino: 'Otavalo', tipoCarga: 'Sobre', pesoKg: '2', cantidad: '0', formaPago: 'efectivo', numeroGuia: '12a' })],
      ctx,
    )
    expect(r.errores.get('a')).toEqual({
      numeroGuia: 'Solo números (hasta 12 dígitos)',
      remitenteTelefono: 'Teléfono inválido',
      destino: 'No hay ruta Ibarra → Otavalo',
      cantidad: 'Entero de 1 a 999',
      pesoKg: 'Máx. 0.5 kg por sobre',
      formaPago: 'Pagado, Al cobro, Contrato o Seguro',
    })
    expect(r.validos).toHaveLength(0)
    expect(r.filasConError).toBe(1)
  })

  it('filas con el mismo N.º de guía son un envío con varios tipos; sus datos deben coincidir', () => {
    const r = validarImportacion(
      [fila('a', { numeroGuia: '40461' }), fila('b', { numeroGuia: '0040461', tipoCarga: 'Sobre', cantidad: '1', pesoKg: '0.2' }), fila('c')],
      ctx,
    )
    expect(r.envios).toHaveLength(2)
    expect(r.validos[0]!.solicitud!.items).toEqual([
      { tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 1.5 },
      { tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 0.2 },
    ])
    expect(r.validos[0]!.totalPiezas).toBe(3)

    const distinta = validarImportacion([fila('a', { numeroGuia: '5' }), fila('b', { numeroGuia: '5', destinatarioNombre: 'Otro' })], ctx)
    expect(distinta.errores.get('b')!.destinatarioNombre).toBe('Debe coincidir con la primera fila de la guía 5')
    expect(distinta.validos).toHaveLength(0)
  })

  it('«Envío» agrupa sin N.º de guía: 2 cartones y 1 paquete al mismo destinatario, la fila adicional solo con la carga', () => {
    const soloCarga = (id: string, envio: string, tipoCarga: string, cantidad: string, pesoKg: string): FilaImportacion => {
      const f = filaVacia(id)
      f.valores = { ...f.valores, envio, tipoCarga, cantidad, pesoKg }
      return f
    }
    const r = validarImportacion(
      [
        fila('a', { envio: '1', tipoCarga: 'Cartón', cantidad: '2', pesoKg: '8' }),
        soloCarga('b', '1', 'Paquete', '1', '3'),
        fila('c', { envio: '2', tipoCarga: 'Sobre', cantidad: '1', pesoKg: '0.2' }),
      ],
      ctx,
    )
    expect(r.filasConError).toBe(0)
    expect(r.envios).toHaveLength(2)
    expect(r.validos[0]!.nombre).toBe('del envío 1')
    expect(r.validos[0]!.solicitud).toMatchObject({
      destinatario: { nombre: 'Almacén El Sol' },
      rutaId: 7,
      formaPago: 'AL_COBRO',
      items: [
        { tipoCarga: 'CARTON', cantidad: 2, pesoKg: 8 },
        { tipoCarga: 'PAQUETE', cantidad: 1, pesoKg: 3 },
      ],
    })
    expect(r.validos[0]!.solicitud!.numeroGuia).toBeUndefined()
    expect(r.validos[0]!.totalPiezas).toBe(3)
    // La fila adicional toma de la primera lo que dejó vacío (la vista previa lo muestra en gris).
    expect(r.heredados.get('b')).toMatchObject({ remitenteNombre: 'Textiles Atuntaqui', destino: 'Quito', formaPago: 'Al cobro' })
    expect(r.heredados.has('a')).toBe(false)
  })

  it('si la fila adicional llena un dato distinto, lo marca; un N.º de guía no puede estar en dos envíos', () => {
    const r = validarImportacion(
      [fila('a', { envio: '1' }), fila('b', { envio: '1', destino: 'Ibarra' }), fila('c', { envio: '2', numeroGuia: '9' }), fila('d', { envio: '3', numeroGuia: '009' })],
      ctx,
    )
    expect(r.errores.get('b')!.destino).toBe('Debe coincidir con la primera fila del envío 1')
    expect(r.errores.get('c')!.numeroGuia).toBe('La guía 9 está en otro envío')
    expect(r.errores.get('d')!.numeroGuia).toBe('La guía 9 está en otro envío')
    expect(r.validos).toHaveLength(0)
  })

  it('«Agregar carga» une la fila nueva al envío (le asigna número de envío si no tenía)', () => {
    const filas = [fila('a'), fila('b', { envio: '4' }), fila('c')]
    const conA = agregarCargaAlEnvio(filas, 'a', 'n1')
    expect(conA.map((f) => f.id)).toEqual(['a', 'n1', 'b', 'c'])
    expect(conA[0]!.valores.envio).toBe('5')
    expect(conA[1]!.valores).toMatchObject({ envio: '5', remitenteNombre: '' })
    const conB = agregarCargaAlEnvio(filas, 'b', 'n2')
    expect(conB.map((f) => f.id)).toEqual(['a', 'b', 'n2', 'c'])
    expect(conB[2]!.valores.envio).toBe('4')
    const r = validarImportacion(
      conA.map((f) => (f.id === 'n1' ? { ...f, valores: { ...f.valores, tipoCarga: 'Sobre', cantidad: '1', pesoKg: '0.1' } } : f)),
      ctx,
    )
    expect(r.envios.find((e) => e.filas.includes('n1'))!.filas).toEqual(['a', 'n1'])
  })

  it('calcula el costo con mayoreo por tipo en todo el envío y precio rural', () => {
    expect(calcularCosto([{ tipoCarga: 'TELA', cantidad: 30, pesoKg: 1 }, { tipoCarga: 'TELA', cantidad: 30, pesoKg: 1 }], 'URBANA', TIPOS)).toBe(60)
    expect(calcularCosto([{ tipoCarga: 'TELA', cantidad: 10, pesoKg: 1 }], 'RURAL', TIPOS)).toBe(15)
  })

  it('arma un envío provisional para previsualizar la guía', () => {
    const r = validarImportacion([fila('a')], ctx)
    const e = envioBorrador(r.validos[0]!, TIPOS, 'Operador', new Date('2026-10-18T15:00:00Z'))!
    expect(e).toMatchObject({
      numeroGuia: 0,
      ruta: { id: 7, origen: 'Ibarra', destino: 'Quito' },
      costo: 6,
      items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 1.5, costoUnitario: 3, subtotal: 6 }],
      registro: { fecha: '2026-10-18T15:00:00.000Z', operador: 'Operador' },
    })
  })
})

describe('mapearEncabezados', () => {
  it('acepta cualquier orden, tildes, el asterisco quitado y alias', () => {
    const { indices, faltan } = mapearEncabezados([
      'Destinatario', 'remitente', 'TELEFONO REMITENTE', 'Teléfono destinatario', 'Dirección destinatario',
      'Origen', 'Destino', 'Tipo de carga', 'Cantidad', 'Peso (kg)', 'Forma de pago', 'Guía',
    ])
    expect(faltan).toEqual([])
    expect(indices).toMatchObject({ destinatarioNombre: 0, remitenteNombre: 1, pesoKg: 9, numeroGuia: 11 })
  })

  it('informa las columnas obligatorias que faltan', () => {
    expect(mapearEncabezados(['Remitente']).faltan.map((c) => c.titulo)).toContain('Destinatario')
  })
})
