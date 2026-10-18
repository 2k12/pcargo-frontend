import { describe, expect, it } from 'vitest'
import { datosGuia } from '@/features/envios/guiaImprimible'
import type { EnvioPortal } from '@/types/api'
import { crearEnvioPortalSchema, envioDesdePortal, serieTendencia, tiposDesdeCatalogo, toNuevoEnvioPortal } from './domain'

const cliente = { id: 'c1', nombre: 'Textiles Atuntaqui', telefono: '0991112233', direccion: 'Sucre 5-12' }

const envio: EnvioPortal = {
  id: 'e1',
  numeroGuia: 40470,
  estado: 'ENTREGADO',
  destinatario: { nombre: 'Almacén El Sol', telefono: '0994445566', direccion: 'Av. 10 de Agosto, Quito' },
  ruta: { id: 13, origen: 'Atuntaqui', destino: 'Quito' },
  zona: 'URBANA',
  items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3, costoUnitario: 3, subtotal: 6 }],
  totalPiezas: 2,
  pesoTotalKg: 6,
  descripcion: 'Ropa',
  costo: 6,
  formaPago: 'CONTRATO',
  referenciaExterna: null,
  creadoEn: '2026-10-18T13:00:00.000Z',
  actualizadoEn: '2026-10-18T18:00:00.000Z',
  entrega: { resultado: 'ENTREGADO', fecha: '2026-10-18T18:00:00.000Z', nota: null },
  evidencia: { recibidoPor: 'María', subidaEn: '2026-10-18T18:01:00.000Z' },
}

describe('portal — guía desde el envío del portal', () => {
  it('el remitente es la empresa del cliente y la guía se arma igual que en el panel', () => {
    const e = envioDesdePortal(envio, cliente)
    expect(e.remitente).toEqual({ nombre: 'Textiles Atuntaqui', telefono: '0991112233', direccion: 'Sucre 5-12' })
    expect(e.clienteId).toBe('c1')
    const d = datosGuia(e, 'https://pcargo.ec')
    expect(d.remitente.nombre).toBe('Textiles Atuntaqui')
    expect(d.remitente.ciudad).toBe('Atuntaqui')
    expect(d.destinatario.nombre).toBe('Almacén El Sol')
    expect(d.entrega.recibidoPor).toBe('María')
    expect(d.urlSeguimiento).toBe('https://pcargo.ec/seguimiento/40470')
  })
})

describe('portal — nuevo envío', () => {
  const tipos = tiposDesdeCatalogo([{ codigo: 'PAQUETE', nombre: 'Paquete', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 50 }])
  const schema = crearEnvioPortalSchema(tipos)
  const valido = {
    destinatarioNombre: 'Ana',
    destinatarioTelefono: '0991234567',
    destinatarioDireccion: 'Bolívar 3-20',
    rutaId: '13',
    items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3 }],
    zona: 'RURAL' as const,
    formaPago: 'AL_COBRO' as const,
    descripcion: '  ',
  }

  it('arma el cuerpo del contrato sin remitente (lo pone el servidor)', () => {
    expect(toNuevoEnvioPortal(schema.parse(valido))).toEqual({
      destinatario: { nombre: 'Ana', telefono: '0991234567', direccion: 'Bolívar 3-20' },
      rutaId: 13,
      items: [{ tipoCarga: 'PAQUETE', cantidad: 2, pesoKg: 3 }],
      zona: 'RURAL',
      formaPago: 'AL_COBRO',
    })
  })

  it('solo admite Contrato o Al cobro y respeta el peso máximo', () => {
    expect(schema.safeParse({ ...valido, formaPago: 'PAGADO' }).success).toBe(false)
    expect(schema.safeParse({ ...valido, items: [{ tipoCarga: 'PAQUETE', cantidad: 1, pesoKg: 60 }] }).success).toBe(false)
  })

  it('adapta la serie diaria al gráfico de tendencia', () => {
    expect(serieTendencia([{ fecha: '2026-10-01', envios: 2, monto: 9 }])).toEqual([{ fecha: '2026-10-01', envios: 2, ingresos: 9 }])
  })
})
