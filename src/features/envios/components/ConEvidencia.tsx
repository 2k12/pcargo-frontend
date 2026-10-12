import { Camera } from 'lucide-react'
import type { Envio } from '@/types/api'

/** Indicador compacto (lista y tarjeta) de que el envío ya tiene la foto de la guía firmada. */
export function ConEvidencia({ envio }: { envio: Pick<Envio, 'evidencia'> }) {
  if (!envio.evidencia) return null
  return (
    <span className="inline-flex text-muted-foreground" title={`Con prueba de entrega · recibió ${envio.evidencia.recibidoPor}`}>
      <Camera className="size-3.5" role="img" aria-label="Con prueba de entrega" />
    </span>
  )
}
