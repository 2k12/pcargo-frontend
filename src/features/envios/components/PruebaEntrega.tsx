import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, ImageOff, Loader2, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { BlobImagen } from '@/components/BlobImagen'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { Envio } from '@/types/api'
import { ACCEPT_FOTO, evidenciaSchema, formatBytes, prepararFoto, type EvidenciaFormValues } from '../evidencia'
import { useEvidenciaFoto, useSubirEvidencia } from '../hooks'

/** Mensajes claros para los errores del contrato al subir la evidencia. */
function mensajeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'ESTADO_INVALIDO') return 'Solo se puede subir la prueba de un envío entregado. Márcalo como entregado primero.'
    if (e.code === 'VALIDACION') return `Revisa la foto y el nombre: ${e.message}`
  }
  return errorMessage(e)
}

interface FormProps {
  envioId: string
  recibidoPorInicial?: string
  enfocar?: boolean
  onListo?: () => void
  onCancelar?: () => void
}

/** Formulario: nombre de quien recibió + foto de la guía firmada (abre la cámara en el celular). */
export function EvidenciaForm({ envioId, recibidoPorInicial = '', enfocar, onListo, onCancelar }: FormProps) {
  const subir = useSubirEvidencia(envioId)
  const [preparando, setPreparando] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<EvidenciaFormValues>({
    resolver: zodResolver(evidenciaSchema),
    defaultValues: { recibidoPor: recibidoPorInicial },
  })

  useEffect(() => {
    if (enfocar) setFocus('recibidoPor')
  }, [enfocar, setFocus])

  const onSubmit = async ({ recibidoPor, foto }: EvidenciaFormValues) => {
    setPreparando(true)
    const lista = await prepararFoto(foto).finally(() => setPreparando(false))
    if ('error' in lista) {
      setError('foto', { message: lista.error })
      return
    }
    try {
      await subir.mutateAsync({ foto: lista.archivo, nombreArchivo: lista.nombre, recibidoPor })
      toast.success('Prueba de entrega guardada')
      onListo?.()
    } catch (e) {
      toast.error(mensajeError(e))
    }
  }

  const ocupado = preparando || subir.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 rounded-xl p-3 ring-1 ring-foreground/10" aria-label="Subir prueba de entrega">
      <div className="space-y-1.5">
        <Label htmlFor="recibidoPor">Nombre de quien recibió</Label>
        <Input
          id="recibidoPor"
          autoComplete="off"
          maxLength={120}
          aria-invalid={!!errors.recibidoPor}
          aria-describedby={errors.recibidoPor ? 'recibidoPor-error' : undefined}
          {...register('recibidoPor')}
        />
        {errors.recibidoPor && (
          <p id="recibidoPor-error" className="text-xs text-destructive">
            {errors.recibidoPor.message}
          </p>
        )}
      </div>

      <Controller
        control={control}
        name="foto"
        render={({ field }) => (
          <div className="space-y-1.5">
            <p className="text-sm leading-none font-medium" aria-hidden>
              Foto de la guía firmada
            </p>
            <label
              htmlFor="foto-evidencia"
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-3 text-sm transition-colors hover:bg-muted/60 focus-within:ring-2 focus-within:ring-ring"
            >
              <Camera className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                {field.value ? (
                  <>
                    <span className="block truncate font-medium">{field.value.name}</span>
                    <span className="block text-xs text-muted-foreground">{formatBytes(field.value.size)} · toca para cambiarla</span>
                  </>
                ) : (
                  <>
                    <span className="block font-medium">Tomar o elegir foto</span>
                    <span className="block text-xs text-muted-foreground">JPG, PNG o WebP · hasta 5 MB (se reduce si pesa mucho)</span>
                  </>
                )}
              </span>
              <input
                id="foto-evidencia"
                type="file"
                accept={ACCEPT_FOTO}
                capture="environment"
                className="sr-only"
                aria-label="Foto de la guía firmada"
                aria-invalid={!!errors.foto}
                aria-describedby={errors.foto ? 'foto-error' : undefined}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(e.target.files?.[0])}
              />
            </label>
            {errors.foto && (
              <p id="foto-error" className="text-xs text-destructive">
                {errors.foto.message}
              </p>
            )}
          </div>
        )}
      />

      <div className="flex flex-wrap justify-end gap-2">
        {onCancelar && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancelar} disabled={ocupado}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={ocupado}>
          {ocupado ? <Loader2 className="animate-spin" /> : <Upload />}
          {preparando ? 'Preparando foto…' : 'Guardar prueba'}
        </Button>
      </div>
    </form>
  )
}

function FotoEvidencia({ envio }: { envio: Envio }) {
  const evidencia = envio.evidencia!
  const { data: blob, isLoading, isError, refetch } = useEvidenciaFoto(envio.id, evidencia.subidaEn)
  const [grande, setGrande] = useState(false)

  if (isLoading) return <Skeleton className="size-24 shrink-0 rounded-lg" />
  if (isError || !blob)
    return (
      <button
        type="button"
        onClick={() => refetch()}
        className="flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg bg-muted text-xs text-muted-foreground"
      >
        <ImageOff className="size-5" />
        Reintentar
      </button>
    )
  return (
    <>
      <button
        type="button"
        onClick={() => setGrande(true)}
        className="size-24 shrink-0 overflow-hidden rounded-lg ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="Ver foto de la guía firmada en grande"
      >
        <BlobImagen blob={blob} alt={`Guía firmada por ${evidencia.recibidoPor}`} className="size-full object-cover" />
      </button>
      <Dialog open={grande} onOpenChange={setGrande}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Guía {envio.numeroGuia} firmada</DialogTitle>
            <DialogDescription>Recibió {evidencia.recibidoPor}</DialogDescription>
          </DialogHeader>
          <BlobImagen
            blob={blob}
            alt={`Guía firmada por ${evidencia.recibidoPor}`}
            className="max-h-[75svh] w-full rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Sección «Prueba de entrega» del detalle: formulario si el envío está ENTREGADO sin evidencia,
 * o la foto con quién recibió y la opción de reemplazarla.
 */
export function PruebaEntrega({ envio, resaltar = false }: { envio: Envio; resaltar?: boolean }) {
  const [reemplazando, setReemplazando] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (resaltar) ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  }, [resaltar])

  if (envio.estado !== 'ENTREGADO' && !envio.evidencia) return null
  const evidencia = envio.evidencia

  return (
    <section ref={ref} className="space-y-2" aria-label="Prueba de entrega">
      <SectionLabel>Prueba de entrega</SectionLabel>
      {evidencia && !reemplazando ? (
        <div className="flex gap-3 rounded-xl bg-muted/40 p-3" data-testid="evidencia">
          <FotoEvidencia envio={envio} />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-xs text-muted-foreground">Recibió</p>
            <p className="truncate text-sm font-medium">{evidencia.recibidoPor}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(evidencia.subidaEn)}
              {evidencia.subidaPor && ` · ${evidencia.subidaPor}`}
            </p>
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setReemplazando(true)}>
              <RefreshCw />
              Reemplazar foto
            </Button>
          </div>
        </div>
      ) : (
        <>
          {!evidencia && (
            <p className="text-sm text-muted-foreground">
              Sube la foto de la copia de entrega firmada y el nombre de quien la recibió.
            </p>
          )}
          <EvidenciaForm
            envioId={envio.id}
            recibidoPorInicial={evidencia?.recibidoPor}
            enfocar={resaltar}
            onListo={() => setReemplazando(false)}
            onCancelar={evidencia ? () => setReemplazando(false) : undefined}
          />
        </>
      )}
    </section>
  )
}
