import { FileDown, Loader2, Printer, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Envio } from '@/types/api'
import { generarGuias, MENSAJE_ERROR_GUIA, type AccionGuia } from '../guiaPdf'

/** Hojas A4 que ocupan `n` guías impresas dos por hoja. */
const hojasParaGuias = (n: number) => Math.ceil(n / 2)

/**
 * Barra flotante de los envíos marcados (región común: todo lo que actúa sobre la selección vive
 * junto, separado del contenido). Imprime o descarga sus guías organizadas dos por hoja.
 */
export function SeleccionGuias({ envios, onLimpiar }: { envios: Envio[]; onLimpiar: () => void }) {
  const [pendiente, setPendiente] = useState<AccionGuia | null>(null)
  if (envios.length === 0) return null
  const n = envios.length
  const hojas = hojasParaGuias(n)
  const ejecutar = async (accion: AccionGuia) => {
    setPendiente(accion)
    try {
      await generarGuias(envios, accion)
    } catch {
      toast.error(MENSAJE_ERROR_GUIA)
    } finally {
      setPendiente(null)
    }
  }
  const boton = 'rounded-full text-background hover:bg-background/15 hover:text-background'
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 flex justify-center px-4 md:bottom-6">
      <div
        role="region"
        aria-label="Guías seleccionadas"
        className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm text-background shadow-lg shadow-foreground/20 animate-in fade-in slide-in-from-bottom-2"
      >
        <span className="mr-2 truncate" aria-live="polite">
          <span className="font-medium tabular-nums">
            {n} {n === 1 ? 'guía seleccionada' : 'guías seleccionadas'}
          </span>
          <span className="hidden text-background/60 sm:inline">
            {' '}
            · {hojas} {hojas === 1 ? 'hoja A4' : 'hojas A4'}
          </span>
        </span>
        <Button
          size="sm"
          className="rounded-full bg-background text-foreground hover:bg-background/90"
          disabled={!!pendiente}
          onClick={() => ejecutar('imprimir')}
        >
          {pendiente === 'imprimir' ? <Loader2 className="animate-spin" /> : <Printer />}
          Imprimir guías
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className={boton}
          disabled={!!pendiente}
          onClick={() => ejecutar('descargar')}
          aria-label="Descargar PDF"
          title="Descargar PDF"
        >
          {pendiente === 'descargar' ? <Loader2 className="animate-spin" /> : <FileDown />}
        </Button>
        <Button variant="ghost" size="icon-sm" className={boton} disabled={!!pendiente} onClick={onLimpiar} aria-label="Quitar selección" title="Quitar selección">
          <X />
        </Button>
      </div>
    </div>
  )
}
