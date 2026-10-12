import { TriangleAlert } from 'lucide-react'
import { BotonCopiar } from '@/components/BotonCopiar'
import { Button } from '@/components/ui/button'
import { ATENCION_TONO } from '@/features/envios/ui'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Muestra una credencial (API key o secreto `whsec_`) UNA sola vez: el servidor no la guarda en claro,
 * así que al cerrar el diálogo ya no se puede recuperar (solo crear otra o rotarla).
 */
export function SecretoUnaVez({
  valor,
  titulo,
  descripcion,
  onCerrar,
}: {
  /** null = cerrado. */
  valor: string | null
  titulo: string
  descripcion: string
  onCerrar: () => void
}) {
  return (
    <Dialog open={valor !== null} onOpenChange={(o) => !o && onCerrar()} disablePointerDismissal>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-2 ring-1 ring-foreground/10">
            <code data-testid="secreto-una-vez" className="min-w-0 flex-1 overflow-x-auto font-mono text-xs break-all whitespace-pre-wrap">
              {valor}
            </code>
            {valor && <BotonCopiar valor={valor} etiqueta="Copiar al portapapeles" texto="Copiar" variant="outline" />}
          </div>
          <p role="alert" className={cn('flex items-start gap-2 rounded-lg p-3 text-xs', ATENCION_TONO)}>
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>No se volverá a mostrar.</strong> Cópiala ahora y guárdala en un lugar seguro (gestor de secretos o variables
              de entorno del servidor de la empresa). Si se pierde, tendrás que generar una nueva.
            </span>
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onCerrar}>Ya la guardé</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
