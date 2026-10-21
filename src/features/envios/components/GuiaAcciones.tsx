import { FileDown, Loader2, Printer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Envio } from '@/types/api'
import {
  generarGuia,
  guardarPosicionGuia,
  leerPosicionGuia,
  MENSAJE_ERROR_GUIA,
  POSICIONES_HOJA,
  type AccionGuia,
  type PosicionHoja,
} from '../guiaPdf'

/** Imprime o descarga la guía en PDF (un talón por cuarto de hoja A4, en la posición elegida). */
export function GuiaAcciones({ envio }: { envio: Envio }) {
  const [pendiente, setPendiente] = useState<AccionGuia | null>(null)
  const [posicion, setPosicion] = useState<PosicionHoja>(leerPosicionGuia)
  const elegirPosicion = (p: PosicionHoja) => {
    setPosicion(p)
    guardarPosicionGuia(p)
  }
  const ejecutar = async (accion: AccionGuia) => {
    setPendiente(accion)
    try {
      await generarGuia(envio, accion, posicion)
    } catch {
      toast.error(MENSAJE_ERROR_GUIA)
    } finally {
      setPendiente(null)
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Posición en la hoja">
        <span className="mr-1 text-xs text-muted-foreground">Posición en la hoja:</span>
        {POSICIONES_HOJA.map((p) => (
          <Button
            key={p}
            variant={posicion === p ? 'secondary' : 'ghost'}
            size="xs"
            className="w-7 tabular-nums"
            aria-pressed={posicion === p}
            aria-label={`Posición ${p + 1} de 4${p === 0 ? ' (arriba)' : p === 3 ? ' (abajo)' : ''}`}
            onClick={() => elegirPosicion(p)}
          >
            {p + 1}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Guía imprimible">
        <Button variant="outline" size="sm" disabled={!!pendiente} onClick={() => ejecutar('imprimir')}>
          {pendiente === 'imprimir' ? <Loader2 className="animate-spin" /> : <Printer />}
          Imprimir guía
        </Button>
        <Button variant="ghost" size="sm" disabled={!!pendiente} onClick={() => ejecutar('descargar')}>
          {pendiente === 'descargar' ? <Loader2 className="animate-spin" /> : <FileDown />}
          Descargar guía PDF
        </Button>
      </div>
    </div>
  )
}
