import { api, ApiError } from '@/lib/api'
import type { FiltroTalonarios, GuiaDeTalonario, NuevoTalonario, Pagina, Talonario, TalonarioResumen } from '@/types/api'

export const talonariosApi = {
  listar: ({ estado = 'abiertos', pagina, porPagina }: { estado?: FiltroTalonarios; pagina?: number; porPagina?: number } = {}) =>
    api.get<Pagina<TalonarioResumen>>('/talonarios', { estado, pagina, porPagina }),
  obtener: (id: string) => api.get<Talonario>(`/talonarios/${id}`),
  crear: (data: NuevoTalonario) => api.post<Talonario>('/talonarios', data),
  anular: (id: string, numeroGuia: number, motivo: string) => api.post<Talonario>(`/talonarios/${id}/anular`, { numeroGuia, motivo }),
  /** Guía de talonario con ese número (ya normalizado), o null si no es de ningún talonario (404). */
  porGuia: async (numero: string): Promise<GuiaDeTalonario | null> => {
    try {
      const g = await api.get<GuiaDeTalonario>(`/talonarios/guia/${numero}`)
      return g && typeof g.estado === 'string' && typeof g.talonarioId === 'string' ? g : null
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  },
}
