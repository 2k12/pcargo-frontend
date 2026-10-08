import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CambiosCliente, Cliente, NuevoCliente } from '@/types/api'

export const clientesApi = {
  listar: () => api.get<Cliente[]>('/clientes'),
  crear: (data: NuevoCliente) => api.post<Cliente>('/clientes', data),
  actualizar: (id: string, cambios: CambiosCliente) => api.patch<Cliente>(`/clientes/${id}`, cambios),
  eliminar: (id: string) => api.delete(`/clientes/${id}`),
}

/**
 * La cartera es pequeña (decenas o pocos cientos): se carga entera una vez y se busca en el
 * navegador, así el buscador del alta de envíos responde al instante y sin peticiones por tecla.
 */
export function useClientes() {
  return useQuery({ queryKey: ['clientes'], queryFn: clientesApi.listar, staleTime: 30_000 })
}

/** Los nombres y totales por cliente aparecen también en el resumen. */
function invalidar(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['clientes'] }),
    qc.invalidateQueries({ queryKey: ['dashboard'] }),
  ])
}

export function useCrearCliente() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: clientesApi.crear, onSuccess: () => invalidar(qc) })
}

export function useActualizarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: CambiosCliente }) => clientesApi.actualizar(id, cambios),
    onSuccess: () => invalidar(qc),
  })
}

export function useEliminarCliente() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: clientesApi.eliminar, onSuccess: () => invalidar(qc) })
}
