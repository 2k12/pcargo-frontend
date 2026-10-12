import { cn } from '@/lib/utils'
import { BotonCopiar } from './BotonCopiar'

/** Código listo para copiar: monoespaciado, con desplazamiento horizontal y botón "Copiar". */
export function BloqueCodigo({
  codigo,
  titulo,
  lenguaje,
  className,
}: {
  codigo: string
  /** Rótulo visible (p. ej. "curl", "JavaScript"). */
  titulo?: string
  lenguaje?: string
  className?: string
}) {
  return (
    <figure className={cn('overflow-hidden rounded-xl bg-muted/50 ring-1 ring-foreground/10', className)}>
      <figcaption className="flex items-center justify-between gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-medium">{titulo ?? lenguaje ?? 'Código'}</span>
        <BotonCopiar valor={codigo} etiqueta={titulo ? `Copiar ${titulo}` : 'Copiar código'} texto="Copiar" size="xs" />
      </figcaption>
      <pre tabIndex={0} className="overflow-x-auto p-3 text-xs leading-5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <code data-lenguaje={lenguaje}>{codigo}</code>
      </pre>
    </figure>
  )
}
