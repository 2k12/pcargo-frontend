import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import type { Rol } from '@/types/api'
import { useAuth } from './hooks'
import { espacioDeRol } from './roles'

/**
 * Exige sesión. Con `roles`, solo esos roles pasan: cualquier otro vuelve a su propio espacio
 * (panel, app del repartidor o portal), nunca a una página en blanco o a un 403.
 */
export function ProtectedRoute({ roles }: { roles?: Rol[] } = {}) {
  const { status, usuario } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && usuario && !roles.includes(usuario.rol)) {
    return <Navigate to={espacioDeRol(usuario.rol)} replace />
  }

  return <Outlet />
}
