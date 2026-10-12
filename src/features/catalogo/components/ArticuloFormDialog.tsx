import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ArticuloRestringido, CategoriaArticulo, DatosArticulo, IconoArticulo } from '@/types/api'
import { articuloSchema, CATEGORIA_ARTICULO, CATEGORIAS_ARTICULO, ICONO_POR_DEFECTO, MAX_DETALLE, type ArticuloForm } from '../domain'
import { useActualizarArticulo, useCrearArticulo } from '../hooks'
import { IconoPicker } from './IconoPicker'

const CATEGORIA_ITEMS = Object.fromEntries(CATEGORIAS_ARTICULO.map((c) => [c, CATEGORIA_ARTICULO[c].titulo])) as Record<string, string>

function valoresIniciales(articulo: ArticuloRestringido | null | undefined, categoria: CategoriaArticulo): ArticuloForm {
  if (articulo) {
    return { categoria: articulo.categoria, titulo: articulo.titulo, detalle: articulo.detalle, icono: articulo.icono, activo: articulo.activo }
  }
  return { categoria, titulo: '', detalle: '', icono: ICONO_POR_DEFECTO[categoria], activo: true }
}

/** Alta o edición de un artículo de «Qué no transportamos» (contrato v11). */
export function ArticuloFormDialog({
  open,
  onOpenChange,
  articulo,
  categoria,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  articulo?: ArticuloRestringido | null
  /** Categoría propuesta al crear (el grupo desde el que se abrió). */
  categoria: CategoriaArticulo
}) {
  const crear = useCrearArticulo()
  const actualizar = useActualizarArticulo()
  const pendiente = crear.isPending || actualizar.isPending
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ArticuloForm>({ resolver: zodResolver(articuloSchema), defaultValues: valoresIniciales(null, categoria) })

  useEffect(() => {
    if (open) reset(valoresIniciales(articulo, categoria))
  }, [open, articulo, categoria, reset])

  const cat = useWatch({ control, name: 'categoria' })
  const detalle = useWatch({ control, name: 'detalle' }) ?? ''
  const esNota = cat === 'NOTA'

  const onSubmit = async (v: ArticuloForm) => {
    const datos: DatosArticulo = {
      categoria: v.categoria,
      titulo: v.titulo.trim(),
      detalle: v.detalle.trim(),
      icono: v.categoria === 'NOTA' ? null : (v.icono as IconoArticulo),
      activo: v.activo,
    }
    try {
      if (articulo) {
        await actualizar.mutateAsync({ id: articulo.id, cambios: datos })
        toast.success('Artículo actualizado')
      } else {
        await crear.mutateAsync(datos)
        toast.success(`${CATEGORIA_ARTICULO[v.categoria].singular.replace(/^./, (c) => c.toUpperCase())} agregado`)
      }
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{articulo ? 'Editar artículo' : `Nuevo: ${CATEGORIA_ARTICULO[categoria].singular}`}</DialogTitle>
          <DialogDescription>Se publica en la sección «Qué no transportamos» de la página principal.</DialogDescription>
        </DialogHeader>
        <form id="articulo-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label id="art-categoria-label">Grupo</Label>
            <Controller
              control={control}
              name="categoria"
              render={({ field }) => (
                <Select
                  items={CATEGORIA_ITEMS}
                  value={field.value}
                  onValueChange={(v) => {
                    if (!v) return
                    const nueva = v as CategoriaArticulo
                    field.onChange(nueva)
                    // Al pasar de NOTA a un grupo con icono, se propone uno por defecto.
                    if (nueva !== 'NOTA' && !getValues('icono')) setValue('icono', ICONO_POR_DEFECTO[nueva])
                  }}
                >
                  <SelectTrigger className="w-full" aria-labelledby="art-categoria-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_ARTICULO.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORIA_ARTICULO[c].titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="art-titulo">{esNota ? 'Texto de la nota' : 'Título'}</Label>
            <Input
              id="art-titulo"
              autoComplete="off"
              maxLength={80}
              aria-invalid={!!errors.titulo}
              aria-describedby={errors.titulo ? 'art-titulo-error' : undefined}
              {...register('titulo')}
            />
            {errors.titulo && (
              <p id="art-titulo-error" className="text-xs text-destructive">
                {errors.titulo.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="art-detalle">Detalle (opcional)</Label>
            <Textarea
              id="art-detalle"
              rows={3}
              maxLength={MAX_DETALLE}
              aria-invalid={!!errors.detalle}
              aria-describedby="art-detalle-contador"
              {...register('detalle')}
            />
            <p
              id="art-detalle-contador"
              className={cn('text-right text-xs tabular-nums', detalle.length >= MAX_DETALLE ? 'text-destructive' : 'text-muted-foreground')}
              aria-live="polite"
            >
              {detalle.length}/{MAX_DETALLE}
            </p>
            {errors.detalle && <p className="text-xs text-destructive">{errors.detalle.message}</p>}
          </div>

          {!esNota && (
            <div className="space-y-1.5">
              <Label id="art-icono-label">Icono</Label>
              <Controller
                control={control}
                name="icono"
                render={({ field }) => (
                  <IconoPicker
                    value={(field.value as IconoArticulo | null) ?? null}
                    onChange={field.onChange}
                    labelledBy="art-icono-label"
                    invalido={!!errors.icono}
                  />
                )}
              />
              {errors.icono && <p className="text-xs text-destructive">{errors.icono.message}</p>}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-foreground/10">
            <div className="space-y-0.5">
              <Label htmlFor="art-activo">Publicado</Label>
              <p className="text-xs text-muted-foreground">Inactivo, no aparece en la página principal.</p>
            </div>
            <Controller
              control={control}
              name="activo"
              render={({ field }) => <Switch id="art-activo" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="articulo-form" disabled={pendiente}>
            {pendiente ? <Loader2 className="animate-spin" /> : !articulo && <Plus />}
            {articulo ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
