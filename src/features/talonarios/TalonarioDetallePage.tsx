import { ArrowLeft, ArrowUpRight, Ban, FilePlus2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { NuevoEnvioDialog } from '@/features/envios/components/NuevoEnvioDialog'
import { numeroGuiaImpreso } from '@/features/envios/guiaImprimible'
import { useEsMovil } from '@/hooks/useMediaQuery'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { GuiaTalonario, Talonario } from '@/types/api'
import { AnularGuiaDialog } from './components/AnularGuiaDialog'
import { ImprimirGuiasEnBlanco } from './components/ImprimirGuiasEnBlanco'
import { EstadoGuia, UsoTalonario } from './components/UsoTalonario'
import { guiaParaRegistrar, numerosDisponibles, rangoTalonario, type GuiaParaRegistrar } from './domain'
import { useTalonario } from './hooks'

function Volver() {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" nativeButton={false} render={<Link to="/talonarios" />}>
      <ArrowLeft />
      Talonarios
    </Button>
  )
}

/** Lo que se puede hacer con cada guía según su estado. */
function AccionesGuia({ g, onRegistrar, onAnular }: { g: GuiaTalonario; onRegistrar: () => void; onAnular: () => void }) {
  const n = numeroGuiaImpreso(g.numeroGuia)
  if (g.estado === 'DISPONIBLE') {
    return (
      <span className="flex items-center justify-end gap-1">
        <Button size="sm" variant="outline" onClick={onRegistrar} aria-label={`Registrar guía ${n}`}>
          <FilePlus2 />
          Registrar
        </Button>
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onAnular} aria-label={`Anular guía ${n}`}>
          <Ban />
          Anular
        </Button>
      </span>
    )
  }
  if (g.estado === 'USADA') {
    return (
      <Link
        to={`/envios?guia=${g.numeroGuia}`}
        className="inline-flex items-center gap-1 text-sm text-brand-blue-text hover:underline"
        aria-label={`Ver envío de la guía ${n}`}
      >
        Ver envío
        <ArrowUpRight className="size-3.5" />
      </Link>
    )
  }
  return null
}

function Detalle({ talonario }: { talonario: Talonario }) {
  const esMovil = useEsMovil()
  // Se conserva la última guía elegida para que el diálogo no cambie de título mientras se cierra.
  const [registrar, setRegistrar] = useState<GuiaParaRegistrar | null>(null)
  const [registroAbierto, setRegistroAbierto] = useState(false)
  const [anular, setAnular] = useState<number | null>(null)
  const disponibles = numerosDisponibles(talonario)
  const abrirRegistro = (g: GuiaTalonario) => {
    setRegistrar(guiaParaRegistrar(g.numeroGuia, talonario.creadoEn))
    setRegistroAbierto(true)
  }

  const detalleGuia = (g: GuiaTalonario) =>
    g.estado === 'ANULADA' ? (
      <span className="text-muted-foreground">{g.motivo ?? 'Sin motivo'}</span>
    ) : g.estado === 'USADA' && g.actualizadoEn ? (
      <span className="text-muted-foreground tabular-nums">Registrada el {formatDateTime(g.actualizadoEn)}</span>
    ) : null

  return (
    <>
      <div className="space-y-4">
        <Volver />
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 space-y-1">
            <h1 className="font-mono text-xl font-semibold tracking-tight sm:text-2xl">{rangoTalonario(talonario)}</h1>
            {talonario.nota && <p className="text-sm">{talonario.nota}</p>}
            <p className="text-sm text-muted-foreground">
              Creado el {formatDateTime(talonario.creadoEn)}
              {talonario.creadoPor && ` por ${talonario.creadoPor}`}
            </p>
          </div>
          <ImprimirGuiasEnBlanco
            numeros={disponibles}
            nota={talonario.nota}
            etiquetaImprimir={disponibles.length ? `Imprimir disponibles (${disponibles.length})` : 'Imprimir disponibles'}
          />
        </div>
        <UsoTalonario talonario={talonario} className="max-w-md" />
      </div>

      {esMovil ? (
        <ul className="-mx-4 divide-y border-y" aria-label="Guías del talonario">
          {talonario.guias.map((g) => (
            <li key={g.numeroGuia} className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono font-medium">{numeroGuiaImpreso(g.numeroGuia)}</span>
                <EstadoGuia estado={g.estado} />
              </div>
              {detalleGuia(g) && <p className="text-sm break-words">{detalleGuia(g)}</p>}
              {g.estado !== 'ANULADA' && (
                <div className="flex justify-end">
                  <AccionesGuia g={g} onRegistrar={() => abrirRegistro(g)} onAnular={() => setAnular(g.numeroGuia)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative overflow-x-auto">
          <Table aria-label="Guías del talonario">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-normal text-muted-foreground">Guía</TableHead>
                <TableHead className="text-xs font-normal text-muted-foreground">Estado</TableHead>
                <TableHead className="text-xs font-normal text-muted-foreground">Detalle</TableHead>
                <TableHead className="w-48" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {talonario.guias.map((g) => (
                <TableRow key={g.numeroGuia} className={g.estado === 'ANULADA' ? 'text-muted-foreground' : undefined}>
                  <TableCell className="py-2.5 font-mono font-medium">{numeroGuiaImpreso(g.numeroGuia)}</TableCell>
                  <TableCell className="py-2.5">
                    <EstadoGuia estado={g.estado} />
                  </TableCell>
                  <TableCell className="max-w-80 py-2.5 whitespace-normal">{detalleGuia(g)}</TableCell>
                  <TableCell className="py-2.5 text-right">
                    <AccionesGuia g={g} onRegistrar={() => abrirRegistro(g)} onAnular={() => setAnular(g.numeroGuia)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NuevoEnvioDialog
        abierto={registroAbierto}
        onAbiertoChange={setRegistroAbierto}
        guiaTalonario={registrar ?? undefined}
      />
      <AnularGuiaDialog talonarioId={talonario.id} numeroGuia={anular} onClose={() => setAnular(null)} />
    </>
  )
}

/** Detalle de un talonario: el estado de cada número y las acciones sobre las guías disponibles. */
export function TalonarioDetallePage() {
  const { id } = useParams()
  const { data, isLoading, error } = useTalonario(id)

  if (error) {
    return (
      <div className="space-y-4">
        <Volver />
        <p className="py-10 text-center text-sm text-destructive">{errorMessage(error)}</p>
      </div>
    )
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-4" aria-label="Cargando talonario">
        <Volver />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="divide-y">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  return <Detalle talonario={data} />
}
