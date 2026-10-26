import {
  ArrowUpRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Route,
  Package,
  ShieldCheck,
  Tags,
  UserCog,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Logo, LogoMark } from '@/components/brand/PCargoLogo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
import { useAuth, useEsAdmin } from '@/features/auth/hooks'
import { ROL_LABEL } from '@/features/auth/roles'
import { BuscarGuiaRapida } from '@/features/envios/components/BuscarGuiaRapida'
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
  /** Solo para ADMIN: a un OPERADOR no se le muestra (el servidor también lo bloquea). */
  soloAdmin?: boolean
  /** false: no va en la barra inferior del móvil (cuatro pestañas + «Más»); en móvil se abre desde «Más». */
  movil?: boolean
}

const GRUPOS: { titulo: string; items: ItemNav[] }[] = [
  {
    titulo: 'Operación',
    items: [
      { to: '/panel', label: 'Resumen', corto: 'Resumen', icon: LayoutDashboard, end: true },
      { to: '/envios', label: 'Envíos', corto: 'Envíos', icon: Package, end: false },
      { to: '/clientes', label: 'Clientes', corto: 'Clientes', icon: Users, end: false },
      { to: '/caja', label: 'Caja', corto: 'Caja', icon: Wallet, end: false },
      { to: '/reportes', label: 'Reportes', corto: 'Reportes', icon: FileText, end: false, movil: false },
      // Contrato v20: guías en blanco para llenar a mano en carretera.
      { to: '/talonarios', label: 'Talonarios', corto: 'Talonarios', icon: NotebookPen, end: false, movil: false },
    ],
  },
  {
    titulo: 'Configuración',
    items: [
      { to: '/rutas', label: 'Cobertura y tarifas', corto: 'Tarifas', icon: Route, end: false, movil: false },
      { to: '/catalogo', label: 'Tarifas y tipos de carga', corto: 'Catálogo', icon: Tags, end: false, soloAdmin: true, movil: false },
      { to: '/integraciones', label: 'Integraciones', corto: 'API', icon: Plug, end: false, soloAdmin: true, movil: false },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { to: '/usuarios', label: 'Usuarios', corto: 'Usuarios', icon: UserCog, end: false, soloAdmin: true, movil: false },
      {
        to: '/datos-personales',
        label: 'Datos personales',
        corto: 'Datos',
        icon: ShieldCheck,
        end: false,
        soloAdmin: true,
        movil: false,
      },
    ],
  },
  {
    titulo: 'Público',
    items: [{ to: '/panel/seguimiento', label: 'Rastreo de envíos', corto: 'Rastreo', icon: PackageSearch, end: false, movil: false }],
  },
]

const NAV_MOVIL = GRUPOS.flatMap((g) => g.items).filter((i) => i.movil !== false)

/** Grupos visibles según el rol (un grupo sin opciones visibles desaparece). */
function useGrupos() {
  const esAdmin = useEsAdmin()
  return GRUPOS.map((g) => ({ ...g, items: g.items.filter((i) => !i.soloAdmin || esAdmin) })).filter((g) => g.items.length > 0)
}

/** Estado activo idéntico en barra lateral y pestañas (similitud). */
const ACTIVO = 'bg-accent font-medium text-accent-foreground'

const enRuta = (ruta: string, to: string) => ruta === to || ruta.startsWith(`${to}/`)

const claseTab = (activo: boolean) =>
  cn('flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground transition-colors', activo && 'font-medium text-foreground')

function IconoTab({ icon: Icon, activo }: { icon: LucideIcon; activo: boolean }) {
  return (
    <span className={cn('rounded-full px-3 py-1 transition-colors', activo && ACTIVO)}>
      <Icon className="size-4" />
    </span>
  )
}

/**
 * «Más» (móvil): todas las secciones que no caben en la barra, agrupadas como en la barra lateral
 * (mismos títulos y orden), más la cuenta. Así cada rol ve en el teléfono todo lo que puede abrir.
 */
function MasSheet({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { usuario, logout } = useAuth()
  const { pathname } = useLocation()
  const grupos = useGrupos()
    .map((g) => ({ ...g, items: g.items.filter((i) => i.movil === false) }))
    .filter((g) => g.items.length > 0)
  const fila = 'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors hover:bg-muted'
  return (
    <Sheet open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <SheetContent side="bottom" className="max-h-[85svh] gap-0 overflow-y-auto rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <SheetHeader className="pb-2">
          <SheetTitle>Más</SheetTitle>
          <SheetDescription className="sr-only">Otras secciones del panel y tu cuenta</SheetDescription>
        </SheetHeader>
        <nav aria-label="Más secciones" className="space-y-4 px-4">
          {grupos.map((g) => (
            <div key={g.titulo} className="space-y-1">
              <p className="px-3 text-[11px] font-medium tracking-wide text-muted-foreground/80 uppercase">{g.titulo}</p>
              {g.items.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} onClick={onCerrar} className={cn(fila, enRuta(pathname, to) && ACTIVO)}>
                  <Icon className="size-4 text-muted-foreground" />
                  {label}
                </Link>
              ))}
            </div>
          ))}
          <div className="space-y-1 border-t pt-3">
            <Link to="/perfil" onClick={onCerrar} className={cn(fila, enRuta(pathname, '/perfil') && ACTIVO)}>
              <UserRound className="size-4 text-muted-foreground" />
              Mi perfil
              {usuario && <span className="ml-auto truncate text-xs text-muted-foreground">{usuario.email}</span>}
            </Link>
            <button type="button" onClick={logout} className={cn(fila, 'w-full text-left')}>
              <LogOut className="size-4 text-muted-foreground" />
              Cerrar sesión
            </button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

/** Barra de pestañas inferior para móvil: las cuatro secciones diarias y «Más» para el resto. */
function BottomNav() {
  const { pathname } = useLocation()
  const [mas, setMas] = useState(false)
  const masActivo = useGrupos().some((g) => g.items.some((i) => i.movil === false && enRuta(pathname, i.to))) || enRuta(pathname, '/perfil')
  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV_MOVIL.map(({ to, corto, icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => claseTab(isActive)}>
            {({ isActive }) => (
              <>
                <IconoTab icon={icon} activo={isActive} />
                {corto}
              </>
            )}
          </NavLink>
        ))}
        <button type="button" className={claseTab(masActivo || mas)} aria-haspopup="dialog" onClick={() => setMas(true)}>
          <IconoTab icon={Menu} activo={masActivo || mas} />
          Más
        </button>
      </nav>
      <MasSheet abierto={mas} onCerrar={() => setMas(false)} />
    </>
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
  const grupos = useGrupos()
  return (
    <nav className="flex flex-col gap-5" aria-label="Navegación principal">
      {grupos.map((g, i) => (
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
  const navigate = useNavigate()
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
            {ROL_LABEL[usuario.rol]}
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
        <DropdownMenuItem onClick={() => navigate('/perfil')}>
          <UserRound />
          Mi perfil
        </DropdownMenuItem>
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
          <div className="ml-auto flex min-w-0 items-center gap-1">
            {/* Contrato v21: búsqueda rápida por número del sistema o guía física. */}
            <BuscarGuiaRapida />
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
