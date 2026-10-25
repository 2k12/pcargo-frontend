import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { nombreRecibioSchema, prepararFoto, type DatosEvidencia } from '@/features/envios/evidencia'
import { errorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { EnvioReparto } from '@/types/api'
import { useCambiarEstadoReparto, useSubirEvidenciaReparto } from '../hooks'
import { FotoGuiaCampo } from './FotoGuiaCampo'
import { HojaInferior } from './HojaInferior'

const schema = z.object({ recibidoPor: nombreRecibioSchema })

/** «el nombre», «la foto» o «el nombre y la foto», según lo que se intentó guardar. */
function queSeGuarda(datos: DatosEvidencia): string {
  if (datos.recibidoPor && datos.foto) return 'el nombre y la foto'
  return datos.recibidoPor ? 'el nombre' : 'la foto'
}

/**
 * Se monta con `key` por envío (ver `useHojasReparto`): cada entrega empieza con el formulario vacío.
 *
 * Entrega (contrato v19): quién recibe y la foto de la guía firmada son opcionales; se pueden completar
 * después desde «Hoy». Primero se marca ENTREGADO (es lo que importa) y después se guarda lo que haya
 * como evidencia; si eso falla, la entrega queda registrada igual.
 */
export function EntregarSheet({ envio, onCerrar }: { envio: EnvioReparto | null; onCerrar: () => void }) {
  const cambiar = useCambiarEstadoReparto()
  const subir = useSubirEvidenciaReparto()
  const [foto, setFoto] = useState<File | null>(null)
  const [errorFoto, setErrorFoto] = useState<string | null>(null)
  const [preparando, setPreparando] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { recibidoPor: '' } })

  const onSubmit = async ({ recibidoPor }: z.infer<typeof schema>) => {
    if (!envio) return
    const datos: DatosEvidencia = {}
    if (recibidoPor) datos.recibidoPor = recibidoPor
    if (foto) {
      // La foto se prepara antes de entregar: si no sirve, se avisa sin marcar nada.
      setPreparando(true)
      const lista = await prepararFoto(foto).finally(() => setPreparando(false))
      if ('error' in lista) {
        setErrorFoto(lista.error)
        return
      }
      datos.foto = lista
    }
    try {
      await cambiar.mutateAsync({ id: envio.id, estado: 'ENTREGADO' })
    } catch (e) {
      toast.error(errorMessage(e))
      return
    }
    if (datos.recibidoPor || datos.foto) {
      try {
        await subir.mutateAsync({ id: envio.id, ...datos })
      } catch (e) {
        toast.warning(`Guía ${envio.numeroGuia} entregada, pero no se guardó ${queSeGuarda(datos)}`, {
          description: `${errorMessage(e)}. Complétalo desde «Hoy».`,
        })
        onCerrar()
        return
      }
      toast.success(`Guía ${envio.numeroGuia} entregada`)
    } else {
      toast.success(`Guía ${envio.numeroGuia} entregada`, {
        description: 'Puedes agregar quién recibió y la foto después, desde «Hoy».',
      })
    }
    onCerrar()
  }

  const pendiente = preparando || cambiar.isPending || subir.isPending

  return (
    <HojaInferior
      abierta={!!envio}
      onCerrar={onCerrar}
      titulo="Entregar"
      descripcion={envio ? `Guía ${envio.numeroGuia} · ${envio.destinatario.nombre}` : undefined}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {envio && envio.porCobrar > 0 && (
          <p className="rounded-xl bg-brand-green px-4 py-3 text-center text-lg font-semibold text-brand-green-foreground">
            Cobra {formatCurrency(envio.porCobrar)}
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="recibido-por" className="text-base">
            ¿Quién recibe? <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="recibido-por"
            autoComplete="off"
            autoCapitalize="words"
            maxLength={120}
            className="h-12 text-base"
            aria-invalid={!!errors.recibidoPor}
            {...register('recibidoPor')}
          />
          {errors.recibidoPor && <p className="text-sm text-destructive">{errors.recibidoPor.message}</p>}
        </div>

        <FotoGuiaCampo foto={foto} onFoto={setFoto} error={errorFoto} onError={setErrorFoto} />

        <p className="text-sm text-muted-foreground">Si ahora no puedes, agrega el nombre y la foto después desde «Hoy».</p>

        <Button type="submit" className="h-14 w-full text-base" disabled={pendiente}>
          {pendiente ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
          Confirmar entrega
        </Button>
      </form>
    </HojaInferior>
  )
}
