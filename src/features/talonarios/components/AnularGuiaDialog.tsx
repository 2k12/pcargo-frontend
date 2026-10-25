import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { numeroGuiaImpreso } from '@/features/envios/guiaImprimible'
import { errorMessage } from '@/lib/api'
import { anularGuiaSchema, MAX_MOTIVO, type AnularGuiaValues } from '../domain'
import { useAnularGuia } from '../hooks'

/**
 * Anular una guía en blanco (dañada, perdida o mal llenada). El propio diálogo es la confirmación:
 * pide el motivo (3–200) y avisa que no se puede deshacer.
 */
export function AnularGuiaDialog({
  talonarioId,
  numeroGuia,
  onClose,
}: {
  talonarioId: string
  /** Número a anular; null → cerrado. */
  numeroGuia: number | null
  onClose: () => void
}) {
  const anular = useAnularGuia(talonarioId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AnularGuiaValues>({ resolver: zodResolver(anularGuiaSchema), defaultValues: { motivo: '' } })

  useEffect(() => {
    if (numeroGuia !== null) reset({ motivo: '' })
  }, [numeroGuia, reset])

  const n = numeroGuia !== null ? numeroGuiaImpreso(numeroGuia) : ''

  const onSubmit = async ({ motivo }: AnularGuiaValues) => {
    if (numeroGuia === null) return
    try {
      await anular.mutateAsync({ numeroGuia, motivo: motivo.trim() })
      toast.success(`Guía ${n} anulada`)
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={numeroGuia !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Anular la guía {n}?</DialogTitle>
          <DialogDescription>
            No se podrá registrar ningún envío con este número y no se puede deshacer. Úsalo para guías dañadas, perdidas o mal
            llenadas.
          </DialogDescription>
        </DialogHeader>
        <form id="form-anular-guia" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-1.5">
          <Label htmlFor="motivo-anulacion">Motivo</Label>
          <Textarea
            id="motivo-anulacion"
            rows={3}
            maxLength={MAX_MOTIVO}
            placeholder="Ej. Se mojó y no se lee"
            aria-invalid={!!errors.motivo}
            {...register('motivo')}
          />
          {errors.motivo && <p className="text-xs text-destructive">{errors.motivo.message}</p>}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-anular-guia" variant="destructive" disabled={anular.isPending}>
            {anular.isPending && <Loader2 className="animate-spin" />}
            Anular guía
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
