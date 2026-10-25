import { useState } from 'react'
import type { EnvioReparto } from '@/types/api'
import { CompletarEntregaSheet } from './components/CompletarEntregaSheet'
import { EntregarSheet } from './components/EntregarSheet'
import { MotivoSheet, type EstadoConMotivo } from './components/MotivoSheet'

/** Hojas de entrega, motivo y completar entrega compartidas por una lista de tarjetas. */
export function useHojasReparto() {
  const [entregar, setEntregar] = useState<EnvioReparto | null>(null)
  const [motivo, setMotivo] = useState<{ envio: EnvioReparto; estado: EstadoConMotivo } | null>(null)
  const [completar, setCompletar] = useState<EnvioReparto | null>(null)
  return {
    onEntregar: setEntregar,
    onMotivo: (envio: EnvioReparto, estado: EstadoConMotivo) => setMotivo({ envio, estado }),
    onCompletar: setCompletar,
    hojas: (
      <>
        {/* key: cada envío abre su hoja con el formulario vacío (o con los datos actuales). */}
        <EntregarSheet key={entregar?.id ?? 'entregar'} envio={entregar} onCerrar={() => setEntregar(null)} />
        <MotivoSheet
          key={motivo ? `${motivo.envio.id}-${motivo.estado}` : 'motivo'}
          objetivo={motivo}
          onCerrar={() => setMotivo(null)}
        />
        <CompletarEntregaSheet
          key={completar ? `${completar.id}-${completar.actualizadoEn}` : 'completar'}
          envio={completar}
          onCerrar={() => setCompletar(null)}
        />
      </>
    ),
  }
}
