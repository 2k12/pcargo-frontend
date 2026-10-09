import { EnlaceExterno } from '@/components/EnlaceExterno'
import { cn } from '@/lib/utils'

export const URL_DESARROLLADOR = 'https://kuvro-production.up.railway.app/'

/** Crédito del desarrollador para el pie de la landing: «Desarrollado por · KUVRO TECH». */
export function CreditoDesarrollador({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-center gap-2', className)}>
      <span className="text-[11px]">Desarrollado por</span>
      <EnlaceExterno
        href={URL_DESARROLLADOR}
        className="inline-flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
        <span>
          <strong className="font-bold text-foreground">KUVRO</strong>{' '}
          <span className="font-normal text-muted-foreground">TECH</span>
        </span>
      </EnlaceExterno>
    </p>
  )
}
