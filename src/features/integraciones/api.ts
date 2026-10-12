import { api } from '@/lib/api'
import type {
  ApiKeyCreada,
  DatosIntegracion,
  DatosWebhook,
  EntregaWebhook,
  EstadoEntregaWebhook,
  Integracion,
  NuevaApiKey,
  Pagina,
  SolicitudApi,
  WebhookGuardado,
} from '@/types/api'

/** Administración de integraciones (contrato v10, solo ADMIN con JWT). */
export const integracionesApi = {
  listar: () => api.get<Integracion[]>('/integraciones'),
  obtener: (id: string) => api.get<Integracion>(`/integraciones/${id}`),
  crear: (datos: DatosIntegracion) => api.post<Integracion>('/integraciones', datos),
  actualizar: (id: string, cambios: Partial<DatosIntegracion>) => api.patch<Integracion>(`/integraciones/${id}`, cambios),
  eliminar: (id: string) => api.delete(`/integraciones/${id}`),

  crearKey: (id: string, datos: NuevaApiKey) => api.post<ApiKeyCreada>(`/integraciones/${id}/keys`, datos),
  revocarKey: (id: string, keyId: string) => api.delete(`/integraciones/${id}/keys/${keyId}`),

  guardarWebhook: (id: string, datos: DatosWebhook) => api.put<WebhookGuardado>(`/integraciones/${id}/webhook`, datos),
  rotarSecreto: (id: string) => api.post<{ secreto: string }>(`/integraciones/${id}/webhook/rotar-secreto`),
  eliminarWebhook: (id: string) => api.delete(`/integraciones/${id}/webhook`),
  probarWebhook: (id: string) => api.post<EntregaWebhook>(`/integraciones/${id}/webhook/prueba`),
  entregas: (id: string, f: { estado?: EstadoEntregaWebhook; pagina?: number; porPagina?: number }) =>
    api.get<Pagina<EntregaWebhook>>(`/integraciones/${id}/webhook/entregas`, f),
  reintentarEntrega: (id: string, entregaId: string) =>
    api.post<EntregaWebhook>(`/integraciones/${id}/webhook/entregas/${entregaId}/reintentar`),

  solicitudes: (id: string, f: { pagina?: number; porPagina?: number }) =>
    api.get<Pagina<SolicitudApi>>(`/integraciones/${id}/solicitudes`, f),
}
