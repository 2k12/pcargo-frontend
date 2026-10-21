// Perfil propio (contrato v9): nombre/correo y cambio de contraseña. Reglas iguales a las del servidor.
import { z } from 'zod'
import type { CambiosPerfil, Usuario } from '@/types/api'

export const perfilSchema = z.object({
  nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  email: z.string().trim().toLowerCase().pipe(z.email('Correo inválido')),
})
export type PerfilValues = z.input<typeof perfilSchema>

export const MENSAJE_CONTRASENA_REGLAS = 'Entre 8 y 72 caracteres, con al menos una letra y un número'

export const contrasenaSchema = z
  .object({
    actual: z.string().min(1, 'Escribe tu contraseña actual'),
    nueva: z
      .string()
      .min(8, MENSAJE_CONTRASENA_REGLAS)
      .max(72, MENSAJE_CONTRASENA_REGLAS)
      .regex(/\p{L}/u, MENSAJE_CONTRASENA_REGLAS)
      .regex(/\d/, MENSAJE_CONTRASENA_REGLAS),
    confirmar: z.string().min(1, 'Repite la nueva contraseña'),
  })
  .refine((v) => v.nueva !== v.actual, { path: ['nueva'], message: 'Debe ser distinta de la actual' })
  .refine((v) => v.confirmar === v.nueva, { path: ['confirmar'], message: 'Las contraseñas no coinciden' })
export type ContrasenaValues = z.infer<typeof contrasenaSchema>

/** Solo los campos que cambiaron (el servidor rechaza un body vacío). */
export function cambiosPerfil(usuario: Pick<Usuario, 'nombre' | 'email'>, v: { nombre: string; email: string }): CambiosPerfil {
  const cambios: CambiosPerfil = {}
  const nombre = v.nombre.trim()
  const email = v.email.trim().toLowerCase()
  if (nombre !== usuario.nombre) cambios.nombre = nombre
  if (email !== usuario.email.toLowerCase()) cambios.email = email
  return cambios
}

// Código único de acceso (contrato v17): mismas reglas que el servidor.
export const MENSAJE_CODIGO_REGLAS = 'Entre 6 y 32 caracteres, sin espacios. Letras, números o símbolos; distingue mayúsculas.'

export const codigoAccesoSchema = z
  .object({
    codigo: z
      .string()
      .min(6, 'Mínimo 6 caracteres')
      .max(32, 'Máximo 32 caracteres')
      .regex(/^\S+$/u, 'No puede tener espacios'),
    confirmar: z.string().min(1, 'Repite el código'),
    password: z.string().min(1, 'Escribe tu contraseña actual'),
  })
  .refine((v) => v.confirmar === v.codigo, { path: ['confirmar'], message: 'Los códigos no coinciden' })
  .refine((v) => v.password === '' || v.codigo !== v.password, {
    path: ['codigo'],
    message: 'No puede ser igual a tu contraseña',
  })
export type CodigoAccesoValues = z.infer<typeof codigoAccesoSchema>
