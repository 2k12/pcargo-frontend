import { createContext } from 'react'
import type { Usuario } from '@/types/api'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  usuario: Usuario | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<Usuario>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
