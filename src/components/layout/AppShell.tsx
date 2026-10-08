import { LayoutDashboard, LogOut, Menu, PackageSearch, Route, Truck, Package } from 'lucide-react'
import { Suspense, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/hooks'
import { iniciales } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { to: '/panel', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/envios', label: 'Envíos', icon: Package, end: false },
  { to: '/rutas', label: 'Rutas y tarifas', icon: Route, end: false },
  { to: '/seguimiento', label: 'Seguimiento', icon: PackageSearch, end: false },
]

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Truck className="size-4" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold">PCargo</p>
        <p className="text-[11px] text-muted-foreground">Logística Imbabura</p>
      </div>
    </div>
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

export function AppShell() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 border-r bg-muted/20 p-4 md:flex">
        <Brand />
        <NavItems />
        <p className="mt-auto px-2 text-[11px] text-muted-foreground">Ibarra · Atuntaqui · Otavalo · Quito</p>
      </aside>

      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetContent side="left" className="w-64 gap-6 p-4">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <Brand />
          <NavItems onNavigate={() => setMenuAbierto(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú" onClick={() => setMenuAbierto(true)}>
            <Menu />
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 md:px-8">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
