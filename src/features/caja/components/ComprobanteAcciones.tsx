import { FileDown, Loader2, Printer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { AccionGuia } from '@/features/envios/guiaPdf'
import type { CierreCaja } from '@/types/api'
import { generarComprobante, MENSAJE_ERROR_COMPROBANTE } from '../comprobantePdf'

/** Imprime o descarga el comprobante del cierre en PDF. */
export function ComprobanteAcciones({ cierre }: { cierre: CierreCaja }) {
  const [pendiente, setPendiente] = useState<AccionGuia | null>(null)
  const ejecutar = async (accion: AccionGuia) => {
    setPendiente(accion)
    try {
      await generarComprobante(cierre, accion)
    } catch {
      toast.error(MENSAJE_ERROR_COMPROBANTE)
    } finally {
      setPendiente(null)
    }
  }
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Comprobante">
      <Button variant="outline" size="sm" disabled={!!pendiente} onClick={() => ejecutar('imprimir')}>
        {pendiente === 'imprimir' ? <Loader2 className="animate-spin" /> : <Printer />}
        Imprimir comprobante
      </Button>
      <Button variant="ghost" size="sm" disabled={!!pendiente} onClick={() => ejecutar('descargar')}>
        {pendiente === 'descargar' ? <Loader2 className="animate-spin" /> : <FileDown />}
        Descargar PDF
      </Button>
    </div>
  )
}
