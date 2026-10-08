import { Check, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/**
 * Filtros de una vista en móvil: un botón compacto (con el número de filtros activos) que abre una hoja
 * inferior con los controles a ancho completo. Libera la pantalla para el contenido; en escritorio cada
 * vista sigue mostrando sus filtros en línea.
 */
export function FiltrosMovil({
  activos,
  onLimpiar,
  children,
  titulo = 'Filtros',
  descripcion,
  etiqueta = 'Filtros',
  icono: Icono = SlidersHorizontal,
  className,
}: {
  /** Cuántos filtros difieren del valor por defecto (se muestra como insignia). */
  activos: number
  onLimpiar: () => void
  children: ReactNode
  titulo?: string
  descripcion?: string
  /** Texto del botón (p. ej. "Filtros" u "Ordenar"). */
  etiqueta?: string
  icono?: LucideIcon
  className?: string
}) {
  const [abierto, setAbierto] = useState(false)

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <Button
        variant="outline"
        className={cn('shrink-0', activos > 0 && 'border-primary/40 text-primary', className)}
        aria-label={activos > 0 ? `${etiqueta} (${activos} ${activos === 1 ? 'activo' : 'activos'})` : etiqueta}
        aria-haspopup="dialog"
        onClick={() => setAbierto(true)}
      >
        <Icono />
        {etiqueta}
        {activos > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums">
            {activos}
          </span>
        )}
      </Button>
      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="pb-2">
          <SheetTitle>{titulo}</SheetTitle>
          {descripcion && <SheetDescription>{descripcion}</SheetDescription>}
        </SheetHeader>
        <div className="space-y-5 overflow-y-auto px-4 pb-4">{children}</div>
        <div className="flex gap-2 border-t p-4">
          <Button variant="ghost" className="flex-1" disabled={activos === 0} onClick={onLimpiar}>
            Limpiar
          </Button>
          <SheetClose render={<Button className="flex-1" />}>Ver resultados</SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Un filtro dentro de la hoja: etiqueta visible y el control a ancho completo. */
export function CampoFiltro({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="space-y-1.5">
      <p id={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

/** Opciones excluyentes con objetivos táctiles grandes (alternativa móvil a `Segmented`). */
export function OpcionesFiltro<T extends string>({
  label,
  value,
  onChange,
  options,
  columnas = 2,
}: {
  label: string
  value: T | null
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  columnas?: 1 | 2
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-2', columnas === 2 && 'grid-cols-2')}>
      {options.map((o) => {
        const activa = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex h-11 items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-colors',
              activa ? 'border-primary bg-primary/5 font-medium text-primary' : 'hover:bg-muted',
            )}
          >
            {o.label}
            {activa && <Check className="size-4 shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}
