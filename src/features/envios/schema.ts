import { z } from 'zod'
import type { ItemSolicitud, NuevoEnvio, TipoCarga } from '@/types/api'
import { leerCostoAdicional } from './costoAdicional'
import { enFrase } from './domain'
import { validarFechaGuia } from './fechaGuia'
import { MENSAJE_GUIA_INVALIDA, normalizarGuia } from './guia'

export const MAX_ITEMS = 20
export const MAX_CANTIDAD = 999

export const telefonoSchema = z
  .string()
  .trim()
  .regex(/^[0-9+\s-]{7,15}$/, 'Teléfono inválido')

const itemSchema = z.object({
  // Contrato v11: los códigos son configurables; que el tipo exista y esté activo lo valida `crearEnvioSchema`.
  tipoCarga: z.string({ message: 'Selecciona el tipo' }).min(1, 'Selecciona el tipo'),
  cantidad: z
    .number({ message: 'Cantidad' })
    .int('Debe ser entero')
    .min(1, 'Mínimo 1')
    .max(MAX_CANTIDAD, `Máximo ${MAX_CANTIDAD}`),
  pesoKg: z.number({ message: 'Ingresa el peso' }).positive('Mayor a 0'),
})

/** Ítems del envío validados contra el catálogo (tipo activo y peso máximo por unidad). */
export function itemsSchema(tipos: Pick<TipoCarga, 'codigo' | 'nombre' | 'pesoMaxKg'>[]) {
  return z
    .array(
      itemSchema.superRefine((item, ctx) => {
        const tipo = tipos.find((t) => t.codigo === item.tipoCarga)
        if (!tipo) {
          ctx.addIssue({ code: 'custom', path: ['tipoCarga'], message: 'Ese tipo de carga ya no está disponible' })
          return
        }
        if (item.pesoKg > tipo.pesoMaxKg) {
          ctx.addIssue({
            code: 'custom',
            path: ['pesoKg'],
            message: `Máx. ${tipo.pesoMaxKg} kg por ${enFrase(tipo.nombre)}`,
          })
        }
      }),
    )
    .min(1, 'Agrega al menos un ítem')
    .max(MAX_ITEMS, `Máximo ${MAX_ITEMS} ítems`)
}

/**
 * `fechaMinima` (contrato v20): día de creación del talonario cuando se registra una guía en blanco; la
 * fecha de la guía puede ir desde ese día (en lugar de desde hoy).
 */
export function crearEnvioSchema(tipos: TipoCarga[], { fechaMinima }: { fechaMinima?: string | null } = {}) {
  return z.object({
    remitenteNombre: z.string().trim().min(2, 'Requerido'),
    remitenteTelefono: telefonoSchema,
    // Contrato v9: opcional (0–200); se imprime en la guía.
    remitenteDireccion: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
    destinatarioNombre: z.string().trim().min(2, 'Requerido'),
    destinatarioTelefono: telefonoSchema,
    destinatarioDireccion: z.string().trim().min(5, 'Ingresa una dirección de entrega'),
    rutaId: z.string().min(1, 'Selecciona una ruta'),
    items: itemsSchema(tipos),
    // Zona de entrega (contrato v8): solo cambia el precio de los tipos con precio rural.
    zona: z.enum(['URBANA', 'RURAL'], { message: 'Selecciona la zona' }),
    formaPago: z.enum(['PAGADO', 'AL_COBRO', 'CONTRATO', 'SEGURO'], { message: 'Selecciona la forma de pago' }),
    descripcion: z.string().trim().max(200).optional(),
    // Número del sistema: solo se llena (de solo lectura) al registrar una guía de talonario (v20).
    numeroGuia: z
      .string()
      .optional()
      .refine((v) => !v?.trim() || normalizarGuia(v) !== null, MENSAJE_GUIA_INVALIDA),
    // v21: número de una guía física antigua (opcional): solo dígitos, admite ceros a la izquierda.
    guiaFisica: z
      .string()
      .optional()
      .refine((v) => !v?.trim() || normalizarGuia(v) !== null, MENSAJE_GUIA_INVALIDA),
    // Contrato v15: recargo opcional en USD («2», «1,50» o «1.5»); ≥ 0, ≤ 9999.99 y hasta 2 decimales.
    costoAdicional: z
      .string()
      .optional()
      .superRefine((v, ctx) => {
        const r = leerCostoAdicional(v)
        if (r.error) ctx.addIssue({ code: 'custom', message: r.error })
      }),
    // Contrato v18: fecha de la guía, hoy..hoy+90 (Ecuador); vacío → hoy. v20: desde el día del talonario.
    fechaGuia: z
      .string()
      .optional()
      .superRefine((v, ctx) => {
        const error = validarFechaGuia(v, Date.now(), fechaMinima)
        if (error) ctx.addIssue({ code: 'custom', message: error })
      }),
    // Cliente frecuente elegido, o guardar al remitente como cliente nuevo.
    clienteId: z.string().optional(),
    guardarCliente: z.boolean().optional(),
    consentimientoCliente: z.boolean().optional(),
  })
    // LOPDP: guardar al remitente como cliente frecuente exige su consentimiento expreso.
    .refine((v) => !v.guardarCliente || !!v.clienteId || v.consentimientoCliente === true, {
      path: ['consentimientoCliente'],
      message: MENSAJE_CONSENTIMIENTO,
    })
}

export const MENSAJE_CONSENTIMIENTO = 'Confirma que el cliente aceptó que guardemos sus datos'

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
  // Vacío o 0 → se omite (el servidor asume 0).
  const costoAdicional = leerCostoAdicional(v.costoAdicional).valor ?? 0
  return {
    remitente: {
      nombre: v.remitenteNombre,
      telefono: v.remitenteTelefono,
      ...(v.remitenteDireccion?.trim() ? { direccion: v.remitenteDireccion.trim() } : {}),
    },
    destinatario: {
      nombre: v.destinatarioNombre,
      telefono: v.destinatarioTelefono,
      direccion: v.destinatarioDireccion,
    },
    rutaId: Number(v.rutaId),
    items: v.items.map(({ tipoCarga, cantidad, pesoKg }) => ({ tipoCarga, cantidad, pesoKg })),
    formaPago: v.formaPago,
    zona: v.zona,
    descripcion: v.descripcion || undefined,
    ...(v.numeroGuia?.trim() ? { numeroGuia: normalizarGuia(v.numeroGuia)! } : {}),
    ...(v.guiaFisica?.trim() ? { guiaFisica: normalizarGuia(v.guiaFisica)! } : {}),
    ...(costoAdicional > 0 ? { costoAdicional } : {}),
    // Contrato v18: siempre se envía (null → hoy en el servidor).
    fechaGuia: v.fechaGuia?.trim() || null,
    ...(v.clienteId ? { clienteId: v.clienteId } : v.guardarCliente ? { guardarCliente: true, consentimientoCliente: v.consentimientoCliente === true } : {}),
  }
}
