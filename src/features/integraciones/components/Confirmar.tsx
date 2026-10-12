import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

/** Confirmación de una acción irreversible o delicada (revocar, rotar, eliminar). */
export function Confirmar({
  abierto,
  onCancelar,
  onConfirmar,
  titulo,
  descripcion,
  accion,
  pendiente = false,
  destructiva = true,
}: {
  abierto: boolean
  onCancelar: () => void
  onConfirmar: () => void
  titulo: string
  descripcion: ReactNode
  /** Texto del botón de confirmación. */
  accion: string
  pendiente?: boolean
  destructiva?: boolean
}) {
  return (
    <AlertDialog open={abierto} onOpenChange={(o) => !o && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button variant={destructiva ? 'destructive' : 'default'} disabled={pendiente} onClick={onConfirmar}>
            {pendiente && <Loader2 className="animate-spin" />}
            {accion}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
