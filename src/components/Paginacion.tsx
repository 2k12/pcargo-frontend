import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OPCIONES_POR_PAGINA, rangoPagina } from '@/lib/paginacion'
import { cn } from '@/lib/utils'

/**
 * Controles de una lista paginada en el servidor: resumen "21–40 de 135", tamaño de página y navegación.
 * La página la decide quien lo usa (normalmente en la URL) para que se pueda compartir y volver atrás.
 */
export function Paginacion({
  pagina,
  porPagina,
  total,
  totalPaginas,
  onPagina,
  onPorPagina,
  cargando = false,
  className,
}: {
  pagina: number
  porPagina: number
  total: number
  totalPaginas: number
  onPagina: (pagina: number) => void
  onPorPagina?: (porPagina: number) => void
  /** Mientras llega la página nueva se deshabilita la navegación para evitar saltos dobles. */
  cargando?: boolean
  className?: string
}) {
  const { desde, hasta } = rangoPagina(pagina, porPagina, total)
  const hayAnterior = pagina > 1
  const haySiguiente = pagina < totalPaginas
  const items = OPCIONES_POR_PAGINA.map((n) => ({ value: String(n), label: `${n} por página` }))

  return (
    <nav
      aria-label="Paginación"
      className={cn('flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between', className)}
    >
      <p className="text-muted-foreground tabular-nums" aria-live="polite">
        {total === 0 ? 'Sin resultados' : `${desde}–${hasta} de ${total}`}
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        {onPorPagina && (
          <Select items={items} value={String(porPagina)} onValueChange={(v) => v && onPorPagina(Number(v))}>
            <SelectTrigger className="w-36" aria-label="Envíos por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex"
            aria-label="Primera página"
            disabled={!hayAnterior || cargando}
            onClick={() => onPagina(1)}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Página anterior"
            disabled={!hayAnterior || cargando}
            onClick={() => onPagina(pagina - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-24 px-1 text-center tabular-nums">
            Página {totalPaginas === 0 ? 0 : pagina} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Página siguiente"
            disabled={!haySiguiente || cargando}
            onClick={() => onPagina(pagina + 1)}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex"
            aria-label="Última página"
            disabled={!haySiguiente || cargando}
            onClick={() => onPagina(totalPaginas)}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </nav>
  )
}
