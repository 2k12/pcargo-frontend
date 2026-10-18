import { useState } from 'react'
import type { EnvioReparto } from '@/types/api'
import { EntregarSheet } from './components/EntregarSheet'
import { MotivoSheet, type EstadoConMotivo } from './components/MotivoSheet'

/** Hojas de entrega y motivo compartidas por una lista de tarjetas. */
export function useHojasReparto() {
  const [entregar, setEntregar] = useState<EnvioReparto | null>(null)
  const [motivo, setMotivo] = useState<{ envio: EnvioReparto; estado: EstadoConMotivo } | null>(null)
  return {
    onEntregar: setEntregar,
    onMotivo: (envio: EnvioReparto, estado: EstadoConMotivo) => setMotivo({ envio, estado }),
    hojas: (
      <>
        {/* key: cada envío abre su hoja con el formulario vacío. */}
        <EntregarSheet key={entregar?.id ?? 'entregar'} envio={entregar} onCerrar={() => setEntregar(null)} />
        <MotivoSheet
          key={motivo ? `${motivo.envio.id}-${motivo.estado}` : 'motivo'}
          objetivo={motivo}
          onCerrar={() => setMotivo(null)}
        />
      </>
    ),
  }
}
