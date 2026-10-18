import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/api'
import type { EnvioReparto } from '@/types/api'
import { useCambiarEstadoReparto } from '../hooks'
import { HojaInferior } from './HojaInferior'

export type EstadoConMotivo = 'NO_ENTREGADO' | 'NOVEDAD'

/** Motivos frecuentes: un toque y listo (se pueden editar). */
const SUGERENCIAS: Record<EstadoConMotivo, string[]> = {
  NO_ENTREGADO: ['No hay nadie', 'Dirección incorrecta', 'No contesta el teléfono', 'Rechazó el envío'],
  NOVEDAD: ['Paquete dañado', 'Falta información', 'Reprogramar entrega', 'Lluvia / vía cerrada'],
}

/** «No entregado» o «Novedad»: el motivo es obligatorio. Se monta con `key` por envío y estado. */
export function MotivoSheet({
  objetivo,
  onCerrar,
}: {
  objetivo: { envio: EnvioReparto; estado: EstadoConMotivo } | null
  onCerrar: () => void
}) {
  const cambiar = useCambiarEstadoReparto()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const titulo = objetivo?.estado === 'NOVEDAD' ? 'Novedad' : 'No entregado'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!objetivo) return
    const nota = motivo.trim()
    if (nota.length < 3) {
      setError('Escribe el motivo')
      return
    }
    try {
      await cambiar.mutateAsync({ id: objetivo.envio.id, estado: objetivo.estado, nota })
      toast.success(`Guía ${objetivo.envio.numeroGuia}: ${titulo.toLowerCase()}`)
      onCerrar()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <HojaInferior
      abierta={!!objetivo}
      onCerrar={onCerrar}
      titulo={titulo}
      descripcion={objetivo ? `Guía ${objetivo.envio.numeroGuia} · ${objetivo.envio.destinatario.nombre}` : undefined}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {objetivo &&
            SUGERENCIAS[objetivo.estado].map((s) => (
              <Button key={s} type="button" variant="secondary" className="h-11 rounded-full" onClick={() => setMotivo(s)}>
                {s}
              </Button>
            ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="motivo" className="text-base">
            Motivo
          </Label>
          <Textarea
            id="motivo"
            rows={3}
            maxLength={300}
            className="text-base"
            value={motivo}
            aria-invalid={!!error}
            onChange={(e) => setMotivo(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="submit" variant={objetivo?.estado === 'NO_ENTREGADO' ? 'destructive' : 'default'} className="h-14 w-full text-base" disabled={cambiar.isPending}>
          {cambiar.isPending && <Loader2 className="size-5 animate-spin" />}
          Guardar {titulo.toLowerCase()}
        </Button>
      </form>
    </HojaInferior>
  )
}
