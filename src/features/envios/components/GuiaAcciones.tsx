import { FileDown, Loader2, Printer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Envio } from '@/types/api'
import { generarGuia, MENSAJE_ERROR_GUIA, type AccionGuia } from '../guiaPdf'

/** Imprime o descarga la guía en PDF (A4: copia paquete + copia entrega). */
export function GuiaAcciones({ envio }: { envio: Envio }) {
  const [pendiente, setPendiente] = useState<AccionGuia | null>(null)
  const ejecutar = async (accion: AccionGuia) => {
    setPendiente(accion)
    try {
      await generarGuia(envio, accion)
    } catch {
      toast.error(MENSAJE_ERROR_GUIA)
    } finally {
      setPendiente(null)
    }
  }
  return (
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
  )
}
