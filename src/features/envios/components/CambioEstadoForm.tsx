import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Estado } from '@/types/api'
import { accionLabel, requiereNota, transicionesPermitidas } from '../domain'

interface Props {
  estado: Estado
  pendiente?: Estado | null
  onTransicion: (estado: Estado, nota: string) => Promise<unknown> | void
}

/**
 * Jerarquía de acciones (punto focal): la primera transición permitida es el siguiente paso natural
 * y es la única principal; las excepciones van en contorno y cancelar queda separado al final.
 */
function variante(destino: Estado, indice: number): 'default' | 'outline' | 'destructive' {
  if (destino === 'CANCELADO') return 'destructive'
  return indice === 0 ? 'default' : 'outline'
}

/**
 * Acciones de cambio de estado: solo las transiciones permitidas.
 * NO_ENTREGADO y NOVEDAD exigen un motivo: el primer clic selecciona la acción y muestra el campo obligatorio.
 */
export function CambioEstadoForm({ estado, pendiente, onTransicion }: Props) {
  const [nota, setNota] = useState('')
  const [conMotivo, setConMotivo] = useState<Estado | null>(null)
  const acciones = transicionesPermitidas(estado)
  if (acciones.length === 0) return null

  const ejecutar = async (destino: Estado) => {
    if (requiereNota(destino) && conMotivo !== destino) {
      setConMotivo(destino)
      return
    }
    try {
      await onTransicion(destino, nota.trim())
      setNota('')
      setConMotivo(null)
    } catch {
      // El llamador ya notificó el error; se conserva la nota para reintentar.
    }
  }

  const motivoFaltante = !!conMotivo && nota.trim() === ''

  return (
    <section className="space-y-3" aria-label="Actualizar estado">
      <SectionLabel>Actualizar estado</SectionLabel>
      <div className="space-y-1.5">
        <Label htmlFor="nota-estado" className={cn(!conMotivo && 'text-muted-foreground')}>
          {conMotivo ? 'Motivo (obligatorio)' : 'Nota (opcional)'}
        </Label>
        <Textarea
          id="nota-estado"
          placeholder={
            conMotivo === 'NO_ENTREGADO'
              ? 'Ej. destinatario ausente, dirección incorrecta…'
              : conMotivo === 'NOVEDAD'
                ? 'Ej. paquete con daño, retraso en ruta…'
                : 'Ej. recibido por portería'
          }
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          aria-invalid={motivoFaltante}
          aria-describedby="nota-estado-publica"
          rows={2}
        />
        <p id="nota-estado-publica" className="text-xs text-muted-foreground">
          Se muestra en el seguimiento público: no escribas nombres, teléfonos ni direcciones.
        </p>
        {motivoFaltante && <p className="text-xs text-destructive">Indica el motivo para continuar.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {acciones.map((destino, i) => {
          const seleccionado = conMotivo === destino
          return (
            <Button
              key={destino}
              className={cn(destino === 'CANCELADO' && 'ml-auto')}
              variant={seleccionado ? 'default' : variante(destino, i)}
              disabled={!!pendiente || (seleccionado && motivoFaltante)}
              onClick={() => ejecutar(destino)}
            >
              {pendiente === destino && <Loader2 className="animate-spin" />}
              {seleccionado ? `Confirmar: ${accionLabel(estado, destino).toLowerCase()}` : accionLabel(estado, destino)}
            </Button>
          )
        })}
        {conMotivo && (
          <Button variant="ghost" onClick={() => setConMotivo(null)}>
            Cancelar
          </Button>
        )}
      </div>
    </section>
  )
}
