import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowDownUp, ArrowUp, Download, GripVertical, Loader2, Plus, Printer, Send, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { enviosApi } from '@/features/envios/api'
import { FORMA_PAGO_LABEL } from '@/features/envios/domain'
import { normalizarGuia } from '@/features/envios/guia'
import { descargarPdf, imprimirPdf } from '@/features/envios/guiaPdf'
import { numeroGuiaImpreso, rutaGuia } from '@/features/envios/guiaImprimible'
import { errorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Envio } from '@/types/api'
import { reportesApi } from './api'
import { hoyEC, mover, NOMBRE_REPORTE_DEFECTO, valorTotal } from './domain'
import { compartirPdf, crearReportePdf, MENSAJE_ERROR_REPORTE } from './reportePdf'

type Accion = 'enviar' | 'descargar' | 'imprimir'

/** Agrega una guía de otro día por su número. */
function AgregarGuia({ onAgregar, yaIncluidas }: { onAgregar: (e: Envio) => void; yaIncluidas: Set<string> }) {
  const [numero, setNumero] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function agregar(ev: FormEvent) {
    ev.preventDefault()
    const n = normalizarGuia(numero)
    if (!n) return setError('Escribe un número de guía válido')
    setBuscando(true)
    setError(null)
    try {
      const envio = await enviosApi.porGuia(n)
      if (!envio) setError(`No existe la guía ${numeroGuiaImpreso(Number(n))}`)
      else if (yaIncluidas.has(envio.id)) setError('Esa guía ya está en el reporte')
      else if (envio.estado === 'CANCELADO') setError('Esa guía está cancelada')
      else {
        onAgregar(envio)
        setNumero('')
      }
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBuscando(false)
    }
  }

  return (
    <form onSubmit={agregar} className="space-y-1">
      <div className="flex gap-2">
        <Input
          aria-label="Número de guía para agregar"
          placeholder="Agregar guía por número"
          inputMode="numeric"
          className="min-w-0 flex-1 sm:w-56 sm:flex-none"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />
        <Button type="submit" variant="outline" disabled={buscando}>
          {buscando ? <Loader2 className="animate-spin" /> : <Plus />}
          Agregar
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}

/**
 * Reporte diario: carga las guías registradas el día elegido, permite ordenarlas (arrastrando o con
 * las flechas), quitar o agregar guías, y enviar el PDF con el total de guías y la suma de sus valores.
 */
export function ReportesPage() {
  const [nombre, setNombre] = useState(NOMBRE_REPORTE_DEFECTO)
  const [fecha, setFecha] = useState(() => hoyEC())
  const [lista, setLista] = useState<Envio[]>([])
  const [cargadas, setCargadas] = useState<Envio[] | null>(null)
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  const [generando, setGenerando] = useState<Accion | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['reportes', 'guias', fecha],
    queryFn: () => reportesApi.guiasDelDia(fecha),
    enabled: !!fecha,
    // El orden elegido no debe perderse porque la consulta se refresque sola.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  // Al llegar las guías de otro día, la lista vuelve a empezar (en orden de número).
  if (data && data !== cargadas) {
    setCargadas(data)
    setLista(data)
  }

  const total = valorTotal(lista)
  const ids = new Set(lista.map((e) => e.id))

  async function generar(accion: Accion) {
    setGenerando(accion)
    try {
      const pdf = await crearReportePdf(nombre, fecha, lista)
      if (accion === 'imprimir') imprimirPdf(pdf)
      else if (accion === 'descargar') descargarPdf(pdf)
      else if ((await compartirPdf(pdf)) === 'descargado') {
        toast.info('Este navegador no permite compartir archivos: se descargó el PDF para que lo envíes.')
      }
    } catch {
      toast.error(MENSAJE_ERROR_REPORTE)
    } finally {
      setGenerando(null)
    }
  }

  const icono = (accion: Accion, Icono: typeof Send) => (generando === accion ? <Loader2 className="animate-spin" /> : <Icono />)

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" description="Arma el reporte diario: elige las guías, ordénalas como quieras y envíalo." />

      <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]" aria-label="Datos del reporte">
        <div className="space-y-1.5">
          <Label htmlFor="reporte-nombre">Nombre del reporte</Label>
          <Input id="reporte-nombre" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reporte-fecha">Guías del día</Label>
          <Input id="reporte-fecha" type="date" value={fecha} max={hoyEC()} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </div>
      </section>

      <section className="space-y-3" aria-label="Guías del reporte">
        <SectionLabel
          as="h2"
          aside={
            lista.length > 1 ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-muted-foreground"
                onClick={() => setLista([...lista].sort((a, b) => a.numeroGuia - b.numeroGuia))}
              >
                <ArrowDownUp />
                Ordenar por número
              </Button>
            ) : undefined
          }
        >
          Guías ({lista.length})
        </SectionLabel>

        <AgregarGuia yaIncluidas={ids} onAgregar={(e) => setLista((l) => [...l, e])} />

        {error ? (
          <p className="py-6 text-sm text-destructive">{errorMessage(error)}</p>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <p className="rounded-xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
            No hay guías registradas ese día. Puedes agregarlas por su número.
          </p>
        ) : (
          <ol className="divide-y rounded-xl border" aria-label="Orden de las guías">
            {lista.map((e, i) => (
              <li
                key={e.id}
                draggable
                onDragStart={(ev) => {
                  ev.dataTransfer.effectAllowed = 'move'
                  setArrastrando(i)
                }}
                onDragOver={(ev) => {
                  ev.preventDefault()
                  if (arrastrando !== null && arrastrando !== i) {
                    setLista((l) => mover(l, arrastrando, i))
                    setArrastrando(i)
                  }
                }}
                onDragEnd={() => setArrastrando(null)}
                className={cn('flex items-center gap-2 px-2 py-2 sm:px-3', arrastrando === i && 'bg-muted')}
              >
                <GripVertical className="hidden size-4 shrink-0 cursor-grab text-muted-foreground sm:block" aria-hidden />
                <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium tabular-nums">
                    {numeroGuiaImpreso(e.numeroGuia)}
                    <span className="ml-2 font-normal text-muted-foreground">{rutaGuia(e.ruta)}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.destinatario.nombre} · {FORMA_PAGO_LABEL[e.formaPago]}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">{formatCurrency(e.costo)}</span>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Subir la guía ${numeroGuiaImpreso(e.numeroGuia)}`}
                    disabled={i === 0}
                    onClick={() => setLista((l) => mover(l, i, i - 1))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Bajar la guía ${numeroGuiaImpreso(e.numeroGuia)}`}
                    disabled={i === lista.length - 1}
                    onClick={() => setLista((l) => mover(l, i, i + 1))}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar la guía ${numeroGuiaImpreso(e.numeroGuia)}`}
                    onClick={() => setLista((l) => l.filter((x) => x.id !== e.id))}
                  >
                    <X />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-4 rounded-xl bg-muted/40 p-4" aria-label="Totales">
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-muted-foreground">Total de guías</dt>
            <dd className="text-xl font-semibold tabular-nums">{lista.length}</dd>
          </div>
          <div className="text-right">
            <dt className="text-xs text-muted-foreground">Valor total</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatCurrency(total)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button className="flex-1 sm:flex-none" disabled={lista.length === 0 || !!generando} onClick={() => generar('enviar')}>
            {icono('enviar', Send)}
            Enviar reporte
          </Button>
          <Button variant="outline" disabled={lista.length === 0 || !!generando} onClick={() => generar('descargar')}>
            {icono('descargar', Download)}
            Descargar PDF
          </Button>
          <Button variant="outline" disabled={lista.length === 0 || !!generando} onClick={() => generar('imprimir')}>
            {icono('imprimir', Printer)}
            Imprimir
          </Button>
        </div>
      </section>
    </div>
  )
}
