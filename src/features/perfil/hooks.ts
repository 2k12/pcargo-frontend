import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/features/auth/api'
import { useAuth } from '@/features/auth/hooks'
import type { ActivarCodigoAcceso, CambioContrasena, CambiosPerfil, CodigoAcceso } from '@/types/api'

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

const CODIGO_ACCESO_KEY = ['auth', 'me', 'codigo'] as const

/** Estado del código único de acceso propio (v17). */
export function useCodigoAcceso() {
  return useQuery({ queryKey: CODIGO_ACCESO_KEY, queryFn: authApi.codigoAcceso })
}

export function useActivarCodigoAcceso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: ActivarCodigoAcceso) => authApi.activarCodigoAcceso(datos),
    onSuccess: (estado) => qc.setQueryData(CODIGO_ACCESO_KEY, estado),
  })
}

export function useDesactivarCodigoAcceso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.desactivarCodigoAcceso(),
    onSuccess: () => qc.setQueryData<CodigoAcceso>(CODIGO_ACCESO_KEY, { activo: false, actualizadoEn: null }),
  })
}
