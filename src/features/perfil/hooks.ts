import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/features/auth/api'
import { useAuth } from '@/features/auth/hooks'
import type { CambioContrasena, CambiosPerfil } from '@/types/api'

/** PATCH /auth/me: al responder reemplaza token y usuario de la sesión. */
export function useActualizarPerfil() {
  const { actualizarSesion } = useAuth()
  return useMutation({
    mutationFn: (cambios: CambiosPerfil) => authApi.actualizarPerfil(cambios),
    onSuccess: actualizarSesion,
  })
}

export function useCambiarContrasena() {
  return useMutation({ mutationFn: (datos: CambioContrasena) => authApi.cambiarContrasena(datos) })
}
