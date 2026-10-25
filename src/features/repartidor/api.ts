import type { DatosEvidencia } from '@/features/envios/evidencia'
import { api } from '@/lib/api'
import type { CajaPendiente, EnvioReparto, EstadoReparto, VistaReparto } from '@/types/api'

export const repartidorApi = {
  envios: (vista: VistaReparto) => api.get<EnvioReparto[]>('/repartidor/envios', { vista }),
  porGuia: (numeroGuia: string) => api.get<EnvioReparto>(`/repartidor/envios/guia/${encodeURIComponent(numeroGuia)}`),
  cambiarEstado: (id: string, estado: EstadoReparto, nota?: string) =>
    api.patch<EnvioReparto>(`/repartidor/envios/${id}/estado`, { estado, ...(nota ? { nota } : {}) }),
  /** multipart/form-data: `foto` y/o `recibidoPor` (contrato v19: al menos uno; solo se envía lo que venga). */
  subirEvidencia: (id: string, { foto, recibidoPor }: DatosEvidencia) => {
    const fd = new FormData()
    if (recibidoPor !== undefined) fd.append('recibidoPor', recibidoPor)
    if (foto) fd.append('foto', foto.archivo, foto.nombre)
    return api.post<EnvioReparto>(`/repartidor/envios/${id}/evidencia`, fd)
  },
  caja: () => api.get<CajaPendiente>('/repartidor/caja'),
}
