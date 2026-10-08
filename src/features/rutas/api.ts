import { api } from '@/lib/api'
import type { CambiosRuta, Ciudad, NuevaRuta, Ruta } from '@/types/api'

export const rutasApi = {
  listar: (soloActivas = false) => api.get<Ruta[]>('/rutas', soloActivas ? { activa: true } : undefined),
  crear: (data: NuevaRuta) => api.post<Ruta>('/rutas', data),
  actualizar: (id: number, cambios: CambiosRuta) => api.patch<Ruta>(`/rutas/${id}`, cambios),
  ciudades: () => api.get<Ciudad[]>('/ciudades'),
}
