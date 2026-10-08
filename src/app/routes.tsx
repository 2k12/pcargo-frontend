import { Loader2 } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'

const LandingPage = lazy(() => import('@/features/landing/LandingPage').then((m) => ({ default: m.LandingPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const EnviosPage = lazy(() => import('@/features/envios/EnviosPage').then((m) => ({ default: m.EnviosPage })))
const RutasPage = lazy(() => import('@/features/rutas/RutasPage').then((m) => ({ default: m.RutasPage })))
const SeguimientoPage = lazy(() =>
  import('@/features/seguimiento/SeguimientoPage').then((m) => ({ default: m.SeguimientoPage })),
)

function Cargando() {
  return (
    <div className="flex min-h-[50svh] items-center justify-center">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/seguimiento" element={<SeguimientoPage />} />
        <Route path="/seguimiento/:codigo" element={<SeguimientoPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/panel" element={<DashboardPage />} />
            <Route path="/envios" element={<EnviosPage />} />
            <Route path="/rutas" element={<RutasPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
