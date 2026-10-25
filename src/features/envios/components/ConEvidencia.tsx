import { Camera } from 'lucide-react'
import type { Envio } from '@/types/api'
import { faltanteEvidencia } from '../evidencia'
import { EVIDENCIA_INCOMPLETA_TONO } from '../ui'

/**
 * Indicador compacto (lista y tarjeta) de que el envío tiene prueba de entrega. Desde v19 se carga por
 * partes: si falta el nombre o la foto, se marca como incompleta.
 */
export function ConEvidencia({ envio }: { envio: Pick<Envio, 'evidencia'> }) {
  if (!envio.evidencia) return null
  const falta = faltanteEvidencia(envio.evidencia)
  if (falta) {
    const texto = `Prueba de entrega incompleta: ${falta}`
    return (
      <span className={`inline-flex ${EVIDENCIA_INCOMPLETA_TONO}`} title={texto}>
        <Camera className="size-3.5" role="img" aria-label={texto} />
      </span>
    )
  }
  return (
    <span className="inline-flex text-muted-foreground" title={`Con prueba de entrega · recibió ${envio.evidencia.recibidoPor}`}>
      <Camera className="size-3.5" role="img" aria-label="Con prueba de entrega" />
    </span>
  )
}
