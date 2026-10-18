import { api } from '@/lib/api'
import type {
  CatalogoPublico,
  Cotizacion,
  CotizacionRequest,
  EnvioPortal,
  FiltrosEnviosPortal,
  NuevoEnvioPortal,
  Pagina,
  ResumenPortal,
} from '@/types/api'

export const portalApi = {
  resumen: (rango: { desde?: string; hasta?: string } = {}) => api.get<ResumenPortal>('/portal/resumen', rango),
  catalogo: () => api.get<CatalogoPublico>('/portal/catalogo'),
  cotizar: (req: CotizacionRequest) => api.post<Cotizacion>('/portal/cotizar', req),
  envios: (f: FiltrosEnviosPortal = {}) =>
    api.get<Pagina<EnvioPortal>>('/portal/envios', { estado: f.estado, q: f.q, pagina: f.pagina, porPagina: f.porPagina }),
  envio: (id: string) => api.get<EnvioPortal>(`/portal/envios/${id}`),
  crear: (data: NuevoEnvioPortal) => api.post<EnvioPortal>('/portal/envios', data),
}
