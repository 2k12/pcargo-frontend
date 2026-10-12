import { api } from '@/lib/api'
import type { CambioContrasena, CambiosPerfil, LoginResponse, Usuario } from '@/types/api'

export const authApi = {
  login: (email: string, password: string) => api.post<LoginResponse>('/auth/login', { email, password }),
  me: () => api.get<Usuario>('/auth/me'),
  /** Perfil propio (contrato v9): devuelve un token nuevo con el nombre actualizado. */
  actualizarPerfil: (cambios: CambiosPerfil) => api.patch<LoginResponse>('/auth/me', cambios),
  /** 204; contraseña actual incorrecta → 422 CONTRASENA_INCORRECTA (no cierra la sesión). */
  cambiarContrasena: (datos: CambioContrasena) => api.put('/auth/me/password', datos),
}
