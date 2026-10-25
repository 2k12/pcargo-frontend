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
import type { EnvioReparto } from '@/types/api'
import { faltantesEntrega } from '../domain'
import { useSubirEvidenciaReparto } from '../hooks'
import { FotoGuiaCampo } from './FotoGuiaCampo'
import { HojaInferior } from './HojaInferior'

const schema = z.object({ recibidoPor: nombreRecibioSchema })

const MENSAJE_NADA_QUE_GUARDAR = 'Escribe quién recibió o toma la foto de la guía firmada'

/**
 * Completar o editar la prueba de una entrega ya hecha (contrato v19): el nombre de quien recibió y/o la
 * foto de la guía firmada, por separado. Solo se envía lo que cambió. Se monta con `key` por envío.
 */
export function CompletarEntregaSheet({ envio, onCerrar }: { envio: EnvioReparto | null; onCerrar: () => void }) {
  const subir = useSubirEvidenciaReparto()
  const [foto, setFoto] = useState<File | null>(null)
  const [errorFoto, setErrorFoto] = useState<string | null>(null)
  const [preparando, setPreparando] = useState(false)
  const nombreActual = envio?.evidencia?.recibidoPor ?? ''
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { recibidoPor: nombreActual } })

  const falta = envio ? faltantesEntrega(envio) : null
  const incompleta = !!falta && (falta.nombre || falta.foto)

  const onSubmit = async ({ recibidoPor }: z.infer<typeof schema>) => {
    if (!envio) return
    const datos: DatosEvidencia = {}
    if (recibidoPor && recibidoPor !== nombreActual) datos.recibidoPor = recibidoPor
    if (foto) {
      setPreparando(true)
      const lista = await prepararFoto(foto).finally(() => setPreparando(false))
      if ('error' in lista) {
        setErrorFoto(lista.error)
        return
      }
      datos.foto = lista
    }
    if (!datos.recibidoPor && !datos.foto) {
      setError('recibidoPor', { message: recibidoPor ? 'No hay cambios para guardar' : MENSAJE_NADA_QUE_GUARDAR })
      return
    }
    try {
      await subir.mutateAsync({ id: envio.id, ...datos })
      toast.success(`Guía ${envio.numeroGuia}: entrega ${incompleta ? 'completada' : 'actualizada'}`)
      onCerrar()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const pendiente = preparando || subir.isPending

  return (
    <HojaInferior
      abierta={!!envio}
      onCerrar={onCerrar}
      titulo={incompleta ? 'Completar entrega' : 'Editar entrega'}
      descripcion={envio ? `Guía ${envio.numeroGuia} · ${envio.destinatario.nombre}` : undefined}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="completar-recibido-por" className="text-base">
            ¿Quién recibió?
          </Label>
          <Input
            id="completar-recibido-por"
            autoComplete="off"
            autoCapitalize="words"
            maxLength={120}
            className="h-12 text-base"
            aria-invalid={!!errors.recibidoPor}
            {...register('recibidoPor')}
          />
          {errors.recibidoPor && <p className="text-sm text-destructive">{errors.recibidoPor.message}</p>}
        </div>

        <div className="space-y-1.5">
          {falta?.hayFoto && <p className="text-sm text-muted-foreground">Ya hay una foto guardada; si tomas otra, la reemplaza.</p>}
          <FotoGuiaCampo
            foto={foto}
            onFoto={setFoto}
            error={errorFoto}
            onError={setErrorFoto}
            texto={falta?.foto ? 'Tomar foto de la guía firmada' : 'Tomar otra foto de la guía'}
            opcional={false}
          />
        </div>

        <Button type="submit" className="h-14 w-full text-base" disabled={pendiente}>
          {pendiente ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
          Guardar
        </Button>
      </form>
    </HojaInferior>
  )
}
