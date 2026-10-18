import { LayoutDashboard, LogOut, Package, Plus, UserRound, type LucideIcon } from 'lucide-react'
import { Suspense } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { LogoMark } from '@/components/brand/PCargoLogo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/features/auth/hooks'
import { cn } from '@/lib/utils'
import { useClientePortal } from './hooks'

const NAV: { to: string; label: string; icon: LucideIcon; end: boolean }[] = [
  { to: '/portal', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/portal/envios', label: 'Envíos', icon: Package, end: false },
  { to: '/portal/nuevo', label: 'Nuevo envío', icon: Plus, end: false },
  { to: '/portal/perfil', label: 'Mi perfil', icon: UserRound, end: false },
]

/** Portal de clientes empresa: layout propio, con el nombre de la empresa como protagonista. */
export function PortalLayout() {
  const { logout } = useAuth()
  const cliente = useClientePortal()

  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 md:px-8">
          <Link to="/portal" aria-label="Ir al resumen" className="flex min-w-0 items-center gap-2.5">
            <LogoMark className="size-8" />
            <span className="min-w-0 leading-tight">
              {cliente ? (
                <span className="block truncate text-sm font-semibold" data-testid="portal-empresa">
                  {cliente.nombre}
                </span>
              ) : (
                <Skeleton className="h-4 w-32" />
              )}
              <span className="block text-[11px] text-muted-foreground">Portal de clientes PCargo</span>
            </span>
          </Link>
          <nav aria-label="Portal" className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    isActive && 'bg-accent font-medium text-accent-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout} aria-label="Salir">
              <LogOut />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 pt-6 pb-24 md:space-y-8 md:px-8 md:py-8">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>

      <nav
        aria-label="Portal"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground', isActive && 'font-medium text-foreground')
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn('rounded-full px-3 py-1', isActive && 'bg-accent text-accent-foreground')}>
                  <Icon className="size-4" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <Toaster position="top-right" />
    </div>
  )
}
