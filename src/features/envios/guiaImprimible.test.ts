import { describe, expect, it } from 'vitest'
import type { Envio } from '@/types/api'
import { datosGuia, EMPRESA_GUIA, fechaHoraEcuador, numeroGuiaImpreso, rutaGuia } from './guiaImprimible'

const ORIGEN = 'https://pcargo.ec'

const base: Envio = {
  id: 'e1',
  numeroGuia: 40461,
  clienteId: null,
  remitente: { nombre: 'Textiles Atuntaqui', telefono: '0991112233', direccion: null },
  destinatario: { nombre: 'Almacén El Sol', telefono: '0994445566', direccion: 'Av. 10 de Agosto N20-15' },
  ruta: { id: 13, origen: 'Atuntaqui', destino: 'Quito' },
  items: [
    { tipoCarga: 'PAQUETE', cantidad: 5, pesoKg: 2, costoUnitario: 3, subtotal: 15 },
    { tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 0.2, costoUnitario: 3, subtotal: 3 },
    { tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 1, costoUnitario: 3, subtotal: 6 },
    { tipoCarga: 'TELA', cantidad: 3, pesoKg: 8, costoUnitario: 1.25, subtotal: 3.75 },
    { tipoCarga: 'PLUMON_GRANDE', cantidad: 2, pesoKg: 4, costoUnitario: 4, subtotal: 8 },
  ],
  totalPiezas: 13,
  pesoTotalKg: 46.2,
  zona: 'URBANA',
  descripcion: '  Ropa y documentos ',
  costo: 35.75,
  costoAdicional: 0,
  formaPago: 'AL_COBRO',
  estado: 'EN_TRANSITO',
  // 03:24 UTC = 22:24 del día anterior en Ecuador (UTC−5)
  registro: { fecha: '2026-10-08T03:24:55.786Z', operador: 'Operador Ibarra' },
  entrega: null,
  evidencia: null,
  origen: { canal: 'PANEL', integracionId: null, integracion: null },
  referenciaExterna: null,
  creadoEn: '2026-10-08T03:24:55.786Z',
  actualizadoEn: '2026-10-08T03:24:55.786Z',
  repartidor: null,
  asignadoEn: null,
  anonimizadoEn: null,
}

describe('numeroGuiaImpreso', () => {
  it.each([
    [40461, '0040461'],
    [7, '0000007'],
    [1234567, '1234567'],
    [123456789, '123456789'],
  ])('%i → %s', (n, esperado) => {
    expect(numeroGuiaImpreso(n)).toBe(esperado)
  })
})

describe('rutaGuia y datos de la empresa', () => {
  it('la banda muestra la ruta del envío; si es urbano, solo la ciudad', () => {
    expect(rutaGuia({ origen: 'Ibarra', destino: 'Quito' })).toBe('IBARRA - QUITO')
    expect(rutaGuia({ origen: 'Otavalo', destino: 'Otavalo' })).toBe('OTAVALO')
    expect(datosGuia(base, ORIGEN).ruta).toBe('ATUNTAQUI - QUITO')
  })

  it('los teléfonos ya no incluyen el 099 389 3803', () => {
    expect(EMPRESA_GUIA.telefonos).not.toContain('3803')
    expect(EMPRESA_GUIA.telefonos).toBe('Telf.: 06 263 2669 / 099 801 4093')
  })
})

describe('datosGuia', () => {
  it('rellena con ceros el número, nombra el archivo y arma las URL del QR y los términos', () => {
    const d = datosGuia(base, `${ORIGEN}/`)
    expect(d.numero).toBe('0040461')
    expect(d.nombreArchivo).toBe('guia-0040461.pdf')
    expect(d.urlSeguimiento).toBe('https://pcargo.ec/seguimiento/40461')
    expect(d.urlTerminos).toBe('https://pcargo.ec/terminos')
    expect(d.aceptacion).toContain('https://pcargo.ec/terminos')
  })

  it('usa el origen de la página por defecto', () => {
    expect(datosGuia(base).urlSeguimiento).toBe(`${window.location.origin}/seguimiento/40461`)
  })

  it('cuenta las piezas por tipo (sumando líneas) y agrupa tela y plumones en OTROS', () => {
    const { piezas } = datosGuia(base, ORIGEN)
    expect(piezas).toEqual({
      total: '13',
      sobres: '1',
      valijas: '',
      paquetes: '7',
      cartones: '',
      otros: '3 rollos de tela, 2 plumones grandes',
    })
  })

  it('cualquier tipo sin columna propia (incluidos los nuevos) va a OTROS con su nombre del catálogo', () => {
    const envio = {
      ...base,
      items: [
        { tipoCarga: 'CAJA_GRANDE', cantidad: 2, pesoKg: 10, costoUnitario: 5, subtotal: 10 },
        { tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 0.2, costoUnitario: 3, subtotal: 3 },
        { tipoCarga: 'NEVERA', cantidad: 1, pesoKg: 40, costoUnitario: 15, subtotal: 15 },
      ],
    }
    const { piezas } = datosGuia(envio, ORIGEN, [{ codigo: 'CAJA_GRANDE', nombre: 'Caja grande' }])
    // Sin catálogo para NEVERA: se usa su código legible.
    expect(piezas).toMatchObject({ total: '4', sobres: '1', otros: '2 cajas grandes, 1 nevera' })
  })

  it('deja vacías las columnas sin unidades', () => {
    const { piezas } = datosGuia(
      { ...base, items: [{ tipoCarga: 'CARTON', cantidad: 4, pesoKg: 10, costoUnitario: 3, subtotal: 12 }] },
      ORIGEN,
    )
    expect(piezas).toEqual({ total: '4', sobres: '', valijas: '', paquetes: '', cartones: '4', otros: '' })
  })

  it('marca solo la casilla de la forma de pago, en el orden de la guía física', () => {
    const { pago } = datosGuia(base, ORIGEN)
    expect(pago).toEqual([
      { etiqueta: 'PAGADO', marcada: false },
      { etiqueta: 'AL COBRO', marcada: true },
      { etiqueta: 'CONTRATO', marcada: false },
      { etiqueta: 'SEGURO', marcada: false },
    ])
    expect(datosGuia({ ...base, formaPago: 'SEGURO' }, ORIGEN).pago.filter((p) => p.marcada).map((p) => p.etiqueta)).toEqual([
      'SEGURO',
    ])
  })

  it('toma la ciudad del remitente del origen y la del destinatario del destino de la ruta', () => {
    const d = datosGuia(base, ORIGEN)
    expect(d.remitente).toEqual({ nombre: 'Textiles Atuntaqui', direccion: '', ciudad: 'Atuntaqui', telefono: '0991112233' })
    expect(d.destinatario).toEqual({
      nombre: 'Almacén El Sol',
      direccion: 'Av. 10 de Agosto N20-15',
      ciudad: 'Quito',
      telefono: '0994445566',
    })
    expect(datosGuia({ ...base, remitente: { ...base.remitente, direccion: 'Sucre 5-12' } }, ORIGEN).remitente.direccion).toBe(
      'Sucre 5-12',
    )
  })

  it('formatea peso, valor en USD es-EC, descripción y zona rural', () => {
    const d = datosGuia(base, ORIGEN)
    expect(d.peso).toBe('46,2 kg')
    expect(d.valor).toMatch(/^\$\s?35,75$/)
    expect(d.descripcion).toBe('Ropa y documentos')
    expect(d.zona).toBe('')
    expect(datosGuia({ ...base, zona: 'RURAL', descripcion: null }, ORIGEN)).toMatchObject({ zona: 'ZONA RURAL', descripcion: '' })
  })

  it('registro en hora de Ecuador; entrega en blanco mientras no se entrega', () => {
    const d = datosGuia(base, ORIGEN)
    expect(d.registro).toEqual({ fecha: '07/10/2026', hora: '22:24', operador: 'Operador Ibarra' })
    expect(d.entrega).toEqual({ fecha: '', hora: '', operador: '', recibidoPor: '' })
  })

  it('un intento fallido (NO_ENTREGADO) no rellena la entrega', () => {
    const d = datosGuia(
      {
        ...base,
        estado: 'NO_ENTREGADO',
        entrega: { resultado: 'NO_ENTREGADO', fecha: '2026-10-08T15:00:00.000Z', operador: 'Admin', nota: 'Cerrado' },
      },
      ORIGEN,
    )
    expect(d.entrega).toEqual({ fecha: '', hora: '', operador: '', recibidoPor: '' })
  })

  it('si ya está ENTREGADO rellena fecha, hora, operador y quién recibió', () => {
    const d = datosGuia(
      {
        ...base,
        estado: 'ENTREGADO',
        entrega: { resultado: 'ENTREGADO', fecha: '2026-10-08T15:05:00.000Z', operador: 'Repartidor Quito', nota: null },
        evidencia: {
          recibidoPor: 'María Andrade',
          tipo: 'image/jpeg',
          bytes: 1000,
          subidaEn: '2026-10-08T15:10:00.000Z',
          subidaPor: 'Repartidor Quito',
        },
      },
      ORIGEN,
    )
    expect(d.entrega).toEqual({ fecha: '08/10/2026', hora: '10:05', operador: 'Repartidor Quito', recibidoPor: 'María Andrade' })
  })

  it('operador desconocido o fecha inválida quedan en blanco', () => {
    expect(datosGuia({ ...base, registro: { fecha: 'x', operador: null } }, ORIGEN).registro).toEqual({
      fecha: '',
      hora: '',
      operador: '',
    })
    expect(fechaHoraEcuador('no-es-fecha')).toEqual({ fecha: '', hora: '' })
  })

  it('incluye la referencia del pedido (Ref. pedido) de los envíos por API, vacía en los del panel', () => {
    expect(datosGuia(base, ORIGEN).referenciaExterna).toBe('')
    const porApi: Envio = {
      ...base,
      origen: { canal: 'API', integracionId: 'i1', integracion: 'Tienda Kichwa' },
      referenciaExterna: ' PED-1001 ',
    }
    expect(datosGuia(porApi, ORIGEN).referenciaExterna).toBe('PED-1001')
  })
})

describe('datosGuia — costo adicional (contrato v15)', () => {
  it('sin adicional la guía queda igual: sin línea extra y el valor es el costo', () => {
    const d = datosGuia(base, ORIGEN)
    expect(d.adicional).toBe('')
    expect(d.valor).toMatch(/35,75/)
  })

  it('con adicional muestra «Costo adicional» y el total ya lo incluye', () => {
    const d = datosGuia({ ...base, costo: 37.25, costoAdicional: 1.5 }, ORIGEN)
    expect(d.adicional).toMatch(/1,50/)
    expect(d.valor).toMatch(/37,25/)
  })

  it('tolera envíos anteriores a v15 sin el campo', () => {
    const { costoAdicional: _omitido, ...antiguo } = base
    expect(datosGuia(antiguo as Envio, ORIGEN).adicional).toBe('')
  })
})
