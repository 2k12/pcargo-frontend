import { FileDown, Loader2, Printer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Envio } from '@/types/api'
import { generarGuia, guardarMitadGuia, leerMitadGuia, MENSAJE_ERROR_GUIA, type AccionGuia, type MitadHoja } from '../guiaPdf'

const MITADES: { valor: MitadHoja; etiqueta: string }[] = [
  { valor: 'superior', etiqueta: 'Arriba' },
  { valor: 'inferior', etiqueta: 'Abajo' },
]

/** Imprime o descarga la guía en PDF (copia paquete + copia entrega en media hoja A4). */
export function GuiaAcciones({ envio }: { envio: Envio }) {
  const [pendiente, setPendiente] = useState<AccionGuia | null>(null)
  const [mitad, setMitad] = useState<MitadHoja>(leerMitadGuia)
  const elegirMitad = (m: MitadHoja) => {
    setMitad(m)
    guardarMitadGuia(m)
  }
  const ejecutar = async (accion: AccionGuia) => {
    setPendiente(accion)
    try {
      await generarGuia(envio, accion, mitad)
    } catch {
      toast.error(MENSAJE_ERROR_GUIA)
    } finally {
      setPendiente(null)
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Mitad de la hoja">
        <span className="text-xs text-muted-foreground">Media hoja:</span>
        {MITADES.map((m) => (
          <Button
            key={m.valor}
            variant={mitad === m.valor ? 'secondary' : 'ghost'}
            size="xs"
            aria-pressed={mitad === m.valor}
            onClick={() => elegirMitad(m.valor)}
          >
            {m.etiqueta}
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
