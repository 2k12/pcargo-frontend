import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEsAdmin } from '@/features/auth/hooks'
import { dashboardApi } from '@/features/dashboard/api'
import { useIntegraciones } from '@/features/integraciones/hooks'
import type { AsignacionRepartidor, Cotizacion, CotizacionRequest, Estado, FiltrosEnvios, NuevoEnvio } from '@/types/api'
import type { DatosEvidencia } from './evidencia'
import { enviosApi } from './api'
import { registrarTiposCarga, TIPOS_CARGA_DEFAULT } from './domain'

export const enviosKeys = {
  all: ['envios'] as const,
  list: (f: FiltrosEnvios) => ['envios', 'list', f] as const,
  detail: (id: string) => ['envios', 'detail', id] as const,
  evidencia: (id: string, version: string) => ['envios', 'evidencia', id, version] as const,
}

export function useEnvios(filtros: FiltrosEnvios) {
  return useQuery({
    queryKey: enviosKeys.list(filtros),
    queryFn: () => enviosApi.listar(filtros),
    placeholderData: keepPreviousData,
  })
}

export function useEnvio(id: string | null) {
  return useQuery({
    queryKey: enviosKeys.detail(id ?? ''),
    queryFn: () => enviosApi.obtener(id!),
    enabled: !!id,
  })
}

/** Clave base del catálogo de tipos: invalidarla refresca también la lista completa del ADMIN y el historial. */
export const TIPOS_CARGA_KEY = ['tipos-carga'] as const

/**
 * Tipos de carga activos, en su orden (contrato v11). Mientras carga se muestra la semilla como respaldo;
 * en cuanto llega el catálogo, manda él (incluye tipos nuevos y excluye los inactivos).
 */
export function useTiposCarga() {
  return useQuery({
    queryKey: TIPOS_CARGA_KEY,
    queryFn: async () => {
      const tipos = await enviosApi.tiposCarga()
      registrarTiposCarga(tipos)
      // Por defecto el backend ya devuelve solo los activos; se filtra igual por si acaso.
      return tipos.filter((t) => t.activo !== false).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    },
    staleTime: 5 * 60_000,
    placeholderData: TIPOS_CARGA_DEFAULT,
  })
}

/**
 * Cotización en vivo. `cotizar` permite usar otro endpoint con las mismas reglas (p. ej. el del portal);
 * `fuente` separa su caché.
 */
export function useCotizacion(
  req: CotizacionRequest | null,
  cotizar: (r: CotizacionRequest) => Promise<Cotizacion> = enviosApi.cotizar,
  fuente = 'panel',
) {
  return useQuery({
    queryKey: ['cotizacion', fuente, req],
    queryFn: () => cotizar(req!),
    enabled: !!req,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

export function useCrearEnvio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NuevoEnvio) => enviosApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: enviosKeys.all })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useCambiarEstado(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ estado, nota }: { estado: Estado; nota?: string }) =>
      enviosApi.cambiarEstado(id, estado, nota),
    onSuccess: (envio) => {
      qc.setQueryData(enviosKeys.detail(id), envio)
      qc.invalidateQueries({ queryKey: ['envios', 'list'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useAsignarRepartidor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AsignacionRepartidor) => enviosApi.asignar(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: enviosKeys.all }),
  })
}

export function useSubirEvidencia(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosEvidencia) => enviosApi.subirEvidencia(id, datos),
    onSuccess: (envio) => {
      qc.setQueryData(enviosKeys.detail(id), envio)
      qc.invalidateQueries({ queryKey: ['envios', 'list'] })
    },
  })
}

/**
 * Foto de evidencia descargada con el token (Blob). `version` (fecha de subida) evita mostrar
 * la foto anterior tras reemplazarla. Se muestra con `<BlobImagen>`, que crea y revoca la URL `blob:`.
 */
export function useEvidenciaFoto(id: string, version: string | null) {
  return useQuery({
    queryKey: enviosKeys.evidencia(id, version ?? ''),
    queryFn: () => enviosApi.evidenciaFoto(id),
    enabled: !!version,
    staleTime: Infinity,
    gcTime: 0,
  })
}

/**
 * Integraciones para el filtro "Origen: API" (contrato v10). El ADMIN las lee de `GET /integraciones`;
 * un OPERADOR no tiene acceso (403), así que se derivan de `Resumen.porCanal` (sin filtros: todas las que
 * tienen envíos), que sí puede consultar. Solo se pide cuando el filtro de API está abierto.
 */
export function useOpcionesIntegracion(habilitado: boolean): { id: string; nombre: string }[] {
  const esAdmin = useEsAdmin()
  const { data: integraciones } = useIntegraciones(habilitado && esAdmin)
  const { data: resumen } = useQuery({
    queryKey: ['dashboard', 'resumen', {}],
    queryFn: () => dashboardApi.resumen({}),
    enabled: habilitado && !esAdmin,
    staleTime: 60_000,
  })
  const opciones = esAdmin
    ? (integraciones ?? []).map((i) => ({ id: i.id, nombre: i.nombre }))
    : (resumen?.porCanal ?? [])
        .filter((c) => c.canal === 'API' && c.integracionId)
        .map((c) => ({ id: c.integracionId!, nombre: c.nombre }))
  return opciones.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
