import { CalendarCheck, ListTodo, LogOut, ScanLine, Wallet, type LucideIcon } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useSearchParams } from 'react-router'
import { LogoMark } from '@/components/brand/PCargoLogo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/features/auth/hooks'
import { normalizarGuia } from '@/features/envios/guia'
import { cn } from '@/lib/utils'
import { BuscarGuiaSheet } from './components/BuscarGuiaSheet'

const PESTANAS: { to: string; label: string; icon: LucideIcon; end: boolean }[] = [
  { to: '/repartidor', label: 'Pendientes', icon: ListTodo, end: true },
  { to: '/repartidor/hoy', label: 'Hoy', icon: CalendarCheck, end: false },
  { to: '/repartidor/caja', label: 'Caja', icon: Wallet, end: false },
]

/**
 * App del repartidor: liviana y pensada para el teléfono en la calle. Encabezado mínimo (logo,
 * nombre, salir), botón de escanear siempre a mano y tres pestañas al alcance del pulgar.
 */
export function RepartidorLayout() {
  const { usuario, logout } = useAuth()
  // /repartidor?guia=N (QR leído con la cámara del teléfono): abre la búsqueda con esa guía.
  const [params, setParams] = useSearchParams()
  const [guiaInicial, setGuiaInicial] = useState(() => normalizarGuia(params.get('guia') ?? ''))
  const [buscar, setBuscar] = useState(() => guiaInicial !== null)
  const [aperturas, setAperturas] = useState(0)
  useEffect(() => {
    // Se quita de la URL para que «Atrás» o recargar no vuelvan a abrirla.
    if (params.has('guia')) {
      setParams(
        (p) => {
          p.delete('guia')
          return p
        },
        { replace: true },
      )
    }
  }, [params, setParams])
  const abrirBuscar = () => {
    setGuiaInicial(null)
    setAperturas((n) => n + 1)
    setBuscar(true)
  }
  const nombre = usuario?.nombre.split(/\s+/)[0] ?? ''

  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
          <LogoMark className="size-8" />
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted-foreground">Hola,</span> <span className="font-medium">{nombre}</span>
          </span>
          <ThemeToggle />
          <Button variant="ghost" className="size-11" onClick={logout} aria-label="Salir" title="Salir">
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 pt-4 pb-40">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>

      {/* Acción frecuente: siempre visible sobre la barra de pestañas. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-30 flex justify-center px-4">
        <Button className="pointer-events-auto h-12 rounded-full px-6 text-base shadow-lg" onClick={abrirBuscar}>
          <ScanLine className="size-5" />
          Buscar o escanear guía
        </Button>
      </div>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-lg grid-cols-3">
          {PESTANAS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground transition-colors',
                  isActive && 'font-semibold text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('rounded-full px-4 py-1', isActive && 'bg-accent text-accent-foreground')}>
                    <Icon className="size-5" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <BuscarGuiaSheet key={aperturas} abierta={buscar} onCerrar={() => setBuscar(false)} numeroInicial={guiaInicial} />
      <Toaster position="top-center" />
    </div>
  )
}
