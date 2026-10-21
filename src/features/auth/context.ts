import { createContext } from 'react'
import type { LoginResponse, Usuario } from '@/types/api'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  usuario: Usuario | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<Usuario>
  /** Inicia sesión solo con el código único de acceso (contrato v17). */
  loginConCodigo: (codigo: string) => Promise<Usuario>
  logout: () => void
  /** Reemplaza token y usuario (p. ej. tras editar el perfil). */
  actualizarSesion: (sesion: LoginResponse) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
