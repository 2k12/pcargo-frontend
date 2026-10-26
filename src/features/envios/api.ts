import { api, apiBlob } from '@/lib/api'
import type {
  AsignacionRepartidor,
  Cotizacion,
  CotizacionRequest,
  Envio,
  Estado,
  FiltrosEnvios,
  NuevoEnvio,
  Pagina,
  TipoCarga,
} from '@/types/api'
import type { DatosEvidencia } from './evidencia'

export const enviosApi = {
  listar: (filtros: FiltrosEnvios = {}) =>
    api.get<Pagina<Envio>>('/envios', {
      estado: filtros.estado,
      rutaId: filtros.rutaId,
      formaPago: filtros.formaPago,
      clienteId: filtros.clienteId,
      canal: filtros.canal,
      integracionId: filtros.integracionId,
      repartidorId: filtros.repartidorId,
      desde: filtros.desde,
      hasta: filtros.hasta,
      q: filtros.q,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
    }),
  obtener: (id: string) => api.get<Envio>(`/envios/${id}`),
  /**
   * Contrato v21: envíos cuyo número del sistema **o** guía física es `numero` (0, 1 o 2; primero el del sistema).
   * Acepta ceros a la izquierda; texto no numérico → 400.
   */
  buscarGuia: (numero: string) => api.get<Envio[]>(`/envios/buscar-guia/${encodeURIComponent(numero)}`),
  /** El envío de esa guía (número del sistema; si no hay, guía física), o null. */
  porGuia: async (numero: string): Promise<Envio | null> => {
    const envios = await enviosApi.buscarGuia(numero)
    return envios[0] ?? null
  },
  crear: (data: NuevoEnvio) => api.post<Envio>('/envios', data),
  cambiarEstado: (id: string, estado: Estado, nota?: string) =>
    api.patch<Envio>(`/envios/${id}/estado`, { estado, nota: nota || undefined }),
  /** multipart/form-data: `foto` y/o `recibidoPor` (contrato v19: al menos uno; solo se envía lo que venga). */
  subirEvidencia: (id: string, { foto, recibidoPor }: DatosEvidencia) => {
    const fd = new FormData()
    if (recibidoPor !== undefined) fd.append('recibidoPor', recibidoPor)
    if (foto) fd.append('foto', foto.archivo, foto.nombre)
    return api.post<Envio>(`/envios/${id}/evidencia`, fd)
  },
  /** La foto se descarga con el token y se muestra como `blob:` (nunca hay URL pública). */
  evidenciaFoto: (id: string) => apiBlob(`/envios/${id}/evidencia`),
  /** Asigna (o quita, con `repartidorId: null`) el repartidor de varios envíos; atómico (contrato v12). */
  asignar: (data: AsignacionRepartidor) => api.post<{ asignados: number }>('/envios/asignar', data),
  cotizar: (data: CotizacionRequest) => api.post<Cotizacion>('/envios/cotizar', data),
  tiposCarga: () => api.get<TipoCarga[]>('/tipos-carga'),
}
