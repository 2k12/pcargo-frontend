import { LayoutDashboard, LogOut, PackageSearch, Route, Package } from 'lucide-react'
import { Suspense } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Logo, LogoMark } from '@/components/brand/PCargoLogo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/hooks'
import { listaCiudades, useCiudades } from '@/features/rutas/hooks'
import { iniciales } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { to: '/panel', label: 'Resumen', corto: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/envios', label: 'Envíos', corto: 'Envíos', icon: Package, end: false },
  { to: '/rutas', label: 'Cobertura y tarifas', corto: 'Tarifas', icon: Route, end: false },
  { to: '/seguimiento', label: 'Seguimiento', corto: 'Rastreo', icon: PackageSearch, end: false },
]

/** Barra de pestañas inferior para móvil. */
function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {NAV.map(({ to, corto, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground transition-colors',
              isActive && 'font-medium text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className={cn('rounded-full px-4 py-1 transition-colors', isActive && 'bg-muted')}>
                <Icon className="size-4" />
              </span>
              {corto}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <Logo className="px-2 text-sm" markClassName="size-9" subtitulo="Logística Imbabura" />
  )
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              isActive && 'bg-muted font-medium text-foreground',
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function UserMenu() {
  const { usuario, logout } = useAuth()
  if (!usuario) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="h-auto gap-2 px-2 py-1.5" />}>
        <Avatar className="size-7">
          <AvatarFallback className="text-xs">{iniciales(usuario.nombre)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-medium">{usuario.nombre}</span>
          <span className="block text-[11px] leading-tight text-muted-foreground">
            {usuario.rol === 'ADMIN' ? 'Administrador' : 'Operador'}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-xs text-muted-foreground">{usuario.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Pie de la barra lateral: ciudades de cobertura activas, desde la API. */
function CiudadesActivas() {
  const { data } = useCiudades(true)
  const texto = listaCiudades(data)
  return <p className="mt-auto min-h-4 px-2 text-[11px] text-muted-foreground">{texto}</p>
}

export function AppShell() {
  return (
    <div className="flex min-h-svh bg-background">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 border-r bg-muted/20 p-4 md:flex">
        <Brand />
        <NavItems />
        <CiudadesActivas />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <Link to="/panel" aria-label="Ir al resumen" className="md:hidden">
            <LogoMark className="size-8" />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 pt-6 pb-24 md:space-y-8 md:px-8 md:py-8">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
