import { Download, Loader2, Printer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { AccionGuia } from '@/features/envios/guiaPdf'
import { cn } from '@/lib/utils'
import { generarGuiasEnBlanco, MENSAJE_ERROR_TALONARIO } from '../guiaEnBlancoPdf'

/** Botones «Imprimir» y «Descargar PDF» de las guías en blanco de esos números (cuatro por hoja A4). */
export function ImprimirGuiasEnBlanco({
  numeros,
  nota,
  etiquetaImprimir = 'Imprimir',
  className,
  size = 'default',
}: {
  numeros: number[]
  nota: string | null | undefined
  etiquetaImprimir?: string
  className?: string
  size?: 'default' | 'sm'
}) {
  const [generando, setGenerando] = useState<AccionGuia | null>(null)
  const sinGuias = numeros.length === 0

  const generar = async (accion: AccionGuia) => {
    setGenerando(accion)
    try {
      await generarGuiasEnBlanco(numeros, nota, accion)
    } catch {
      toast.error(MENSAJE_ERROR_TALONARIO)
    } finally {
      setGenerando(null)
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button size={size} disabled={sinGuias || !!generando} onClick={() => void generar('imprimir')}>
        {generando === 'imprimir' ? <Loader2 className="animate-spin" /> : <Printer />}
        {etiquetaImprimir}
      </Button>
      <Button size={size} variant="outline" disabled={sinGuias || !!generando} onClick={() => void generar('descargar')}>
        {generando === 'descargar' ? <Loader2 className="animate-spin" /> : <Download />}
        Descargar PDF
      </Button>
    </div>
  )
}
