import { api } from '@/lib/api'
import type { CajaPendiente, EnvioReparto, EstadoReparto, VistaReparto } from '@/types/api'

export const repartidorApi = {
  envios: (vista: VistaReparto) => api.get<EnvioReparto[]>('/repartidor/envios', { vista }),
  porGuia: (numeroGuia: string) => api.get<EnvioReparto>(`/repartidor/envios/guia/${encodeURIComponent(numeroGuia)}`),
  cambiarEstado: (id: string, estado: EstadoReparto, nota?: string) =>
    api.patch<EnvioReparto>(`/repartidor/envios/${id}/estado`, { estado, ...(nota ? { nota } : {}) }),
  /** multipart/form-data: `foto` + `recibidoPor`. */
  subirEvidencia: (id: string, foto: Blob, nombreArchivo: string, recibidoPor: string) => {
    const fd = new FormData()
    fd.append('recibidoPor', recibidoPor)
    fd.append('foto', foto, nombreArchivo)
    return api.post<EnvioReparto>(`/repartidor/envios/${id}/evidencia`, fd)
  },
  caja: () => api.get<CajaPendiente>('/repartidor/caja'),
}
