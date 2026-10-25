import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, ImageOff, ImagePlus, Loader2, Pencil, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import {
  ACCEPT_FOTO,
  esquemaEvidencia,
  formatBytes,
  prepararFoto,
  type CamposEvidencia,
  type DatosEvidencia,
  type EvidenciaFormValues,
} from '../evidencia'
import { useEvidenciaFoto, useSubirEvidencia } from '../hooks'

/** Mensajes claros para los errores del contrato al subir la evidencia. */
function mensajeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'ESTADO_INVALIDO') return 'Solo se puede subir la prueba de un envío entregado. Márcalo como entregado primero.'
    if (e.code === 'VALIDACION') return `Revisa la foto y el nombre: ${e.message}`
  }
  return errorMessage(e)
}

const TEXTO_GUARDAR: Record<CamposEvidencia, string> = {
  ambos: 'Guardar prueba',
  nombre: 'Guardar nombre',
  foto: 'Guardar foto',
}

const TEXTO_EXITO: Record<CamposEvidencia, string> = {
  ambos: 'Prueba de entrega guardada',
  nombre: 'Nombre de quien recibió guardado',
  foto: 'Foto de la guía firmada guardada',
}

interface FormProps {
  envioId: string
  /** Qué se edita (contrato v19: el nombre y la foto se guardan por separado). */
  campos?: CamposEvidencia
  recibidoPorInicial?: string
  enfocar?: boolean
  onListo?: () => void
  onCancelar?: () => void
}

/**
 * Formulario de la prueba de entrega: nombre de quien recibió y/o foto de la guía firmada (abre la cámara
 * en el celular). Solo se envía lo que se completó; con `campos` se limita a uno de los dos.
 */
export function EvidenciaForm({ envioId, campos = 'ambos', recibidoPorInicial = '', enfocar, onListo, onCancelar }: FormProps) {
  const subir = useSubirEvidencia(envioId)
  const [preparando, setPreparando] = useState(false)
  const schema = useMemo(() => esquemaEvidencia(campos), [campos])
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<EvidenciaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { recibidoPor: recibidoPorInicial },
  })
  const conNombre = campos !== 'foto'
  const conFoto = campos !== 'nombre'

  useEffect(() => {
    if (enfocar && conNombre) setFocus('recibidoPor')
  }, [enfocar, conNombre, setFocus])

  const onSubmit = async ({ recibidoPor, foto }: EvidenciaFormValues) => {
    const datos: DatosEvidencia = {}
    if (conNombre && recibidoPor) datos.recibidoPor = recibidoPor
    if (conFoto && foto) {
      setPreparando(true)
      const lista = await prepararFoto(foto).finally(() => setPreparando(false))
      if ('error' in lista) {
        setError('foto', { message: lista.error })
        return
      }
      datos.foto = lista
    }
    try {
      await subir.mutateAsync(datos)
      toast.success(TEXTO_EXITO[campos])
      onListo?.()
    } catch (e) {
      toast.error(mensajeError(e))
    }
  }

  const ocupado = preparando || subir.isPending
  const opcional = campos === 'ambos' && <span className="font-normal text-muted-foreground"> (opcional)</span>

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-3 rounded-xl p-3 ring-1 ring-foreground/10"
      aria-label="Subir prueba de entrega"
    >
      {conNombre && (
        <div className="space-y-1.5">
          <Label htmlFor="recibidoPor">
            Nombre de quien recibió
            {opcional}
          </Label>
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
      )}

      {conFoto && (
        <Controller
          control={control}
          name="foto"
          render={({ field }) => (
            <div className="space-y-1.5">
              <p className="text-sm leading-none font-medium" aria-hidden>
                Foto de la guía firmada
                {opcional}
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
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancelar && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancelar} disabled={ocupado}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={ocupado}>
          {ocupado ? <Loader2 className="animate-spin" /> : <Upload />}
          {preparando ? 'Preparando foto…' : TEXTO_GUARDAR[campos]}
        </Button>
      </div>
    </form>
  )
}

const altFoto = (recibidoPor: string | null) => (recibidoPor ? `Guía firmada por ${recibidoPor}` : 'Guía firmada')

/** Miniatura de la foto (se descarga con el token). Solo se pide la imagen si la evidencia tiene foto. */
function FotoEvidencia({ envio }: { envio: Envio }) {
  const evidencia = envio.evidencia!
  const { data: blob, isLoading, isError, refetch } = useEvidenciaFoto(envio.id, evidencia.tipo ? evidencia.subidaEn : null)
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
        <BlobImagen blob={blob} alt={altFoto(evidencia.recibidoPor)} className="size-full object-cover" />
      </button>
      <Dialog open={grande} onOpenChange={setGrande}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Guía {envio.numeroGuia} firmada</DialogTitle>
            <DialogDescription>
              {evidencia.recibidoPor ? `Recibió ${evidencia.recibidoPor}` : 'Sin nombre de quien recibió'}
            </DialogDescription>
          </DialogHeader>
          <BlobImagen blob={blob} alt={altFoto(evidencia.recibidoPor)} className="max-h-[75svh] w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Hueco de la miniatura cuando aún no hay foto (no se pide la imagen al servidor). */
function SinFoto() {
  return (
    <div
      className="flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground"
      data-testid="sin-foto"
    >
      <ImageOff className="size-5" />
      Sin foto
    </div>
  )
}

/**
 * Sección «Prueba de entrega» del detalle (contrato v19: por partes). Sin evidencia, un formulario con
 * nombre y/o foto; con evidencia, lo que hay («Sin nombre» / «Sin foto») y acciones separadas para
 * editar el nombre y subir o reemplazar la foto.
 */
export function PruebaEntrega({ envio, resaltar = false }: { envio: Envio; resaltar?: boolean }) {
  const [editando, setEditando] = useState<'nombre' | 'foto' | null>(null)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (resaltar) ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  }, [resaltar])

  if (envio.estado !== 'ENTREGADO' && !envio.evidencia) return null
  const evidencia = envio.evidencia

  if (!evidencia)
    return (
      <section ref={ref} className="space-y-2" aria-label="Prueba de entrega">
        <SectionLabel>Prueba de entrega</SectionLabel>
        <p className="text-sm text-muted-foreground">
          Agrega el nombre de quien recibió, la foto de la guía firmada o ambos. Puedes completarlo después.
        </p>
        <EvidenciaForm envioId={envio.id} enfocar={resaltar} />
      </section>
    )

  const tieneFoto = !!evidencia.tipo
  // El servidor solo acepta cambios mientras el envío siga ENTREGADO.
  const editable = envio.estado === 'ENTREGADO'

  return (
    <section ref={ref} className="space-y-2" aria-label="Prueba de entrega">
      <SectionLabel>Prueba de entrega</SectionLabel>
      <div className="flex gap-3 rounded-xl bg-muted/40 p-3" data-testid="evidencia">
        {tieneFoto ? <FotoEvidencia envio={envio} /> : <SinFoto />}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-xs text-muted-foreground">Recibió</p>
          {evidencia.recibidoPor ? (
            <p className="truncate text-sm font-medium">{evidencia.recibidoPor}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sin nombre</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDateTime(evidencia.subidaEn)}
            {evidencia.subidaPor && ` · ${evidencia.subidaPor}`}
          </p>
          {editable && !editando && (
            <div className="-ml-2 flex flex-wrap gap-x-1">
              <Button variant="ghost" size="sm" onClick={() => setEditando('nombre')}>
                <Pencil />
                {evidencia.recibidoPor ? 'Editar nombre' : 'Agregar nombre'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditando('foto')}>
                {tieneFoto ? <RefreshCw /> : <ImagePlus />}
                {tieneFoto ? 'Reemplazar foto' : 'Subir foto'}
              </Button>
            </div>
          )}
        </div>
      </div>
      {editando && (
        <EvidenciaForm
          key={editando}
          envioId={envio.id}
          campos={editando}
          recibidoPorInicial={evidencia.recibidoPor ?? ''}
          enfocar
          onListo={() => setEditando(null)}
          onCancelar={() => setEditando(null)}
        />
      )}
    </section>
  )
}
