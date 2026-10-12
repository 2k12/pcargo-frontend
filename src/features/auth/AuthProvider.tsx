import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { tokenStorage, UNAUTHORIZED_EVENT } from '@/lib/api'
import type { LoginResponse, Usuario } from '@/types/api'
import { authApi } from './api'
import { AuthContext, type AuthStatus } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStorage.get() ? 'loading' : 'anonymous'))

  useEffect(() => {
    if (!tokenStorage.get()) return
    let cancelado = false
    authApi
      .me()
      .then((u) => {
        if (cancelado) return
        setUsuario(u)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelado) return
        tokenStorage.clear()
        setStatus('anonymous')
      })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      setUsuario(null)
      setStatus('anonymous')
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { token, usuario: u } = await authApi.login(email, password)
    tokenStorage.set(token)
    setUsuario(u)
    setStatus('authenticated')
    return u
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUsuario(null)
    setStatus('anonymous')
  }, [])

  const actualizarSesion = useCallback(({ token, usuario: u }: LoginResponse) => {
    tokenStorage.set(token)
    setUsuario(u)
    setStatus('authenticated')
  }, [])

  const value = useMemo(
    () => ({ usuario, status, login, logout, actualizarSesion }),
    [usuario, status, login, logout, actualizarSesion],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
