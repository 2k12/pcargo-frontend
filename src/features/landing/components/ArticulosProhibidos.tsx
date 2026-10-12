import { Ban, CircleAlert, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CON_CONDICIONES, NOTAS_PROHIBIDOS, PROHIBIDOS, type ArticuloRestringido } from '../contenido'

function ListaArticulos({ articulos, tono, etiqueta }: { articulos: ArticuloRestringido[]; tono: 'prohibido' | 'condicion'; etiqueta: string }) {
  return (
    <ul aria-label={etiqueta} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {articulos.map((a) => (
        <li key={a.titulo} className="flex gap-3 rounded-2xl border bg-card p-4">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl',
              tono === 'prohibido' ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground',
            )}
          >
            <a.icon className="size-5" />
          </span>
          <div className="space-y-0.5">
            <p className="font-medium">{a.titulo}</p>
            <p className="text-sm text-muted-foreground">{a.detalle}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Contenido de la sección «Qué no transportamos»: prohibidos, aceptados con condiciones y avisos. */
export function ArticulosProhibidos() {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Ban aria-hidden="true" className="size-4 text-destructive" /> No transportamos
        </h3>
        <ListaArticulos articulos={PROHIBIDOS} tono="prohibido" etiqueta="Artículos prohibidos" />
      </div>
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <CircleAlert aria-hidden="true" className="size-4 text-brand-blue-text" /> Aceptamos con condiciones
        </h3>
        <ListaArticulos articulos={CON_CONDICIONES} tono="condicion" etiqueta="Artículos aceptados con condiciones" />
      </div>
      <ul className="space-y-2 rounded-2xl border bg-card p-4 text-sm sm:p-5">
        {NOTAS_PROHIBIDOS.map((n) => (
          <li key={n} className="flex gap-2">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-blue-text" />
            <span>{n}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
