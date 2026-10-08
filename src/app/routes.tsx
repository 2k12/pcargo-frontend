import { Loader2 } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
// La landing es la entrada más visitada: se carga en el bundle inicial para pintarla sin un viaje extra.
import { LandingPage } from '@/features/landing/LandingPage'

// Todo diferido: la landing (ruta pública más visitada) no descarga el login ni el panel
// (react-hook-form, zod, menús…), lo que acorta su carga inicial.
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const AppShell = lazy(() => import('@/components/layout/AppShell').then((m) => ({ default: m.AppShell })))

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const EnviosPage = lazy(() => import('@/features/envios/EnviosPage').then((m) => ({ default: m.EnviosPage })))
const ClientesPage = lazy(() => import('@/features/clientes/ClientesPage').then((m) => ({ default: m.ClientesPage })))
const RutasPage = lazy(() => import('@/features/rutas/RutasPage').then((m) => ({ default: m.RutasPage })))
const legal = () => import('@/features/legal/paginas')
const PrivacidadPage = lazy(() => legal().then((m) => ({ default: m.PrivacidadPage })))
const TerminosPage = lazy(() => legal().then((m) => ({ default: m.TerminosPage })))
const CookiesPage = lazy(() => legal().then((m) => ({ default: m.CookiesPage })))
const PagoAlCobroPage = lazy(() => legal().then((m) => ({ default: m.PagoAlCobroPage })))
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
        <Route path="/seguimiento/:numeroGuia" element={<SeguimientoPage />} />
        <Route path="/privacidad" element={<PrivacidadPage />} />
        <Route path="/terminos" element={<TerminosPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/pago-al-cobro" element={<PagoAlCobroPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/panel" element={<DashboardPage />} />
            <Route path="/envios" element={<EnviosPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/rutas" element={<RutasPage />} />
            {/* Rastreo dentro del panel: misma consulta que la pública, sin salir del menú */}
            <Route path="/panel/seguimiento" element={<SeguimientoPage embebido />} />
            <Route path="/panel/seguimiento/:numeroGuia" element={<SeguimientoPage embebido />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
