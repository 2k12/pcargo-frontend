import { api, apiBlob } from '@/lib/api'
import type {
  Cotizacion,
  CotizacionRequest,
  Envio,
  Estado,
  FiltrosEnvios,
  NuevoEnvio,
  Pagina,
  TipoCarga,
} from '@/types/api'

export const enviosApi = {
  listar: (filtros: FiltrosEnvios = {}) =>
    api.get<Pagina<Envio>>('/envios', {
      estado: filtros.estado,
      rutaId: filtros.rutaId,
      formaPago: filtros.formaPago,
      clienteId: filtros.clienteId,
      canal: filtros.canal,
      integracionId: filtros.integracionId,
      q: filtros.q,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
    }),
  obtener: (id: string) => api.get<Envio>(`/envios/${id}`),
  crear: (data: NuevoEnvio) => api.post<Envio>('/envios', data),
  cambiarEstado: (id: string, estado: Estado, nota?: string) =>
    api.patch<Envio>(`/envios/${id}/estado`, { estado, nota: nota || undefined }),
  /** multipart/form-data: `foto` + `recibidoPor` (contrato v9); responde el envío con historial. */
  subirEvidencia: (id: string, foto: Blob, nombreArchivo: string, recibidoPor: string) => {
    const fd = new FormData()
    fd.append('recibidoPor', recibidoPor)
    fd.append('foto', foto, nombreArchivo)
    return api.post<Envio>(`/envios/${id}/evidencia`, fd)
  },
  /** La foto se descarga con el token y se muestra como `blob:` (nunca hay URL pública). */
  evidenciaFoto: (id: string) => apiBlob(`/envios/${id}/evidencia`),
  cotizar: (data: CotizacionRequest) => api.post<Cotizacion>('/envios/cotizar', data),
  tiposCarga: () => api.get<TipoCarga[]>('/tipos-carga'),
}
