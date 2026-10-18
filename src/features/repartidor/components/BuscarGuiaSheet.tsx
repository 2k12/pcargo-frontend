import { useQuery } from '@tanstack/react-query'
import { Camera, CameraOff, Loader2, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EscanerQr } from '@/components/EscanerQr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MENSAJE_GUIA_INVALIDA, numeroGuiaDesdeQr } from '@/features/envios/guia'
import { ApiError, errorMessage } from '@/lib/api'
import { escanerDisponible } from '@/lib/escaner'
import { repartidorApi } from '../api'
import { repartoKeys } from '../hooks'
import { useHojasReparto } from '../useHojasReparto'
import { EntregaCard } from './EntregaCard'
import { HojaInferior } from './HojaInferior'

/**
 * Buscar o escanear una guía. Con `BarcodeDetector` y cámara, lee el QR de la guía impresa
 * (`<sitio>/seguimiento/<número>`); si no, se escribe el número. Muestra la entrega con sus acciones.
 */
export function BuscarGuiaSheet({
  abierta,
  onCerrar,
  numeroInicial = null,
}: {
  abierta: boolean
  onCerrar: () => void
  /** Guía ya conocida (p. ej. el QR leído con la cámara del teléfono): se busca sin abrir la cámara. */
  numeroInicial?: string | null
}) {
  const [soportaCamara] = useState(escanerDisponible)
  // Se monta de nuevo en cada apertura (`key` en el layout): empieza limpio y con la cámara si hay soporte.
  const [camara, setCamara] = useState(soportaCamara && !numeroInicial)
  const [texto, setTexto] = useState(numeroInicial ?? '')
  const [numero, setNumero] = useState<string | null>(numeroInicial)
  const [aviso, setAviso] = useState<string | null>(null)
  const hojas = useHojasReparto()
  const { data: envio, isFetching, error } = useQuery({
    queryKey: [...repartoKeys.all, 'guia', numero],
    queryFn: () => repartidorApi.porGuia(numero!),
    enabled: !!numero,
    retry: false,
  })

  const buscar = (valor: string) => {
    const n = numeroGuiaDesdeQr(valor)
    if (!n) {
      setAviso(MENSAJE_GUIA_INVALIDA)
      return
    }
    setAviso(null)
    setTexto(n)
    setNumero(n)
    setCamara(false)
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    buscar(texto)
  }

  const noEncontrada = error instanceof ApiError && error.status === 404

  return (
    <>
      <HojaInferior abierta={abierta} onCerrar={onCerrar} titulo="Buscar guía" descripcion="Escanea el QR de la guía o escribe su número.">
        <div className="space-y-4">
          {camara && abierta && (
            <EscanerQr
              onLeido={buscar}
              onError={(m) => {
                setCamara(false)
                setAviso(m)
              }}
            />
          )}

          <form onSubmit={onSubmit} noValidate className="flex gap-2" aria-label="Buscar por número">
            <Input
              inputMode="numeric"
              autoComplete="off"
              placeholder="Número de guía"
              aria-label="Número de guía"
              className="h-12 flex-1 font-mono text-base"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <Button type="submit" className="h-12 px-4" aria-label="Buscar">
              {isFetching ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
            </Button>
          </form>
          {soportaCamara && (
            <Button variant="ghost" className="h-11 w-full" onClick={() => setCamara((c) => !c)}>
              {camara ? <CameraOff className="size-5" /> : <Camera className="size-5" />}
              {camara ? 'Apagar cámara' : 'Escanear con la cámara'}
            </Button>
          )}

          {aviso && <p className="text-sm text-destructive">{aviso}</p>}
          {numero && error && (
            <p role="alert" className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
              {noEncontrada ? `La guía ${numero} no está asignada a ti.` : errorMessage(error)}
            </p>
          )}
          {numero && envio && <EntregaCard envio={envio} onEntregar={hojas.onEntregar} onMotivo={hojas.onMotivo} />}
        </div>
      </HojaInferior>
      {hojas.hojas}
    </>
  )
}
