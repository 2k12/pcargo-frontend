import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

/** Hoja que sube desde abajo: en el teléfono queda al alcance del pulgar. */
export function HojaInferior({
  abierta,
  onCerrar,
  titulo,
  descripcion,
  children,
}: {
  abierta: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: ReactNode
  children: ReactNode
}) {
  return (
    <Sheet open={abierta} onOpenChange={(o) => !o && onCerrar()}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg gap-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="pb-2">
          <SheetTitle className="text-lg">{titulo}</SheetTitle>
          {descripcion && <SheetDescription>{descripcion}</SheetDescription>}
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
