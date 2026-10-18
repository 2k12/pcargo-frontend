// Gestión de usuarios (contrato v12): reglas puras del formulario.
import { z } from 'zod'
import { MENSAJE_CONTRASENA_REGLAS } from '@/features/perfil/schema'
import type { CambiosUsuario, NuevoUsuario, Rol, UsuarioAdmin } from '@/types/api'

export const passwordSchema = z
  .string()
  .min(8, MENSAJE_CONTRASENA_REGLAS)
  .max(72, MENSAJE_CONTRASENA_REGLAS)
  .regex(/\p{L}/u, MENSAJE_CONTRASENA_REGLAS)
  .regex(/\d/, MENSAJE_CONTRASENA_REGLAS)

const base = {
  nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  email: z.string().trim().toLowerCase().pipe(z.email('Correo inválido')),
  rol: z.enum(['ADMIN', 'OPERADOR', 'REPARTIDOR', 'CLIENTE'], { message: 'Elige el rol' }),
  clienteId: z.string().optional(),
}

/** Alta: contraseña obligatoria; con rol CLIENTE hay que elegir el cliente. */
export const nuevoUsuarioSchema = z
  .object({ ...base, password: passwordSchema })
  .refine((v) => v.rol !== 'CLIENTE' || !!v.clienteId, { path: ['clienteId'], message: 'Elige el cliente de este acceso' })

/** Edición: la contraseña se restablece aparte. */
export const editarUsuarioSchema = z.object(base)

export type NuevoUsuarioValues = z.input<typeof nuevoUsuarioSchema>
export type EditarUsuarioValues = z.input<typeof editarUsuarioSchema>

export function toNuevoUsuario(v: z.output<typeof nuevoUsuarioSchema>): NuevoUsuario {
  return {
    nombre: v.nombre,
    email: v.email,
    password: v.password,
    rol: v.rol,
    ...(v.rol === 'CLIENTE' ? { clienteId: v.clienteId } : {}),
  }
}

/** Solo los campos que cambiaron (el servidor rechaza un PATCH vacío). */
export function cambiosUsuario(u: Pick<UsuarioAdmin, 'nombre' | 'email' | 'rol'>, v: z.output<typeof editarUsuarioSchema>): CambiosUsuario {
  const cambios: CambiosUsuario = {}
  if (v.nombre !== u.nombre) cambios.nombre = v.nombre
  if (v.email !== u.email.toLowerCase()) cambios.email = v.email
  if (v.rol !== u.rol) cambios.rol = v.rol
  return cambios
}

/**
 * Roles que se pueden elegir al editar: el rol no cambia de/hacia CLIENTE (se crea otro usuario)
 * y un ADMIN no puede quitarse a sí mismo el rol de administrador.
 */
export function rolesEditables(u: Pick<UsuarioAdmin, 'rol'>, esUnoMismo: boolean): Rol[] {
  if (u.rol === 'CLIENTE') return ['CLIENTE']
  if (esUnoMismo && u.rol === 'ADMIN') return ['ADMIN']
  return ['ADMIN', 'OPERADOR', 'REPARTIDOR']
}

const LETRAS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITOS = '23456789'

/**
 * Contraseña aleatoria de `largo` caracteres con letras y números (cumple la política de v9),
 * sin caracteres confundibles (0/O, 1/l/I) para dictarla sin errores.
 */
export function generarPassword(largo = 12, aleatorio: (n: number) => number = aleatorioSeguro): string {
  const todos = LETRAS + DIGITOS
  const chars = Array.from({ length: largo }, () => todos[aleatorio(todos.length)]!)
  // Garantiza al menos una letra y un número en dos posiciones distintas.
  const posLetra = aleatorio(largo)
  const posDigito = (posLetra + 1 + aleatorio(largo - 1)) % largo
  if (!chars.some((c) => LETRAS.includes(c))) chars[posLetra] = LETRAS[aleatorio(LETRAS.length)]!
  if (!chars.some((c) => DIGITOS.includes(c))) chars[posDigito] = DIGITOS[aleatorio(DIGITOS.length)]!
  return chars.join('')
}

function aleatorioSeguro(n: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]! % n
}
