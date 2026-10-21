import { api } from '@/lib/api'
import type { ActivarCodigoAcceso, CambioContrasena, CambiosPerfil, CodigoAcceso, LoginResponse, Usuario } from '@/types/api'

export const authApi = {
  login: (email: string, password: string) => api.post<LoginResponse>('/auth/login', { email, password }),
  me: () => api.get<Usuario>('/auth/me'),
  /** Perfil propio (contrato v9): devuelve un token nuevo con el nombre actualizado. */
  actualizarPerfil: (cambios: CambiosPerfil) => api.patch<LoginResponse>('/auth/me', cambios),
  /** 204; contraseña actual incorrecta → 422 CONTRASENA_INCORRECTA (no cierra la sesión). */
  cambiarContrasena: (datos: CambioContrasena) => api.put('/auth/me/password', datos),
  /** Login solo con el código único (v17, pública); inválido → 401 CREDENCIALES_INVALIDAS. */
  loginConCodigo: (codigo: string) => api.post<LoginResponse>('/auth/login/codigo', { codigo }),
  /** Código único propio (v17). */
  codigoAcceso: () => api.get<CodigoAcceso>('/auth/me/codigo'),
  /** Activa o reemplaza el código; 422 CONTRASENA_INCORRECTA, 409 CONFLICTO si otro usuario lo usa. */
  activarCodigoAcceso: (datos: ActivarCodigoAcceso) => api.put<CodigoAcceso>('/auth/me/codigo', datos),
  /** 204, idempotente. */
  desactivarCodigoAcceso: () => api.delete('/auth/me/codigo'),
}
