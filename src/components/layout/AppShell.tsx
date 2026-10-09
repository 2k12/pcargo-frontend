import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Route,
  Package,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Suspense } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Logo, LogoMark } from '@/components/brand/PCargoLogo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
import { useMenuMinimizado } from '@/hooks/useMenuMinimizado'
import { iniciales } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'

/**
 * Navegación agrupada por propósito (proximidad): la operación diaria, la configuración
 * y la página pública de rastreo, que sale del panel (se indica con ↗).
 */
interface ItemNav {
  to: string
  label: string
  corto: string
  icon: LucideIcon
  end: boolean
  externo?: boolean
}

const GRUPOS: { titulo: string; items: ItemNav[] }[] = [
  {
    titulo: 'Operación',
    items: [
      { to: '/panel', label: 'Resumen', corto: 'Resumen', icon: LayoutDashboard, end: true },
      { to: '/envios', label: 'Envíos', corto: 'Envíos', icon: Package, end: false },
      { to: '/clientes', label: 'Clientes', corto: 'Clientes', icon: Users, end: false },
    ],
  },
  {
    titulo: 'Configuración',
    items: [{ to: '/rutas', label: 'Cobertura y tarifas', corto: 'Tarifas', icon: Route, end: false }],
  },
  {
    titulo: 'Público',
    items: [{ to: '/panel/seguimiento', label: 'Rastreo de envíos', corto: 'Rastreo', icon: PackageSearch, end: false }],
  },
]

const NAV = GRUPOS.flatMap((g) => g.items)

/** Estado activo idéntico en barra lateral y pestañas (similitud). */
const ACTIVO = 'bg-accent font-medium text-accent-foreground'

/** Barra de pestañas inferior para móvil. */
function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
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
              <span className={cn('rounded-full px-3 py-1 transition-colors', isActive && ACTIVO)}>
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

function Brand({ minimizado }: { minimizado: boolean }) {
  return minimizado ? (
    <LogoMark className="mx-auto size-9" />
  ) : (
    <Logo className="px-2 text-sm" markClassName="size-9" subtitulo="Logística Imbabura" />
  )
}

function NavItems({ minimizado }: { minimizado: boolean }) {
  return (
    <nav className="flex flex-col gap-5" aria-label="Navegación principal">
      {GRUPOS.map((g, i) => (
        <div key={g.titulo} className="space-y-1">
          {minimizado ? (
            // Sin espacio para el título del grupo: una línea mantiene la separación (proximidad).
            i > 0 && <div role="presentation" className="mx-2 border-t" />
          ) : (
            <p className="px-3 text-[11px] font-medium tracking-wide text-muted-foreground/80 uppercase">{g.titulo}</p>
          )}
          {g.items.map(({ to, label, icon: Icon, end, externo }) => {
            const enlace = (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    minimizado && 'justify-center px-0',
                    isActive && ACTIVO,
                  )
                }
              >
                <Icon className="size-4 shrink-0" />
                {/* Minimizado, el nombre sigue ahí para lectores de pantalla; a la vista aparece como tooltip. */}
                <span className={cn('flex-1', minimizado && 'sr-only')}>{label}</span>
                {externo && !minimizado && <ArrowUpRight className="size-3.5 opacity-60" />}
              </NavLink>
            )
            return minimizado ? (
              <Tooltip key={to}>
                <TooltipTrigger render={<div />}>{enlace}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            ) : (
              enlace
            )
          })}
        </div>
      ))}
    </nav>
  )
}

/** Botón al pie de la barra lateral para minimizarla a solo iconos (o volver a expandirla). */
function BotonMinimizar({ minimizado, onAlternar }: { minimizado: boolean; onAlternar: () => void }) {
  const Icon = minimizado ? PanelLeftOpen : PanelLeftClose
  const texto = minimizado ? 'Expandir menú' : 'Minimizar menú'
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={texto}
      onClick={onAlternar}
      className={cn('mt-auto w-full text-muted-foreground', minimizado ? 'justify-center px-0' : 'justify-start')}
    >
      <Icon />
      {!minimizado && texto}
    </Button>
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

export function AppShell() {
  const { minimizado, alternar } = useMenuMinimizado()
  return (
    <div className="flex min-h-svh bg-muted/40">
      <aside
        id="menu-lateral"
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 flex-col gap-6 overflow-y-auto border-r bg-background py-4 transition-[width] duration-200 motion-reduce:transition-none md:flex',
          minimizado ? 'w-16 px-2' : 'w-60 px-4',
        )}
      >
        <Brand minimizado={minimizado} />
        <NavItems minimizado={minimizado} />
        <BotonMinimizar minimizado={minimizado} onAlternar={alternar} />
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
      <Toaster position="top-right" />
    </div>
  )
}
