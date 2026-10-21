import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Confirmar } from '@/features/integraciones/components/Confirmar'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Envio, Estado } from '@/types/api'
import { enviosApi } from '../api'
import { ACCION_LABEL, aplicablesPara, ESTADO_LABEL, ESTADOS_CAMBIO_RAPIDO } from '../domain'
import { enviosKeys } from '../hooks'

/** Cuántos cambios se piden a la vez (el servidor limita la tasa de peticiones). */
const EN_PARALELO = 5

const guias = (n: number) => `${n} ${n === 1 ? 'guía' : 'guías'}`

/**
 * Botones de cambio rápido de estado para los envíos marcados. Cada botón se habilita cuando alguna
 * guía marcada puede pasar a ese estado; solo cambia esas y avisa de las omitidas.
 */
export function CambioEstadoRapido({ envios, onHecho, className }: { envios: Envio[]; onHecho: () => void; className?: string }) {
  const qc = useQueryClient()
  const [enCurso, setEnCurso] = useState<Estado | null>(null)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)

  async function aplicar(destino: Estado) {
    const validos = aplicablesPara(envios, destino)
    const omitidos = envios.length - validos.length
    setEnCurso(destino)
    let ok = 0
    const errores: string[] = []
    try {
      for (let i = 0; i < validos.length; i += EN_PARALELO) {
        const lote = await Promise.allSettled(validos.slice(i, i + EN_PARALELO).map((e) => enviosApi.cambiarEstado(e.id, destino)))
        for (const r of lote) {
          if (r.status === 'fulfilled') ok++
          else errores.push(errorMessage(r.reason))
        }
      }
    } finally {
      setEnCurso(null)
      setConfirmarCancelar(false)
      qc.invalidateQueries({ queryKey: enviosKeys.all })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    }
    const detalle = [
      omitidos ? `${guias(omitidos)} no ${omitidos === 1 ? 'podía' : 'podían'} pasar a «${ESTADO_LABEL[destino]}».` : '',
      errores.length ? `${guias(errores.length)} con error: ${errores[0]}` : '',
    ]
      .filter(Boolean)
      .join(' ')
    if (ok > 0) {
      toast.success(`${guias(ok)} en «${ESTADO_LABEL[destino]}»`, { description: detalle || undefined })
      onHecho()
    } else {
      toast.error(`No se cambió ninguna guía`, { description: detalle || undefined })
    }
  }

  return (
    <div role="group" aria-label="Cambiar estado de las guías marcadas" className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="hidden text-xs text-muted-foreground sm:inline">{envios.length ? 'Cambiar las marcadas:' : 'Marca guías para cambiar su estado'}</span>
      {ESTADOS_CAMBIO_RAPIDO.map((destino) => {
        const n = aplicablesPara(envios, destino).length
        const cancelar = destino === 'CANCELADO'
        return (
          <Button
            key={destino}
            size="sm"
            variant={cancelar ? 'ghost' : 'outline'}
            className={cn('shrink-0', cancelar && 'text-destructive hover:text-destructive')}
            disabled={n === 0 || !!enCurso}
            onClick={() => (cancelar ? setConfirmarCancelar(true) : aplicar(destino))}
          >
            {enCurso === destino && <Loader2 className="animate-spin" />}
            {ACCION_LABEL[destino]}
            {n > 0 && <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{n}</span>}
          </Button>
        )
      })}
      <Confirmar
        abierto={confirmarCancelar}
        onCancelar={() => setConfirmarCancelar(false)}
        onConfirmar={() => aplicar('CANCELADO')}
        pendiente={enCurso === 'CANCELADO'}
        titulo={`¿Cancelar ${guias(aplicablesPara(envios, 'CANCELADO').length)}?`}
        descripcion="Solo se cancelan las guías registradas que aún no salen. No se puede deshacer."
        accion="Cancelar envíos"
      />
    </div>
  )
}
