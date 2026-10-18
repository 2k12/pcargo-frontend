import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CambiosUsuario, NuevoUsuario } from '@/types/api'
import { usuariosApi } from './api'

export const usuariosKeys = {
  all: ['usuarios'] as const,
  lista: ['usuarios', 'lista'] as const,
  repartidores: ['usuarios', 'repartidores'] as const,
  accesos: (clienteId: string) => ['usuarios', 'accesos', clienteId] as const,
}

export function useUsuarios(habilitado = true) {
  return useQuery({ queryKey: usuariosKeys.lista, queryFn: () => usuariosApi.listar(), enabled: habilitado })
}

/**
 * Repartidores activos para asignar envíos. Si la respuesta no es una lista (servidor anterior a v12),
 * se trata como vacía para no romper las vistas que solo la usan como opción.
 */
export function useRepartidores() {
  return useQuery({
    queryKey: usuariosKeys.repartidores,
    queryFn: usuariosApi.repartidores,
    staleTime: 60_000,
    select: (d) => (Array.isArray(d) ? [...d].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) : []),
  })
}

function useInvalidarUsuarios() {
  const qc = useQueryClient()
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: usuariosKeys.all }), qc.invalidateQueries({ queryKey: ['clientes'] })])
}

export function useCrearUsuario() {
  const invalidar = useInvalidarUsuarios()
  return useMutation({ mutationFn: (data: NuevoUsuario) => usuariosApi.crear(data), onSuccess: invalidar })
}

export function useActualizarUsuario() {
  const invalidar = useInvalidarUsuarios()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: CambiosUsuario }) => usuariosApi.actualizar(id, cambios),
    onSuccess: invalidar,
  })
}

export function useAccesosCliente(clienteId: string | null) {
  return useQuery({
    queryKey: usuariosKeys.accesos(clienteId ?? ''),
    queryFn: () => usuariosApi.accesosCliente(clienteId!),
    enabled: !!clienteId,
  })
}

export function useCrearAcceso(clienteId: string) {
  const invalidar = useInvalidarUsuarios()
  return useMutation({
    mutationFn: (data: { nombre: string; email: string }) => usuariosApi.crearAcceso(clienteId, data),
    onSuccess: invalidar,
  })
}
