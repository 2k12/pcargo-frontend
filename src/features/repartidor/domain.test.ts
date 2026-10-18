import { describe, expect, it } from 'vitest'
import { datosGuia } from '@/features/envios/guiaImprimible'
import { envioDesdePortal } from '@/features/portal/domain'
import type { EnvioReparto } from '@/types/api'
import {
  accionesReparto,
  agruparPorDestino,
  enlaceMapa,
  enlaceTelefono,
  enlaceWhatsApp,
  etiquetaAccion,
  numeroGuiaDesdeQr,
  totalPorCobrar,
} from './domain'

describe('repartidor — enlace de WhatsApp', () => {
  it('quita el 0 inicial y antepone 593', () => {
    expect(enlaceWhatsApp('0991234567')).toBe('https://wa.me/593991234567')
    expect(enlaceWhatsApp('099 123 4567')).toBe('https://wa.me/593991234567')
    expect(enlaceWhatsApp('06-295-0111')).toBe('https://wa.me/59362950111')
  })

  it('respeta los números que ya traen 593 o +593', () => {
    expect(enlaceWhatsApp('+593 99 123 4567')).toBe('https://wa.me/593991234567')
    expect(enlaceWhatsApp('593991234567')).toBe('https://wa.me/593991234567')
    expect(enlaceWhatsApp('00593991234567')).toBe('https://wa.me/593991234567')
  })

  it('agrega el mensaje codificado y rechaza números imposibles', () => {
    expect(enlaceWhatsApp('0991234567', 'Hola, guía 1')).toBe('https://wa.me/593991234567?text=Hola%2C%20gu%C3%ADa%201')
    expect(enlaceWhatsApp('123')).toBeNull()
  })
})

describe('repartidor — llamar y mapa', () => {
  it('tel: solo con dígitos (y el + inicial)', () => {
    expect(enlaceTelefono('099 123-4567')).toBe('tel:0991234567')
    expect(enlaceTelefono('+593 99 123 4567')).toBe('tel:+593991234567')
  })

  it('busca la dirección en su ciudad en Google Maps', () => {
    expect(enlaceMapa('Av. Amazonas N20-15', 'Quito')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Av.%20Amazonas%20N20-15%2C%20Quito%2C%20Ecuador',
    )
  })
})

describe('repartidor — número de guía desde el QR', () => {
  it('lee la URL de seguimiento que codifica el QR de la guía impresa', () => {
    const envio = envioDesdePortal(
      {
        id: 'e1',
        numeroGuia: 40461,
        estado: 'REGISTRADO',
        destinatario: { nombre: 'Ana', telefono: '0991234567', direccion: 'Quito' },
        ruta: { id: 1, origen: 'Ibarra', destino: 'Quito' },
        zona: 'URBANA',
        items: [],
        totalPiezas: 0,
        pesoTotalKg: 0,
        descripcion: null,
        costo: 3,
        formaPago: 'CONTRATO',
        referenciaExterna: null,
        creadoEn: '2026-10-18T10:00:00.000Z',
        actualizadoEn: '2026-10-18T10:00:00.000Z',
        entrega: null,
        evidencia: null,
      },
      { id: 'c1', nombre: 'Textiles', telefono: '0991112233', direccion: null },
    )
    const qr = datosGuia(envio, 'https://pcargo.ec').urlSeguimiento
    expect(qr).toBe('https://pcargo.ec/seguimiento/40461')
    expect(numeroGuiaDesdeQr(qr)).toBe('40461')
    expect(numeroGuiaDesdeQr('https://pcargo.ec/seguimiento/0040461?x=1')).toBe('40461')
  })

  it('acepta el número escrito a mano, con ceros a la izquierda', () => {
    expect(numeroGuiaDesdeQr('0040461')).toBe('40461')
    expect(numeroGuiaDesdeQr(' 40 461 ')).toBe('40461')
  })

  it('rechaza lo que no es una guía', () => {
    expect(numeroGuiaDesdeQr('')).toBeNull()
    expect(numeroGuiaDesdeQr('https://otra.web/pagina')).toBeNull()
    expect(numeroGuiaDesdeQr('abc')).toBeNull()
    expect(numeroGuiaDesdeQr('0000')).toBeNull()
  })
})

const reparto = (id: string, destino: string, porCobrar = 0): EnvioReparto =>
  ({ id, numeroGuia: Number(id.slice(1)), ruta: { id: 1, origen: 'Ibarra', destino }, porCobrar }) as EnvioReparto

describe('repartidor — agrupar por destino', () => {
  it('conserva el orden del servidor y suma lo que hay que cobrar', () => {
    const grupos = agruparPorDestino([reparto('e1', 'Atuntaqui', 3), reparto('e2', 'Atuntaqui', 4.5), reparto('e3', 'Otavalo')])
    expect(grupos.map((g) => g.destino)).toEqual(['Atuntaqui', 'Otavalo'])
    expect(grupos[0]!.envios.map((e) => e.id)).toEqual(['e1', 'e2'])
    expect(grupos[0]!.porCobrar).toBe(7.5)
    expect(totalPorCobrar([reparto('e1', 'A', 0.1), reparto('e2', 'A', 0.2)])).toBe(0.3)
  })
})

describe('repartidor — acciones según el estado', () => {
  it('solo ofrece los estados del repartidor y con las transiciones del panel', () => {
    expect(accionesReparto('REGISTRADO')).toEqual([])
    expect(accionesReparto('EN_TRANSITO')).toEqual(['EN_REPARTO', 'NOVEDAD'])
    expect(accionesReparto('EN_REPARTO')).toEqual(['ENTREGADO', 'NO_ENTREGADO', 'NOVEDAD'])
    expect(accionesReparto('NO_ENTREGADO')).toEqual(['EN_REPARTO'])
    expect(accionesReparto('ENTREGADO')).toEqual([])
  })

  it('nombra la acción de salir según de dónde viene', () => {
    expect(etiquetaAccion('EN_TRANSITO', 'EN_REPARTO')).toBe('Salir a reparto')
    expect(etiquetaAccion('NO_ENTREGADO', 'EN_REPARTO')).toBe('Reintentar')
    expect(etiquetaAccion('EN_REPARTO', 'ENTREGADO')).toBe('Entregado')
  })
})
