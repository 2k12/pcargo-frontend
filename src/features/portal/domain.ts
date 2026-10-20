// Portal de clientes empresa (contrato v12): lógica pura.
import { z } from 'zod'
import { itemsSchema, telefonoSchema } from '@/features/envios/schema'
import type { ClientePortal, Envio, EnvioPortal, FormaPagoPortal, NuevoEnvioPortal, TipoCarga, TipoCargaPublico } from '@/types/api'

export const FORMAS_PAGO_PORTAL: { value: FormaPagoPortal; label: string; descripcion: string }[] = [
  { value: 'CONTRATO', label: 'Contrato', descripcion: 'Se factura a tu empresa' },
  { value: 'AL_COBRO', label: 'Al cobro', descripcion: 'Paga quien recibe' },
]

/**
 * Arma un `Envio` completo desde el del portal para reutilizar la guía imprimible: el remitente
 * es siempre la empresa del cliente (así lo registra el servidor).
 */
export function envioDesdePortal(e: EnvioPortal, cliente: ClientePortal): Envio {
  return {
    id: e.id,
    numeroGuia: e.numeroGuia,
    clienteId: cliente.id,
    remitente: { nombre: cliente.nombre, telefono: cliente.telefono, direccion: cliente.direccion },
    destinatario: e.destinatario,
    ruta: e.ruta,
    items: e.items,
    totalPiezas: e.totalPiezas,
    pesoTotalKg: e.pesoTotalKg,
    zona: e.zona,
    descripcion: e.descripcion,
    costo: e.costo,
    costoAdicional: 0,
    formaPago: e.formaPago,
    estado: e.estado,
    registro: { fecha: e.creadoEn, operador: null },
    entrega: e.entrega ? { ...e.entrega, operador: null } : null,
    evidencia: e.evidencia
      ? { recibidoPor: e.evidencia.recibidoPor, subidaEn: e.evidencia.subidaEn, tipo: 'image/jpeg', bytes: 0, subidaPor: null }
      : null,
    origen: { canal: 'PANEL', integracionId: null, integracion: null },
    referenciaExterna: e.referenciaExterna,
    repartidor: null,
    asignadoEn: null,
    anonimizadoEn: null,
    creadoEn: e.creadoEn,
    actualizadoEn: e.actualizadoEn,
  }
}

/** El catálogo del portal trae tipos públicos; los editores del panel esperan el tipo completo. */
export function tiposDesdeCatalogo(tipos: TipoCargaPublico[]): TipoCarga[] {
  return tipos.map((t, i) => ({ ...t, activo: true, orden: i, actualizadoEn: null, actualizadoPor: null }))
}

export function crearEnvioPortalSchema(tipos: Pick<TipoCarga, 'codigo' | 'nombre' | 'pesoMaxKg'>[]) {
  return z.object({
    destinatarioNombre: z.string().trim().min(2, 'Escribe el nombre de quien recibe'),
    destinatarioTelefono: telefonoSchema,
    destinatarioDireccion: z.string().trim().min(5, 'Ingresa una dirección de entrega'),
    rutaId: z.string().min(1, 'Selecciona una ruta'),
    items: itemsSchema(tipos),
    zona: z.enum(['URBANA', 'RURAL']),
    formaPago: z.enum(['CONTRATO', 'AL_COBRO']),
    descripcion: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  })
}

export type EnvioPortalFormValues = z.infer<ReturnType<typeof crearEnvioPortalSchema>>

export function toNuevoEnvioPortal(v: EnvioPortalFormValues): NuevoEnvioPortal {
  return {
    destinatario: { nombre: v.destinatarioNombre, telefono: v.destinatarioTelefono, direccion: v.destinatarioDireccion },
    rutaId: Number(v.rutaId),
    items: v.items.map(({ tipoCarga, cantidad, pesoKg }) => ({ tipoCarga, cantidad, pesoKg })),
    zona: v.zona,
    formaPago: v.formaPago,
    ...(v.descripcion?.trim() ? { descripcion: v.descripcion.trim() } : {}),
  }
}

/** Serie del resumen en el formato del gráfico de tendencia del panel (`monto` → `ingresos`). */
export const serieTendencia = (porDia: { fecha: string; envios: number; monto: number }[]) =>
  porDia.map((d) => ({ fecha: d.fecha, envios: d.envios, ingresos: d.monto }))
