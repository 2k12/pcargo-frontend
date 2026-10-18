import { api } from '@/lib/api'
import type { AccesoPortalCreado, CambiosUsuario, FiltroUsuarios, NuevoUsuario, RepartidorRef, UsuarioAdmin } from '@/types/api'

export const usuariosApi = {
  /** ADMIN: ordenados por nombre. */
  listar: (filtro: FiltroUsuarios = {}) => api.get<UsuarioAdmin[]>('/usuarios', { rol: filtro.rol, activo: filtro.activo }),
  crear: (data: NuevoUsuario) => api.post<UsuarioAdmin>('/usuarios', data),
  actualizar: (id: string, cambios: CambiosUsuario) => api.patch<UsuarioAdmin>(`/usuarios/${id}`, cambios),
  /** ADMIN u OPERADOR: repartidores activos, para asignar envíos. */
  repartidores: () => api.get<RepartidorRef[]>('/usuarios/repartidores'),
  /** Accesos al portal de un cliente (usuarios CLIENTE vinculados). */
  accesosCliente: (clienteId: string) => api.get<UsuarioAdmin[]>(`/clientes/${clienteId}/accesos`),
  /** Crea un acceso con contraseña temporal: solo llega en esta respuesta. */
  crearAcceso: (clienteId: string, data: { nombre: string; email: string }) =>
    api.post<AccesoPortalCreado>(`/clientes/${clienteId}/accesos`, data),
}
