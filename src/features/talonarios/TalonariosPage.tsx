import { ChevronRight, NotebookPen } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Paginacion } from '@/components/Paginacion'
import { Segmented } from '@/components/Segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useEsMovil } from '@/hooks/useMediaQuery'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { FiltroTalonarios, TalonarioResumen } from '@/types/api'
import { NuevoTalonarioDialog } from './components/NuevoTalonarioDialog'
import { UsoTalonario } from './components/UsoTalonario'
import { rangoTalonario } from './domain'
import { useTalonarios } from './hooks'

const FILTROS: { value: FiltroTalonarios; label: string }[] = [
  { value: 'abiertos', label: 'Abiertos' },
  { value: 'todos', label: 'Todos' },
]
const POR_PAGINA_DEFECTO = 20

const enteroPositivo = (valor: string | null, defecto: number) => {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : defecto
}

function Detalles({ t }: { t: TalonarioResumen }) {
  return (
    <>
      {formatDateTime(t.creadoEn)}
      {t.creadoPor && ` · ${t.creadoPor}`}
    </>
  )
}

/** Talonarios de guías en blanco (contrato v20): bloques de números reservados para llenar a mano en carretera. */
export function TalonariosPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const esMovil = useEsMovil()
  const estado: FiltroTalonarios = params.get('estado') === 'todos' ? 'todos' : 'abiertos'
  const pagina = enteroPositivo(params.get('pagina'), 1)
  const porPagina = enteroPositivo(params.get('porPagina'), POR_PAGINA_DEFECTO)
  const { data, isLoading, isPlaceholderData, error } = useTalonarios({ estado, pagina, porPagina })
  const talonarios = data?.datos ?? []

  const actualizar = (cambios: Record<string, string | null>) =>
    setParams(
      (p) => {
        for (const [k, v] of Object.entries(cambios)) {
          if (v === null) p.delete(k)
          else p.set(k, v)
        }
        return p
      },
      { replace: true },
    )

  return (
    <>
      <PageHeader
        title="Talonarios"
        description="Guías en blanco con número y QR para llenar a mano donde no hay impresora; se registran después."
        actions={<NuevoTalonarioDialog />}
      />

      <div className="flex items-center justify-between gap-3">
        <Segmented
          label="Filtrar talonarios"
          value={estado}
          onChange={(v) => actualizar({ estado: v === 'abiertos' ? null : v, pagina: null })}
          options={FILTROS}
        />
        {data && (
          <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {data.total} {data.total === 1 ? 'talonario' : 'talonarios'}
          </span>
        )}
      </div>

      {error ? (
        <p className="py-10 text-center text-sm text-destructive">{errorMessage(error)}</p>
      ) : isLoading ? (
        <div className="divide-y" aria-label="Cargando talonarios">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : talonarios.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-24 text-center">
          <NotebookPen className="mb-2 size-6 text-muted-foreground/60" strokeWidth={1.5} />
          <p className="text-sm font-medium">{estado === 'abiertos' ? 'No hay talonarios abiertos' : 'No hay talonarios'}</p>
          <p className="text-sm text-muted-foreground">
            {estado === 'abiertos' ? 'Todos sus números ya se usaron o anularon. ' : ''}
            Reserva uno con «Nuevo talonario» antes de salir a ruta.
          </p>
        </div>
      ) : esMovil ? (
        <ul className="-mx-4 divide-y border-y" aria-label="Lista de talonarios">
          {talonarios.map((t) => (
            <li key={t.id}>
              <Link to={`/talonarios/${t.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block truncate font-mono text-sm font-medium">{rangoTalonario(t)}</span>
                  {t.nota && <span className="block truncate text-sm">{t.nota}</span>}
                  <span className="block truncate text-xs text-muted-foreground">
                    <Detalles t={t} />
                  </span>
                  <UsoTalonario talonario={t} />
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-normal text-muted-foreground">Guías</TableHead>
                <TableHead className="text-xs font-normal text-muted-foreground">Nota</TableHead>
                <TableHead className="text-xs font-normal text-muted-foreground">Creado</TableHead>
                <TableHead className="w-56 text-xs font-normal text-muted-foreground">Uso</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {talonarios.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/talonarios/${t.id}`)}>
                  <TableCell className="py-3">
                    <Link
                      to={`/talonarios/${t.id}`}
                      className="font-mono font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rangoTalonario(t)}
                    </Link>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {t.cantidad} {t.cantidad === 1 ? 'guía' : 'guías'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-64 py-3">
                    <span className="block truncate">{t.nota ?? <span className="text-muted-foreground">—</span>}</span>
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground tabular-nums">
                    <span className="block">{formatDateTime(t.creadoEn)}</span>
                    {t.creadoPor && <span className="block text-xs">{t.creadoPor}</span>}
                  </TableCell>
                  <TableCell className="py-3">
                    <UsoTalonario talonario={t} />
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && data.total > 0 && (
        <Paginacion
          pagina={pagina}
          porPagina={porPagina}
          total={data.total}
          totalPaginas={data.totalPaginas}
          cargando={isPlaceholderData}
          onPagina={(p) => actualizar({ pagina: p > 1 ? String(p) : null })}
          onPorPagina={(n) => actualizar({ porPagina: n === POR_PAGINA_DEFECTO ? null : String(n), pagina: null })}
        />
      )}
    </>
  )
}
