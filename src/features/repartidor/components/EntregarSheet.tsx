import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Check, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { prepararFoto, TIPOS_FOTO } from '@/features/envios/evidencia'
import { errorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { EnvioReparto } from '@/types/api'
import { useCambiarEstadoReparto, useSubirEvidenciaReparto } from '../hooks'
import { HojaInferior } from './HojaInferior'

const schema = z.object({
  recibidoPor: z.string().trim().min(2, 'Escribe quién recibe (mínimo 2 letras)').max(120, 'Máximo 120 caracteres'),
})

/**
 * Se monta con `key` por envío (ver `useHojasReparto`): cada entrega empieza con el formulario vacío.
 *
 * Entrega: quién recibe (obligatorio) y foto opcional de la guía firmada. Primero se marca ENTREGADO
 * (es lo que importa) y después se sube la foto; si la foto falla, la entrega queda registrada igual.
 */
export function EntregarSheet({ envio, onCerrar }: { envio: EnvioReparto | null; onCerrar: () => void }) {
  const cambiar = useCambiarEstadoReparto()
  const subir = useSubirEvidenciaReparto()
  const [foto, setFoto] = useState<File | null>(null)
  const [errorFoto, setErrorFoto] = useState<string | null>(null)
  const inputFoto = useRef<HTMLInputElement>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { recibidoPor: '' } })

  const elegirFoto = (f: File | undefined) => {
    if (!f) return
    if (!(TIPOS_FOTO as readonly string[]).includes(f.type)) {
      setErrorFoto('La foto debe ser JPG, PNG o WebP')
      return
    }
    setErrorFoto(null)
    setFoto(f)
  }

  const onSubmit = async ({ recibidoPor }: z.infer<typeof schema>) => {
    if (!envio) return
    try {
      await cambiar.mutateAsync({ id: envio.id, estado: 'ENTREGADO', nota: `Recibió: ${recibidoPor}` })
    } catch (e) {
      toast.error(errorMessage(e))
      return
    }
    if (foto) {
      try {
        const lista = await prepararFoto(foto)
        if ('error' in lista) throw new Error(lista.error)
        await subir.mutateAsync({ id: envio.id, foto: lista.archivo, nombreArchivo: lista.nombre, recibidoPor })
      } catch (e) {
        toast.warning(`Guía ${envio.numeroGuia} entregada, pero la foto no se subió`, { description: errorMessage(e) })
        onCerrar()
        return
      }
    }
    toast.success(`Guía ${envio.numeroGuia} entregada`)
    onCerrar()
  }

  const pendiente = cambiar.isPending || subir.isPending

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
            ¿Quién recibe?
          </Label>
          <Input
            id="recibido-por"
            autoComplete="off"
            autoCapitalize="words"
            className="h-12 text-base"
            aria-invalid={!!errors.recibidoPor}
            {...register('recibidoPor')}
          />
          {errors.recibidoPor && <p className="text-sm text-destructive">{errors.recibidoPor.message}</p>}
        </div>

        <div className="space-y-1.5">
          <input
            ref={inputFoto}
            id="foto-entrega"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Foto de la guía firmada"
            onChange={(e) => elegirFoto(e.target.files?.[0])}
          />
          {foto ? (
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
              <Check className="size-4 text-brand-green-text" />
              <span className="min-w-0 flex-1 truncate">Foto lista</span>
              <Button type="button" variant="ghost" className="h-11" onClick={() => setFoto(null)} aria-label="Quitar foto">
                <X />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="h-12 w-full text-base" onClick={() => inputFoto.current?.click()}>
              <Camera className="size-5" />
              Foto de la guía firmada <span className="font-normal text-muted-foreground">(opcional)</span>
            </Button>
          )}
          {errorFoto && <p className="text-sm text-destructive">{errorFoto}</p>}
        </div>

        <Button type="submit" className="h-14 w-full text-base" disabled={pendiente}>
          {pendiente ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
          Confirmar entrega
        </Button>
      </form>
    </HojaInferior>
  )
}
