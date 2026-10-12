import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { DatosIntegracion, DatosWebhook, EstadoEntregaWebhook, Integracion, NuevaApiKey } from '@/types/api'
import { integracionesApi } from './api'

export const integracionesKeys = {
  all: ['integraciones'] as const,
  list: () => ['integraciones', 'list'] as const,
  detail: (id: string) => ['integraciones', 'detail', id] as const,
  entregas: (id: string, f: object) => ['integraciones', 'entregas', id, f] as const,
  solicitudes: (id: string, f: object) => ['integraciones', 'solicitudes', id, f] as const,
}

/** `habilitado: false` evita pedir la lista (p. ej. un OPERADOR, que recibiría 403). */
export function useIntegraciones(habilitado = true) {
  return useQuery({
    queryKey: integracionesKeys.list(),
    queryFn: integracionesApi.listar,
    enabled: habilitado,
    staleTime: 30_000,
  })
}

export function useIntegracion(id: string | undefined) {
  return useQuery({
    queryKey: integracionesKeys.detail(id ?? ''),
    queryFn: () => integracionesApi.obtener(id!),
    enabled: !!id,
  })
}

/** Guarda la integración devuelta en el detalle y refresca la lista. */
function aplicar(qc: QueryClient, integracion: Integracion) {
  qc.setQueryData(integracionesKeys.detail(integracion.id), integracion)
  return qc.invalidateQueries({ queryKey: integracionesKeys.list() })
}

function refrescar(qc: QueryClient, id: string) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: integracionesKeys.detail(id) }),
    qc.invalidateQueries({ queryKey: integracionesKeys.list() }),
  ])
}

export function useCrearIntegracion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosIntegracion) => integracionesApi.crear(datos),
    onSuccess: (i) => aplicar(qc, i),
  })
}

export function useActualizarIntegracion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: Partial<DatosIntegracion> }) => integracionesApi.actualizar(id, cambios),
    onSuccess: (i) => aplicar(qc, i),
  })
}

export function useEliminarIntegracion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => integracionesApi.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: integracionesKeys.all }),
  })
}

export function useCrearKey(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: NuevaApiKey) => integracionesApi.crearKey(id, datos),
    onSuccess: () => refrescar(qc, id),
  })
}

export function useRevocarKey(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (keyId: string) => integracionesApi.revocarKey(id, keyId),
    onSuccess: () => refrescar(qc, id),
  })
}

export function useGuardarWebhook(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosWebhook) => integracionesApi.guardarWebhook(id, datos),
    onSuccess: (r) => aplicar(qc, r.integracion),
  })
}

export function useRotarSecreto(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => integracionesApi.rotarSecreto(id),
    onSuccess: () => refrescar(qc, id),
  })
}

export function useEliminarWebhook(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => integracionesApi.eliminarWebhook(id),
    onSuccess: () => refrescar(qc, id),
  })
}

function refrescarEntregas(qc: QueryClient, id: string) {
  return qc.invalidateQueries({ queryKey: ['integraciones', 'entregas', id] })
}

export function useProbarWebhook(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => integracionesApi.probarWebhook(id),
    onSuccess: () => refrescarEntregas(qc, id),
  })
}

export function useEntregasWebhook(id: string, f: { estado?: EstadoEntregaWebhook; pagina: number; porPagina: number }, habilitado = true) {
  return useQuery({
    queryKey: integracionesKeys.entregas(id, f),
    queryFn: () => integracionesApi.entregas(id, f),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  })
}

export function useReintentarEntrega(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entregaId: string) => integracionesApi.reintentarEntrega(id, entregaId),
    onSuccess: () => refrescarEntregas(qc, id),
  })
}

export function useSolicitudesApi(id: string, f: { pagina: number; porPagina: number }) {
  return useQuery({
    queryKey: integracionesKeys.solicitudes(id, f),
    queryFn: () => integracionesApi.solicitudes(id, f),
    placeholderData: keepPreviousData,
  })
}
