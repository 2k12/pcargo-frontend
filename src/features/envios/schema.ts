import { z } from 'zod'
import type { ItemSolicitud, NuevoEnvio, TipoCarga } from '@/types/api'
import { MENSAJE_GUIA_INVALIDA, normalizarGuia } from './guia'

export const MAX_ITEMS = 20
export const MAX_CANTIDAD = 999

const telefono = z
  .string()
  .trim()
  .regex(/^[0-9+\s-]{7,15}$/, 'Teléfono inválido')

const itemSchema = z.object({
  tipoCarga: z.enum(['SOBRE', 'PAQUETE', 'CARTON', 'VALIJA'], { message: 'Selecciona el tipo' }),
  cantidad: z
    .number({ message: 'Cantidad' })
    .int('Debe ser entero')
    .min(1, 'Mínimo 1')
    .max(MAX_CANTIDAD, `Máximo ${MAX_CANTIDAD}`),
  pesoKg: z.number({ message: 'Ingresa el peso' }).positive('Mayor a 0'),
})

export function crearEnvioSchema(tipos: TipoCarga[]) {
  return z.object({
    remitenteNombre: z.string().trim().min(2, 'Requerido'),
    remitenteTelefono: telefono,
    destinatarioNombre: z.string().trim().min(2, 'Requerido'),
    destinatarioTelefono: telefono,
    destinatarioDireccion: z.string().trim().min(5, 'Ingresa una dirección de entrega'),
    rutaId: z.string().min(1, 'Selecciona una ruta'),
    items: z
      .array(
        itemSchema.superRefine((item, ctx) => {
          const tipo = tipos.find((t) => t.codigo === item.tipoCarga)
          if (tipo && item.pesoKg > tipo.pesoMaxKg) {
            ctx.addIssue({
              code: 'custom',
              path: ['pesoKg'],
              message: `Máx. ${tipo.pesoMaxKg} kg por ${tipo.nombre.toLowerCase()}`,
            })
          }
        }),
      )
      .min(1, 'Agrega al menos un ítem')
      .max(MAX_ITEMS, `Máximo ${MAX_ITEMS} ítems`),
    formaPago: z.enum(['PAGADO', 'AL_COBRO', 'CONTRATO', 'SEGURO'], { message: 'Selecciona la forma de pago' }),
    descripcion: z.string().trim().max(200).optional(),
    // Guía física (opcional): solo dígitos, admite ceros a la izquierda.
    numeroGuia: z
      .string()
      .optional()
      .refine((v) => !v?.trim() || normalizarGuia(v) !== null, MENSAJE_GUIA_INVALIDA),
  })
}

export type EnvioFormValues = z.infer<ReturnType<typeof crearEnvioSchema>>

/** Ítem vacío para el editor (cantidad 1, sin tipo ni peso). */
export const itemVacio = (): Partial<ItemSolicitud> & { cantidad: number } => ({ cantidad: 1 })

/** Ítems completos y dentro de límites: los únicos que se envían a cotizar. */
export function itemsCotizables(items: Partial<ItemSolicitud>[] | undefined, tipos: TipoCarga[]): ItemSolicitud[] | null {
  if (!items || items.length === 0) return null
  const validos: ItemSolicitud[] = []
  for (const i of items) {
    const tipo = tipos.find((t) => t.codigo === i.tipoCarga)
    const { cantidad, pesoKg } = i
    if (!tipo || cantidad === undefined || pesoKg === undefined) return null
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) return null
    if (!Number.isFinite(pesoKg) || pesoKg <= 0 || pesoKg > tipo.pesoMaxKg) return null
    validos.push({ tipoCarga: tipo.codigo, cantidad, pesoKg })
  }
  return validos
}

export function toNuevoEnvio(v: EnvioFormValues): NuevoEnvio {
  return {
    remitente: { nombre: v.remitenteNombre, telefono: v.remitenteTelefono },
    destinatario: {
      nombre: v.destinatarioNombre,
      telefono: v.destinatarioTelefono,
      direccion: v.destinatarioDireccion,
    },
    rutaId: Number(v.rutaId),
    items: v.items.map(({ tipoCarga, cantidad, pesoKg }) => ({ tipoCarga, cantidad, pesoKg })),
    formaPago: v.formaPago,
    descripcion: v.descripcion || undefined,
    ...(v.numeroGuia?.trim() ? { numeroGuia: normalizarGuia(v.numeroGuia)! } : {}),
  }
}
