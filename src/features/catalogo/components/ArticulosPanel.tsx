import { Eye, Info, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Confirmar } from '@/features/integraciones/components/Confirmar'
import { ArticulosRestringidosVista } from '@/features/landing/components/ArticulosProhibidos'
import { errorMessage } from '@/lib/api'
import { SUPERFICIE } from '@/lib/estilos'
import { cn } from '@/lib/utils'
import type { ArticuloRestringido, CategoriaArticulo } from '@/types/api'
import { CATEGORIA_ARTICULO, CATEGORIAS_ARTICULO, mover } from '../domain'
import { useActualizarArticulo, useArticulosAdmin, useEliminarArticulo, useOrdenarArticulos } from '../hooks'
import { iconoArticulo } from '../iconos'
import { ArticuloFormDialog } from './ArticuloFormDialog'
import { BotonesOrden } from './BotonesOrden'

function Grupo({
  categoria,
  articulos,
  onAgregar,
  onEditar,
  onEliminar,
  onActivo,
  onMover,
}: {
  categoria: CategoriaArticulo
  articulos: ArticuloRestringido[]
  onAgregar: () => void
  onEditar: (a: ArticuloRestringido) => void
  onEliminar: (a: ArticuloRestringido) => void
  onActivo: (a: ArticuloRestringido, activo: boolean) => void
  onMover: (i: number, delta: -1 | 1) => void
}) {
  const info = CATEGORIA_ARTICULO[categoria]
  const idTitulo = `grupo-${categoria.toLowerCase()}`
  return (
    <section className="space-y-2" aria-labelledby={idTitulo}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <SectionLabel as="h2" aside={`${articulos.length}`}>
            <span id={idTitulo}>{info.titulo}</span>
          </SectionLabel>
          <p className="text-xs text-muted-foreground">{info.descripcion}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onAgregar} aria-label={`Agregar a ${info.titulo}`}>
          <Plus />
          Agregar
        </Button>
      </div>
      {articulos.length === 0 ? (
        <p className={cn(SUPERFICIE, 'p-4 text-sm text-muted-foreground')}>Sin elementos en este grupo.</p>
      ) : (
        <ul className="space-y-2" aria-label={info.titulo}>
          {articulos.map((a, i) => {
            const Icon = categoria === 'NOTA' ? Info : iconoArticulo(a.icono, categoria === 'PROHIBIDO' ? 'prohibido' : 'alerta')
            return (
              <li key={a.id} className={cn(SUPERFICIE, 'flex items-start gap-2 p-3')} aria-label={a.titulo}>
                <BotonesOrden nombre={a.titulo} indice={i} total={articulos.length} onMover={(d) => onMover(i, d)} />
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg',
                    categoria === 'PROHIBIDO' ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground',
                    !a.activo && 'opacity-50',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className={cn('font-medium break-words', !a.activo && 'text-muted-foreground')}>
                    {a.titulo} {!a.activo && <Badge variant="outline">Oculto</Badge>}
                  </p>
                  {a.detalle && <p className="text-sm break-words text-muted-foreground">{a.detalle}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 pt-1">
                  <Switch
                    checked={a.activo}
                    aria-label={`${a.activo ? 'Ocultar' : 'Publicar'} ${a.titulo}`}
                    onCheckedChange={(v) => onActivo(a, v)}
                    className="mr-1"
                  />
                  <Button variant="ghost" size="icon-sm" aria-label={`Editar ${a.titulo}`} onClick={() => onEditar(a)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${a.titulo}`} onClick={() => onEliminar(a)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** Pestaña «Qué no transportamos»: prohibidos, con condiciones y notas, con vista previa de la landing (contrato v11). */
export function ArticulosPanel() {
  const { data: articulos, isLoading, error } = useArticulosAdmin()
  const actualizar = useActualizarArticulo()
  const eliminar = useEliminarArticulo()
  const ordenar = useOrdenarArticulos()
  const [formulario, setFormulario] = useState<{ abierto: boolean; articulo: ArticuloRestringido | null; categoria: CategoriaArticulo }>({
    abierto: false,
    articulo: null,
    categoria: 'PROHIBIDO',
  })
  const [borrando, setBorrando] = useState<ArticuloRestringido | null>(null)
  const [anuncio, setAnuncio] = useState('')

  const delGrupo = (c: CategoriaArticulo) => (articulos ?? []).filter((a) => a.categoria === c).sort((a, b) => a.orden - b.orden)

  const cambiarActivo = (a: ArticuloRestringido, activo: boolean) =>
    actualizar.mutate(
      { id: a.id, cambios: { activo } },
      {
        onSuccess: () => toast.success(activo ? `«${a.titulo}» publicado` : `«${a.titulo}» oculto`),
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  const moverEn = (categoria: CategoriaArticulo, i: number, delta: -1 | 1) => {
    const lista = delGrupo(categoria)
    const nueva = mover(lista, i, delta)
    if (nueva === lista) return
    setAnuncio(`${lista[i]!.titulo}: posición ${i + delta + 1} de ${lista.length}`)
    ordenar.mutate({ categoria, ids: nueva.map((a) => a.id) }, { onError: (e) => toast.error(errorMessage(e)) })
  }

  const confirmarBorrado = () => {
    const a = borrando
    if (!a) return
    eliminar.mutate(a.id, {
      onSuccess: () => {
        toast.success(`«${a.titulo}» eliminado`)
        setBorrando(null)
      },
      onError: (e) => toast.error(errorMessage(e)),
    })
  }

  if (error) {
    return (
      <Card>
        <p className="px-4 text-sm text-destructive">{errorMessage(error)}</p>
      </Card>
    )
  }
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>
      {CATEGORIAS_ARTICULO.map((c) => (
        <Grupo
          key={c}
          categoria={c}
          articulos={delGrupo(c)}
          onAgregar={() => setFormulario({ abierto: true, articulo: null, categoria: c })}
          onEditar={(a) => setFormulario({ abierto: true, articulo: a, categoria: a.categoria })}
          onEliminar={setBorrando}
          onActivo={cambiarActivo}
          onMover={(i, d) => moverEn(c, i, d)}
        />
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye aria-hidden="true" className="size-4 text-muted-foreground" />
            Vista previa en la página principal
          </CardTitle>
          <CardDescription>Así se ve la sección «Qué no transportamos» con los elementos publicados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl bg-background p-4 ring-1 ring-foreground/10 sm:p-6" data-testid="vista-previa-articulos">
            {(articulos ?? []).some((a) => a.activo) ? (
              <ArticulosRestringidosVista articulos={articulos ?? []} />
            ) : (
              <p className="text-sm text-muted-foreground">No hay elementos publicados: la sección se verá vacía.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <ArticuloFormDialog
        open={formulario.abierto}
        articulo={formulario.articulo}
        categoria={formulario.categoria}
        onOpenChange={(abierto) => setFormulario((f) => ({ ...f, abierto }))}
      />
      <Confirmar
        abierto={!!borrando}
        onCancelar={() => setBorrando(null)}
        onConfirmar={confirmarBorrado}
        titulo={`¿Eliminar «${borrando?.titulo ?? ''}»?`}
        descripcion="Dejará de mostrarse en la página principal. Si solo quieres ocultarlo por un tiempo, desactívalo."
        accion="Eliminar"
        pendiente={eliminar.isPending}
      />
    </div>
  )
}
