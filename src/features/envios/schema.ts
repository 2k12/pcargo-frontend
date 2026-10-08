import { z } from 'zod'
import type { NuevoEnvio, TipoCarga } from '@/types/api'

const telefono = z
  .string()
  .trim()
  .regex(/^[0-9+\s-]{7,15}$/, 'Teléfono inválido')

export function crearEnvioSchema(tipos: TipoCarga[]) {
  return z
    .object({
      remitenteNombre: z.string().trim().min(2, 'Requerido'),
      remitenteTelefono: telefono,
      destinatarioNombre: z.string().trim().min(2, 'Requerido'),
      destinatarioTelefono: telefono,
      destinatarioDireccion: z.string().trim().min(5, 'Ingresa una dirección de entrega'),
      rutaId: z.string().min(1, 'Selecciona una ruta'),
      tipoCarga: z.enum(['SOBRE', 'PAQUETE', 'CARTON', 'VALIJA'], { message: 'Selecciona el tipo de carga' }),
      pesoKg: z.number({ message: 'Ingresa el peso' }).positive('El peso debe ser mayor a 0'),
      descripcion: z.string().trim().max(200).optional(),
    })
    .superRefine((v, ctx) => {
      const tipo = tipos.find((t) => t.codigo === v.tipoCarga)
      if (tipo && v.pesoKg > tipo.pesoMaxKg) {
        ctx.addIssue({
          code: 'custom',
          path: ['pesoKg'],
          message: `Máximo ${tipo.pesoMaxKg} kg para ${tipo.nombre.toLowerCase()}`,
        })
      }
    })
}

export type EnvioFormValues = z.infer<ReturnType<typeof crearEnvioSchema>>

export function toNuevoEnvio(v: EnvioFormValues): NuevoEnvio {
  return {
    remitente: { nombre: v.remitenteNombre, telefono: v.remitenteTelefono },
    destinatario: {
      nombre: v.destinatarioNombre,
      telefono: v.destinatarioTelefono,
      direccion: v.destinatarioDireccion,
    },
    rutaId: Number(v.rutaId),
    tipoCarga: v.tipoCarga,
    pesoKg: v.pesoKg,
    descripcion: v.descripcion || undefined,
  }
}
