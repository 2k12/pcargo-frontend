import { Ban, CircleAlert, Info } from 'lucide-react'
import { iconoArticulo } from '@/features/catalogo/iconos'
import { cn } from '@/lib/utils'
import type { ArticuloRestringido } from '@/types/api'
import { useArticulosPublicos } from '../api'
import { ARTICULOS_RESTRINGIDOS_BASE, articulosDe, textoNota } from '../contenido'

function ListaArticulos({ articulos, tono, etiqueta }: { articulos: ArticuloRestringido[]; tono: 'prohibido' | 'condicion'; etiqueta: string }) {
  return (
    <ul aria-label={etiqueta} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {articulos.map((a) => {
        const Icon = iconoArticulo(a.icono, tono === 'prohibido' ? 'prohibido' : 'alerta')
        return (
          <li key={a.id} className="flex min-w-0 gap-3 rounded-2xl border bg-card p-4">
            <span
              aria-hidden="true"
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                tono === 'prohibido' ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground',
              )}
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="font-medium break-words">{a.titulo}</p>
              {a.detalle && <p className="text-sm break-words text-muted-foreground">{a.detalle}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Presentación de «Qué no transportamos» a partir de una lista de artículos (solo se muestran los activos,
 * por categoría y orden). La usan la landing y la vista previa del panel.
 */
export function ArticulosRestringidosVista({ articulos }: { articulos: ArticuloRestringido[] }) {
  const prohibidos = articulosDe(articulos, 'PROHIBIDO')
  const condicionados = articulosDe(articulos, 'CONDICIONADO')
  const notas = articulosDe(articulos, 'NOTA')
  return (
    <div className="space-y-10">
      {prohibidos.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Ban aria-hidden="true" className="size-4 text-destructive" /> No transportamos
          </h3>
          <ListaArticulos articulos={prohibidos} tono="prohibido" etiqueta="Artículos prohibidos" />
        </div>
      )}
      {condicionados.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <CircleAlert aria-hidden="true" className="size-4 text-brand-blue-text" /> Aceptamos con condiciones
          </h3>
          <ListaArticulos articulos={condicionados} tono="condicion" etiqueta="Artículos aceptados con condiciones" />
        </div>
      )}
      {notas.length > 0 && (
        <ul aria-label="Avisos" className="space-y-2 rounded-2xl border bg-card p-4 text-sm sm:p-5">
          {notas.map((n) => (
            <li key={n.id} className="flex gap-2">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-blue-text" />
              <span className="min-w-0 break-words">{textoNota(n)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Sección «Qué no transportamos» de la landing (contrato v11): lee `GET /publico/articulos-restringidos`;
 * mientras carga o si falla, muestra la lista base para no dejar la sección vacía.
 */
export function ArticulosProhibidos() {
  const { data } = useArticulosPublicos()
  return <ArticulosRestringidosVista articulos={data ?? ARTICULOS_RESTRINGIDOS_BASE} />
}
