import { Navigate, Outlet } from 'react-router'
import { useAuth } from './hooks'

/** Rutas solo para ADMIN: un OPERADOR que llegue por URL vuelve al resumen (el servidor responde 403 igualmente). */
export function SoloAdmin() {
  const { usuario } = useAuth()
  if (usuario && usuario.rol !== 'ADMIN') return <Navigate to="/panel" replace />
  return <Outlet />
}
