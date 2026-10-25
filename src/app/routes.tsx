import { Loader2 } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { ROLES_PANEL } from '@/features/auth/roles'
import { SoloAdmin } from '@/features/auth/SoloAdmin'
// La landing es la entrada más visitada: se carga en el bundle inicial para pintarla sin un viaje extra.
import { LandingPage } from '@/features/landing/LandingPage'

// Todo diferido: la landing (ruta pública más visitada) no descarga el login ni el panel
// (react-hook-form, zod, menús…), lo que acorta su carga inicial.
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const AppShell = lazy(() => import('@/components/layout/AppShell').then((m) => ({ default: m.AppShell })))

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const EnviosPage = lazy(() => import('@/features/envios/EnviosPage').then((m) => ({ default: m.EnviosPage })))
const ClientesPage = lazy(() => import('@/features/clientes/ClientesPage').then((m) => ({ default: m.ClientesPage })))
const PerfilPage = lazy(() => import('@/features/perfil/PerfilPage').then((m) => ({ default: m.PerfilPage })))
const RutasPage = lazy(() => import('@/features/rutas/RutasPage').then((m) => ({ default: m.RutasPage })))
const CatalogoPage = lazy(() => import('@/features/catalogo/CatalogoPage').then((m) => ({ default: m.CatalogoPage })))
const IntegracionesPage = lazy(() =>
  import('@/features/integraciones/IntegracionesPage').then((m) => ({ default: m.IntegracionesPage })),
)
const IntegracionDetallePage = lazy(() =>
  import('@/features/integraciones/IntegracionDetallePage').then((m) => ({ default: m.IntegracionDetallePage })),
)
const DesarrolladoresPage = lazy(() =>
  import('@/features/desarrolladores/DesarrolladoresPage').then((m) => ({ default: m.DesarrolladoresPage })),
)
const ReportesPage = lazy(() => import('@/features/reportes/ReportesPage').then((m) => ({ default: m.ReportesPage })))
const TalonariosPage = lazy(() => import('@/features/talonarios/TalonariosPage').then((m) => ({ default: m.TalonariosPage })))
const TalonarioDetallePage = lazy(() =>
  import('@/features/talonarios/TalonarioDetallePage').then((m) => ({ default: m.TalonarioDetallePage })),
)
const CajaPage = lazy(() => import('@/features/caja/CajaPage').then((m) => ({ default: m.CajaPage })))
const UsuariosPage = lazy(() => import('@/features/usuarios/UsuariosPage').then((m) => ({ default: m.UsuariosPage })))
const DatosPersonalesPage = lazy(() =>
  import('@/features/datos-personales/DatosPersonalesPage').then((m) => ({ default: m.DatosPersonalesPage })),
)
// App del repartidor y portal de clientes (contrato v12): espacios propios, también diferidos.
const RepartidorLayout = lazy(() => import('@/features/repartidor/RepartidorLayout').then((m) => ({ default: m.RepartidorLayout })))
const entregas = () => import('@/features/repartidor/EntregasPage')
const PendientesPage = lazy(() => entregas().then((m) => ({ default: m.PendientesPage })))
const HoyPage = lazy(() => entregas().then((m) => ({ default: m.HoyPage })))
const CajaRepartidorPage = lazy(() =>
  import('@/features/repartidor/CajaRepartidorPage').then((m) => ({ default: m.CajaRepartidorPage })),
)
const PerfilRepartidorPage = lazy(() =>
  import('@/features/repartidor/PerfilRepartidorPage').then((m) => ({ default: m.PerfilRepartidorPage })),
)
const PortalLayout = lazy(() => import('@/features/portal/PortalLayout').then((m) => ({ default: m.PortalLayout })))
const ResumenPortalPage = lazy(() => import('@/features/portal/ResumenPortalPage').then((m) => ({ default: m.ResumenPortalPage })))
const EnviosPortalPage = lazy(() => import('@/features/portal/EnviosPortalPage').then((m) => ({ default: m.EnviosPortalPage })))
const NuevoEnvioPortalPage = lazy(() =>
  import('@/features/portal/NuevoEnvioPortalPage').then((m) => ({ default: m.NuevoEnvioPortalPage })),
)
const PerfilPortalPage = lazy(() => import('@/features/portal/PerfilPortalPage').then((m) => ({ default: m.PerfilPortalPage })))
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
        <Route path="/desarrolladores" element={<DesarrolladoresPage />} />
        {/* Panel: solo ADMIN y OPERADOR; cualquier otro rol vuelve a su espacio. */}
        <Route element={<ProtectedRoute roles={ROLES_PANEL} />}>
          <Route element={<AppShell />}>
            <Route path="/panel" element={<DashboardPage />} />
            <Route path="/envios" element={<EnviosPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/caja" element={<CajaPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            {/* Talonarios de guías en blanco (contrato v20): ADMIN y OPERADOR. */}
            <Route path="/talonarios" element={<TalonariosPage />} />
            <Route path="/talonarios/:id" element={<TalonarioDetallePage />} />
            <Route path="/rutas" element={<RutasPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
            <Route element={<SoloAdmin />}>
              <Route path="/catalogo" element={<CatalogoPage />} />
              <Route path="/integraciones" element={<IntegracionesPage />} />
              <Route path="/integraciones/:id" element={<IntegracionDetallePage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              {/* /privacidad es la página legal pública; la administración de datos va aquí. */}
              <Route path="/datos-personales" element={<DatosPersonalesPage />} />
            </Route>
            {/* Rastreo dentro del panel: misma consulta que la pública, sin salir del menú */}
            <Route path="/panel/seguimiento" element={<SeguimientoPage embebido />} />
            <Route path="/panel/seguimiento/:numeroGuia" element={<SeguimientoPage embebido />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['REPARTIDOR']} />}>
          <Route path="/repartidor" element={<RepartidorLayout />}>
            <Route index element={<PendientesPage />} />
            <Route path="hoy" element={<HoyPage />} />
            <Route path="caja" element={<CajaRepartidorPage />} />
            <Route path="perfil" element={<PerfilRepartidorPage />} />
            <Route path="*" element={<Navigate to="/repartidor" replace />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['CLIENTE']} />}>
          <Route path="/portal" element={<PortalLayout />}>
            <Route index element={<ResumenPortalPage />} />
            <Route path="envios" element={<EnviosPortalPage />} />
            <Route path="nuevo" element={<NuevoEnvioPortalPage />} />
            <Route path="perfil" element={<PerfilPortalPage />} />
            <Route path="*" element={<Navigate to="/portal" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
