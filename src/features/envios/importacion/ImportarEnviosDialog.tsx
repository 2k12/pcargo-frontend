import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  PackagePlus,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/hooks'
import { useCiudades, useRutas } from '@/features/rutas/hooks'
import { errorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Envio } from '@/types/api'
import { enviosApi } from '../api'
import { FORMA_PAGO_LABEL, FORMAS_PAGO, ZONA_LABEL, ZONAS } from '../domain'
import { crearGuiasPdf, generarGuias, GUIAS_POR_HOJA, MENSAJE_ERROR_GUIA } from '../guiaPdf'
import { enviosKeys, useTiposCarga } from '../hooks'
import { descargarPlantilla, ErrorPlantilla, leerExcel } from './excel'
import {
  agregarCargaAlEnvio,
  COLUMNAS,
  envioBorrador,
  filaVacia,
  validarImportacion,
  type ClaveColumna,
  type EnvioImportado,
  type FilaImportacion,
  type ValoresFila,
} from './importacion'

type Fase = 'archivo' | 'revision' | 'importando' | 'resultado'
type Vista = 'datos' | 'guias'

/** Listas de sugerencias (datalist) por columna: se puede escribir o elegir. */
const LISTA: Partial<Record<ClaveColumna, string>> = {
  origen: 'imp-ciudades',
  destino: 'imp-ciudades',
  tipoCarga: 'imp-tipos',
  formaPago: 'imp-pagos',
  zona: 'imp-zonas',
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/**
 * Importa envíos desde un Excel: carga el archivo, muestra una vista previa editable (con los errores en
 * cada celda y la vista de las guías tal como se imprimirán) y crea los envíos válidos uno por uno.
 */
export function ImportarEnviosDialog() {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setAbierto(true)}>
        <FileSpreadsheet />
        <span className="hidden sm:inline">Importar</span>
        <span className="sr-only sm:hidden">Importar envíos desde Excel</span>
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        {abierto && <Importador onCerrar={() => setAbierto(false)} />}
      </Dialog>
    </>
  )
}

function Importador({ onCerrar }: { onCerrar: () => void }) {
  const qc = useQueryClient()
  const { usuario } = useAuth()
  const { data: tipos = [] } = useTiposCarga()
  const { data: rutas = [] } = useRutas()
  const { data: ciudades = [] } = useCiudades(true)

  const [fase, setFase] = useState<Fase>('archivo')
  const [vista, setVista] = useState<Vista>('datos')
  const [filas, setFilas] = useState<FilaImportacion[]>([])
  const [archivo, setArchivo] = useState('')
  const [leyendo, setLeyendo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const [soloErrores, setSoloErrores] = useState(false)
  const [guiaEnfocada, setGuiaEnfocada] = useState<string | null>(null)
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0 })
  const [creados, setCreados] = useState<Envio[]>([])
  /** Errores del servidor por envío (clave del grupo), p. ej. un N.º de guía ya usado. */
  const [fallos, setFallos] = useState<Map<string, string>>(new Map())

  const resultado = useMemo(() => validarImportacion(filas, { tipos, rutas }), [filas, tipos, rutas])
  const envioDeFila = useMemo(() => {
    const m = new Map<string, EnvioImportado>()
    for (const e of resultado.envios) for (const id of e.filas) m.set(id, e)
    return m
  }, [resultado])
  const totalValido = resultado.validos.reduce((s, e) => s + e.costo, 0)

  const cargar = async (file: File) => {
    setLeyendo(true)
    setErrorArchivo(null)
    try {
      const leidas = await leerExcel(file)
      setFilas(leidas)
      setArchivo(file.name)
      setFallos(new Map())
      setSoloErrores(false)
      setVista('datos')
      setFase('revision')
    } catch (e) {
      setErrorArchivo(e instanceof ErrorPlantilla ? e.message : 'No se pudo leer el archivo.')
    } finally {
      setLeyendo(false)
    }
  }

  const editar = (id: string, clave: ClaveColumna, valor: string) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, valores: { ...f.valores, [clave]: valor } } : f)))
  const eliminar = (id: string) => setFilas((prev) => prev.filter((f) => f.id !== id))
  const agregar = () => setFilas((prev) => [...prev, filaVacia(`n${Date.now()}`)])
  const agregarCarga = (id: string) => setFilas((prev) => agregarCargaAlEnvio(prev, id, `n${Date.now()}`))

  const importar = async () => {
    const lote = resultado.validos
    setFase('importando')
    setProgreso({ hechos: 0, total: lote.length })
    const ok: Envio[] = []
    const errores = new Map<string, string>()
    const creadas = new Set<string>()
    for (const [i, e] of lote.entries()) {
      try {
        ok.push(await enviosApi.crear(e.solicitud!))
        e.filas.forEach((id) => creadas.add(id))
      } catch (err) {
        errores.set(e.clave, errorMessage(err))
      }
      setProgreso({ hechos: i + 1, total: lote.length })
    }
    qc.invalidateQueries({ queryKey: enviosKeys.all })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    // Lo creado sale de la tabla; queda lo que falló o tenía errores, para corregirlo y reintentar.
    setFilas((prev) => prev.filter((f) => !creadas.has(f.id)))
    setCreados((prev) => [...prev, ...ok])
    setFallos(errores)
    setFase('resultado')
  }

  const pendientes = filas.length

  return (
    <DialogContent
      showCloseButton={fase !== 'importando'}
      className="flex h-[min(92dvh,900px)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1400px,96vw)]"
    >
      <datalist id="imp-ciudades">
        {ciudades.map((c) => (
          <option key={c.id} value={c.nombre} />
        ))}
      </datalist>
      <datalist id="imp-tipos">
        {tipos.map((t) => (
          <option key={t.codigo} value={t.nombre} />
        ))}
      </datalist>
      <datalist id="imp-pagos">
        {FORMAS_PAGO.map((f) => (
          <option key={f} value={FORMA_PAGO_LABEL[f]} />
        ))}
      </datalist>
      <datalist id="imp-zonas">
        {ZONAS.map((z) => (
          <option key={z} value={ZONA_LABEL[z]} />
        ))}
      </datalist>

      {/* Encabezado: título, archivo y, en la revisión, el cambio entre datos y guías. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-4 pr-12">
        <div className="mr-auto min-w-0">
          <DialogTitle className="text-base font-semibold">Importar envíos</DialogTitle>
          <DialogDescription className="truncate text-xs">
            {fase === 'archivo'
              ? 'Desde un Excel con el formato de la plantilla'
              : `${archivo} · ${plural(filas.length, 'fila', 'filas')} · ${plural(resultado.envios.length, 'guía', 'guías')}`}
          </DialogDescription>
        </div>
        {fase === 'revision' && (
          <div role="tablist" aria-label="Vista" className="flex rounded-lg bg-muted p-0.5 text-sm">
            {(['datos', 'guias'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={vista === v}
                onClick={() => {
                  setVista(v)
                  if (v === 'guias') setGuiaEnfocada(null)
                }}
                className={cn(
                  'rounded-md px-3 py-1 transition-colors',
                  vista === v ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v === 'datos' ? 'Datos' : 'Guías'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {fase === 'archivo' && (
          <SeleccionArchivo
            leyendo={leyendo}
            error={errorArchivo}
            onArchivo={cargar}
            onPlantilla={() =>
              descargarPlantilla(tipos, ciudades).catch(() => toast.error('No se pudo generar la plantilla. Intenta de nuevo.'))
            }
          />
        )}

        {fase === 'revision' && vista === 'datos' && (
          <TablaEditable
            filas={soloErrores ? filas.filter((f) => Object.keys(resultado.errores.get(f.id) ?? {}).length > 0 || fallos.has(envioDeFila.get(f.id)?.clave ?? '')) : filas}
            errores={resultado.errores}
            heredados={resultado.heredados}
            envioDeFila={envioDeFila}
            fallos={fallos}
            onEditar={editar}
            onEliminar={eliminar}
            onAgregar={agregar}
            onAgregarCarga={agregarCarga}
            onVerGuia={(clave) => {
              setGuiaEnfocada(clave)
              setVista('guias')
            }}
          />
        )}

        {fase === 'revision' && vista === 'guias' && (
          <VistaGuias
            envios={(guiaEnfocada ? resultado.envios.filter((e) => e.clave === guiaEnfocada) : resultado.validos)
              .map((e) => envioBorrador(e, tipos, usuario?.nombre ?? null))
              .filter((e): e is Envio => !!e)}
            enfocada={!!guiaEnfocada}
            onVerTodas={() => setGuiaEnfocada(null)}
          />
        )}

        {fase === 'importando' && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6" role="status" aria-live="polite">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm">
              Creando guía {Math.min(progreso.hechos + 1, progreso.total)} de {progreso.total}…
            </p>
            <div className="h-1 w-64 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${(progreso.hechos / Math.max(progreso.total, 1)) * 100}%` }} />
            </div>
          </div>
        )}

        {fase === 'resultado' && (
          <Resultado
            creados={creados}
            fallos={fallos.size}
            pendientes={pendientes}
            onRevisar={() => {
              setSoloErrores(fallos.size > 0)
              setVista('datos')
              setFase('revision')
            }}
          />
        )}
      </div>

      {/* Pie: resumen y acción principal (región común de las acciones de la importación). */}
      {fase === 'revision' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-5 py-3">
          <div className="mr-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="font-medium tabular-nums">{plural(resultado.validos.length, 'guía lista', 'guías listas')}</span>
              <span className="text-muted-foreground"> · {formatCurrency(totalValido)}</span>
            </span>
            {resultado.filasConError > 0 && (
              <button
                type="button"
                aria-pressed={soloErrores}
                onClick={() => setSoloErrores((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-destructive transition-colors hover:bg-destructive/10',
                  soloErrores && 'bg-destructive/10',
                )}
              >
                <AlertCircle className="size-3.5" />
                {plural(resultado.filasConError, 'fila con errores', 'filas con errores')}
                <span className="text-xs text-muted-foreground">{soloErrores ? '· ver todas' : '· ver solo estas'}</span>
              </button>
            )}
          </div>
          <Button variant="ghost" onClick={() => setFase('archivo')}>
            <ArrowLeft />
            Otro archivo
          </Button>
          <Button disabled={resultado.validos.length === 0} onClick={importar}>
            <Upload />
            {resultado.filasConError > 0 && resultado.validos.length > 0
              ? `Importar ${plural(resultado.validos.length, 'guía válida', 'guías válidas')}`
              : `Importar ${plural(resultado.validos.length, 'guía', 'guías')}`}
          </Button>
        </div>
      )}
      {fase === 'resultado' && (
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          {creados.length > 0 && (
            <Button
              variant="outline"
              onClick={() => generarGuias(creados, 'imprimir').catch(() => toast.error(MENSAJE_ERROR_GUIA))}
            >
              <Printer />
              Imprimir {plural(creados.length, 'guía', 'guías')}
            </Button>
          )}
          <Button onClick={onCerrar}>Listo</Button>
        </div>
      )}
    </DialogContent>
  )
}

function SeleccionArchivo({
  leyendo,
  error,
  onArchivo,
  onPlantilla,
}: {
  leyendo: boolean
  error: string | null
  onArchivo: (f: File) => void
  onPlantilla: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [encima, setEncima] = useState(false)
  const soltar = (e: DragEvent) => {
    e.preventDefault()
    setEncima(false)
    const f = e.dataTransfer.files[0]
    if (f) onArchivo(f)
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 overflow-y-auto p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setEncima(true)
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={soltar}
        className={cn(
          'flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center transition-colors',
          encima ? 'border-primary bg-primary/5' : 'border-foreground/15',
        )}
      >
        {leyendo ? (
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
        ) : (
          <FileSpreadsheet className="size-7 text-muted-foreground" strokeWidth={1.5} />
        )}
        <p className="text-sm font-medium">{leyendo ? 'Leyendo el archivo…' : 'Arrastra tu Excel aquí'}</p>
        <Button variant="outline" size="sm" disabled={leyendo} onClick={() => input.current?.click()}>
          Elegir archivo
        </Button>
        <input
          ref={input}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          aria-label="Archivo de Excel"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onArchivo(f)
            e.target.value = ''
          }}
        />
        {error && (
          <p role="alert" className="flex items-start gap-1.5 text-left text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
      </div>

      <div className="w-full max-w-xl space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium">Formato</p>
          <Button variant="link" size="sm" className="h-auto px-0" onClick={onPlantilla}>
            <Download />
            Descargar plantilla
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Una fila por tipo de carga. Para mandar varios tipos juntos (p. ej. 2 cartones y 1 paquete al mismo destinatario), pon el
          mismo número en «Envío»: en las filas adicionales basta el tipo, la cantidad y el peso. Las columnas con * son obligatorias.
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Columnas de la plantilla">
          {COLUMNAS.map((c) => (
            <li
              key={c.clave}
              title={c.ayuda}
              className={cn('rounded-md px-2 py-0.5 text-xs', c.requerida ? 'bg-muted font-medium' : 'text-muted-foreground ring-1 ring-foreground/10')}
            >
              {c.titulo}
              {c.requerida && ' *'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function TablaEditable({
  filas,
  errores,
  heredados,
  envioDeFila,
  fallos,
  onEditar,
  onEliminar,
  onAgregar,
  onAgregarCarga,
  onVerGuia,
}: {
  filas: FilaImportacion[]
  errores: Map<string, Partial<Record<ClaveColumna, string>>>
  /** Datos del envío que una fila adicional toma de la primera: se muestran en gris como sugerencia. */
  heredados: Map<string, Partial<ValoresFila>>
  envioDeFila: Map<string, EnvioImportado>
  fallos: Map<string, string>
  onEditar: (id: string, clave: ClaveColumna, valor: string) => void
  onEliminar: (id: string) => void
  onAgregar: () => void
  onAgregarCarga: (id: string) => void
  onVerGuia: (clave: string) => void
}) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-popover">
          <tr>
            <th className="sticky left-0 z-10 w-12 border-b bg-popover px-3 py-2 text-left text-xs font-normal text-muted-foreground">Fila</th>
            {COLUMNAS.map((c) => (
              <th key={c.clave} className="border-b px-1 py-2 text-left text-xs font-normal whitespace-nowrap text-muted-foreground">
                <span className="px-2">
                  {c.titulo}
                  {c.requerida && <span className="text-foreground/40"> *</span>}
                </span>
              </th>
            ))}
            <th className="border-b px-3 py-2 text-right text-xs font-normal text-muted-foreground">Costo</th>
            <th className="w-28 border-b" />
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => {
            const e = errores.get(f.id) ?? {}
            const envio = envioDeFila.get(f.id)
            const fallo = envio ? fallos.get(envio.clave) : undefined
            const conError = Object.keys(e).length > 0 || !!fallo
            // Proximidad: las filas de una misma guía se unen con una línea a la izquierda.
            const agrupada = (envio?.filas.length ?? 0) > 1
            const primeraDelGrupo = !envio || envio.filas[0] === f.id
            const finDelGrupo = !agrupada || envio!.filas.at(-1) === f.id || filas[i + 1] === undefined
            return (
              <tr key={f.id} className={cn('group', conError && 'bg-destructive/[0.03]')}>
                <td
                  className={cn(
                    'sticky left-0 z-[1] bg-popover px-3 py-1 align-middle text-xs text-muted-foreground tabular-nums',
                    finDelGrupo && 'border-b border-border/60',
                    agrupada && 'border-l-2 border-l-primary/40',
                  )}
                  title={fallo ?? (conError ? Object.values(e).join(' · ') : undefined)}
                >
                  <span className="flex items-center gap-1">
                    {conError ? <AlertCircle className="size-3.5 text-destructive" aria-label="Con errores" /> : <Check className="size-3.5 text-emerald-600" aria-label="Lista" />}
                    {f.filaExcel ?? '—'}
                  </span>
                </td>
                {COLUMNAS.map((c) => {
                  const msg = e[c.clave]
                  const heredado = heredados.get(f.id)?.[c.clave]
                  return (
                    <td key={c.clave} className={cn('px-0.5 py-1', finDelGrupo && 'border-b border-border/60')}>
                      <input
                        value={f.valores[c.clave]}
                        onChange={(ev) => onEditar(f.id, c.clave, ev.target.value)}
                        list={LISTA[c.clave]}
                        inputMode={c.clave === 'cantidad' || c.clave === 'numeroGuia' || c.clave === 'envio' ? 'numeric' : c.clave === 'pesoKg' || c.clave === 'costoAdicional' ? 'decimal' : undefined}
                        aria-label={`${c.titulo}, fila ${f.filaExcel ?? 'nueva'}`}
                        aria-invalid={!!msg}
                        title={msg ?? (heredado ? 'Se toma de la primera fila del envío' : undefined)}
                        style={{ width: `${c.ancho + 2}ch` }}
                        className={cn(
                          'h-8 rounded-md bg-transparent px-2 outline-none transition-colors placeholder:text-muted-foreground/50',
                          'hover:bg-muted/70 focus:bg-background focus:ring-1 focus:ring-ring',
                          (c.clave === 'numeroGuia' || c.clave === 'envio') && 'font-mono tabular-nums',
                          (c.clave === 'cantidad' || c.clave === 'pesoKg' || c.clave === 'costoAdicional') && 'text-right tabular-nums',
                          msg && 'bg-destructive/5 text-destructive ring-1 ring-destructive/40 hover:bg-destructive/10',
                        )}
                        placeholder={msg ? '' : (heredado ?? (c.requerida ? '' : '—'))}
                      />
                    </td>
                  )
                })}
                <td className={cn('px-3 py-1 text-right whitespace-nowrap tabular-nums', finDelGrupo && 'border-b border-border/60')}>
                  {primeraDelGrupo && envio && envio.totalPiezas > 0 ? formatCurrency(envio.costo) : ''}
                </td>
                <td className={cn('px-2 py-1 whitespace-nowrap', finDelGrupo && 'border-b border-border/60')}>
                  <span className="flex justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    {primeraDelGrupo && envio?.solicitud && (
                      <Button variant="ghost" size="icon-sm" aria-label={`Ver guía de la fila ${f.filaExcel ?? 'nueva'}`} title="Ver guía" onClick={() => onVerGuia(envio.clave)}>
                        <Eye />
                      </Button>
                    )}
                    {primeraDelGrupo && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Agregar carga al envío de la fila ${f.filaExcel ?? 'nueva'}`}
                        title="Agregar otro tipo de carga a este envío"
                        onClick={() => onAgregarCarga(f.id)}
                      >
                        <PackagePlus />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" aria-label={`Quitar fila ${f.filaExcel ?? 'nueva'}`} title="Quitar fila" onClick={() => onEliminar(f.id)}>
                      <Trash2 />
                    </Button>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {filas.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No hay filas para mostrar.</p>}
      <div className="sticky left-0 px-3 py-3">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onAgregar}>
          <Plus />
          Agregar fila
        </Button>
      </div>
    </div>
  )
}

/** Las guías tal como se imprimirán (cuatro por hoja), generadas en el navegador. */
function VistaGuias({ envios, enfocada, onVerTodas }: { envios: Envio[]; enfocada: boolean; onVerTodas: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const clave = JSON.stringify(envios)

  useEffect(() => {
    if (!envios.length) return
    let vigente = true
    let creada: string | null = null
    setUrl(null)
    setError(false)
    crearGuiasPdf(envios)
      .then(({ blob }) => {
        if (!vigente) return
        creada = URL.createObjectURL(blob)
        setUrl(creada)
      })
      .catch(() => vigente && setError(true))
    return () => {
      vigente = false
      if (creada) URL.revokeObjectURL(creada)
    }
    // `clave` resume el contenido de las guías; `version` fuerza regenerar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, version])

  if (!envios.length) {
    return <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">No hay guías válidas para mostrar. Corrige los errores en «Datos».</p>
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-2 text-xs text-muted-foreground">
        <span className="mr-auto">
          {enfocada ? 'Una guía' : `${plural(envios.length, 'guía', 'guías')} · ${plural(Math.ceil(envios.length / GUIAS_POR_HOJA), 'hoja A4', 'hojas A4')}`}
          {' · las guías sin número lo reciben al importar'}
        </span>
        {enfocada && (
          <Button variant="link" size="sm" className="h-auto px-0 text-xs" onClick={onVerTodas}>
            Ver todas
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" aria-label="Regenerar vista" title="Regenerar" onClick={() => setVersion((v) => v + 1)}>
          <RefreshCw />
        </Button>
      </div>
      <div className="min-h-0 flex-1 bg-muted/40">
        {error ? (
          <p className="py-16 text-center text-sm text-destructive">{MENSAJE_ERROR_GUIA}</p>
        ) : url ? (
          // PDF local (blob:) generado en el navegador; nada de terceros.
          <object title="Vista previa de las guías" data={url} type="application/pdf" className="h-full w-full">
            <p className="py-16 text-center text-sm text-muted-foreground">
              Este navegador no muestra PDF aquí.{' '}
              <a href={url} target="_blank" rel="noreferrer" className="underline">
                Abrir la vista previa
              </a>
            </p>
          </object>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  )
}

function Resultado({ creados, fallos, pendientes, onRevisar }: { creados: Envio[]; fallos: number; pendientes: number; onRevisar: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-10 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
        <Check className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium">{plural(creados.length, 'guía creada', 'guías creadas')}</p>
        {creados.length > 0 && (
          <p className="max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">
            {creados.map((e) => e.numeroGuia).join(' · ')}
          </p>
        )}
      </div>
      {pendientes > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {fallos > 0
              ? `${plural(fallos, 'guía no se pudo crear', 'guías no se pudieron crear')}; quedan ${plural(pendientes, 'fila', 'filas')} por revisar.`
              : `Quedan ${plural(pendientes, 'fila', 'filas')} con errores sin importar.`}
          </p>
          <Button variant="outline" size="sm" onClick={onRevisar}>
            Revisar y reintentar
          </Button>
        </div>
      )}
    </div>
  )
}
