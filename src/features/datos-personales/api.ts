import { api } from '@/lib/api'
import type { DatosTitular, NuevaSolicitudDatos, Pagina, SolicitudDatos } from '@/types/api'

export const datosPersonalesApi = {
  titular: (telefono: string) => api.get<DatosTitular>('/datos-personales/titular', { telefono }),
  solicitudes: (pagina = 1, porPagina = 10) => api.get<Pagina<SolicitudDatos>>('/datos-personales/solicitudes', { pagina, porPagina }),
  atender: (data: NuevaSolicitudDatos) => api.post<SolicitudDatos>('/datos-personales/solicitudes', data),
}
