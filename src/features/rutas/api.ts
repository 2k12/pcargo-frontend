import { api } from '@/lib/api'
import type { CambiosCiudad, CambiosRuta, Ciudad, NuevaRuta, Ruta } from '@/types/api'

export const rutasApi = {
  /** soloActivas = solo rutas operativas (ruta y ambas ciudades activas). */
  listar: (soloActivas = false) => api.get<Ruta[]>('/rutas', soloActivas ? { activa: true } : undefined),
  crear: (data: NuevaRuta) => api.post<Ruta>('/rutas', data),
  actualizar: (id: number, cambios: CambiosRuta) => api.patch<Ruta>(`/rutas/${id}`, cambios),
}

export const ciudadesApi = {
  listar: (soloActivas = false) => api.get<Ciudad[]>('/ciudades', soloActivas ? { activa: true } : undefined),
  crear: (nombre: string) => api.post<Ciudad>('/ciudades', { nombre }),
  actualizar: (id: number, cambios: CambiosCiudad) => api.patch<Ciudad>(`/ciudades/${id}`, cambios),
  eliminar: (id: number) => api.delete(`/ciudades/${id}`),
}
