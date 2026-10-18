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
      q: filtros.q,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
    }),
  obtener: (id: string) => api.get<Envio>(`/envios/${id}`),
  /**
   * Envío con ese número de guía (ya normalizado), o null. `q` con solo dígitos busca la guía exacta, pero también
   * coincide en teléfonos y referencias: se elige el de número idéntico.
   */
  porGuia: async (numero: string): Promise<Envio | null> => {
    const { datos } = await api.get<Pagina<Envio>>('/envios', { q: numero, porPagina: 100 })
    return datos.find((e) => String(e.numeroGuia) === numero) ?? null
  },
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
  /** Asigna (o quita, con `repartidorId: null`) el repartidor de varios envíos; atómico (contrato v12). */
  asignar: (data: AsignacionRepartidor) => api.post<{ asignados: number }>('/envios/asignar', data),
  cotizar: (data: CotizacionRequest) => api.post<Cotizacion>('/envios/cotizar', data),
  tiposCarga: () => api.get<TipoCarga[]>('/tipos-carga'),
}
