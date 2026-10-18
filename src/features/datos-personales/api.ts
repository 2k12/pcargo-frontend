import { api } from '@/lib/api'
import type { DatosTitular, NuevaSolicitudDatos, Pagina, PoliticaDatos, ResultadoDepuracion, SolicitudDatos } from '@/types/api'

export const datosPersonalesApi = {
  politica: () => api.get<PoliticaDatos>('/datos-personales/politica'),
  guardarPolitica: (mesesRetencion: number) => api.put<PoliticaDatos>('/datos-personales/politica', { mesesRetencion }),
  depurar: (simular: boolean) => api.post<ResultadoDepuracion>('/datos-personales/depurar', { simular }),
  titular: (telefono: string) => api.get<DatosTitular>('/datos-personales/titular', { telefono }),
  solicitudes: (pagina = 1, porPagina = 10) => api.get<Pagina<SolicitudDatos>>('/datos-personales/solicitudes', { pagina, porPagina }),
  atender: (data: NuevaSolicitudDatos) => api.post<SolicitudDatos>('/datos-personales/solicitudes', data),
}
