import { FileCheck2 } from 'lucide-react'
import { useState } from 'react'
import { Paginacion } from '@/components/Paginacion'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { CANAL_LABEL, resumenSolicitud } from '../domain'
import { useSolicitudesDatos } from '../hooks'

/** Constancia de las solicitudes atendidas (sin el teléfono completo: solo los 4 últimos dígitos). */
export function RegistroSolicitudes() {
  const [pagina, setPagina] = useState(1)
  const { data, isLoading, isPlaceholderData, error } = useSolicitudesDatos(pagina)

  if (error) return <p className="text-sm text-destructive">{errorMessage(error)}</p>
  if (isLoading) return <Skeleton className="h-24 rounded-xl" />
  if (!data || data.total === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-10 text-center">
        <FileCheck2 className="mb-1 size-6 text-muted-foreground/60" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">Aún no se ha atendido ninguna solicitud.</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <ul className="divide-y border-y" aria-label="Solicitudes atendidas">
        {data.datos.map((s) => (
          <li key={s.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {s.nombreTitular} <span className="font-mono text-xs font-normal text-muted-foreground">{s.telefonoFinal}</span>
              </p>
              <p className="text-xs text-muted-foreground">{resumenSolicitud(s.resultado).join(' · ')}</p>
              {s.nota && <p className="text-xs text-muted-foreground italic">{s.nota}</p>}
            </div>
            <p className="shrink-0 text-xs text-muted-foreground sm:text-right">
              <span className="block tabular-nums">{formatDateTime(s.fecha)}</span>
              <span className="block">
                {CANAL_LABEL[s.canal]} · {s.atendidaPor}
              </span>
            </p>
          </li>
        ))}
      </ul>
      <Paginacion
        pagina={data.pagina}
        porPagina={data.porPagina}
        total={data.total}
        totalPaginas={data.totalPaginas}
        onPagina={setPagina}
        cargando={isPlaceholderData}
      />
    </div>
  )
}
