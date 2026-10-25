import { Camera, CameraOff, FilePlus2, Loader2, ScanLine, Search } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { EscanerQr } from '@/components/EscanerQr'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { talonariosApi } from '@/features/talonarios/api'
import { avisoGuiaTalonario, guiaParaRegistrar, type GuiaParaRegistrar } from '@/features/talonarios/domain'
import { errorMessage } from '@/lib/api'
import { escanerDisponible } from '@/lib/escaner'
import type { GuiaDeTalonario } from '@/types/api'
import { enviosApi } from '../api'
import { MENSAJE_GUIA_INVALIDA, numeroGuiaDesdeQr } from '../guia'
import { NuevoEnvioDialog } from './NuevoEnvioDialog'

/**
 * Escanear el QR de una guía (o escribir su número) desde el panel y abrir el envío para gestionarlo.
 * Si el número aún no es un envío pero es de un talonario (contrato v20), se ofrece registrarlo o se
 * explica por qué no se puede (anulada).
 * Se monta de nuevo en cada apertura: empieza limpio y con la cámara si el navegador la soporta.
 */
function Escaneo({
  onEncontrado,
  onRegistrar,
}: {
  onEncontrado: (envioId: string) => void
  onRegistrar: (guia: GuiaParaRegistrar) => void
}) {
  const [soportaCamara] = useState(escanerDisponible)
  const [camara, setCamara] = useState(soportaCamara)
  const [texto, setTexto] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enBlanco, setEnBlanco] = useState<GuiaDeTalonario | null>(null)
  // La cámara entrega el mismo código varias veces por segundo: se atiende uno a la vez.
  const ocupado = useRef(false)

  const buscar = async (valor: string) => {
    if (ocupado.current) return
    const n = numeroGuiaDesdeQr(valor)
    if (!n) {
      setAviso(MENSAJE_GUIA_INVALIDA)
      return
    }
    ocupado.current = true
    setTexto(n)
    setAviso(null)
    setEnBlanco(null)
    setBuscando(true)
    try {
      const envio = await enviosApi.porGuia(n)
      if (envio) {
        onEncontrado(envio.id)
        return
      }
      setCamara(false)
      const guia = await talonariosApi.porGuia(n)
      if (guia?.estado === 'DISPONIBLE') setEnBlanco(guia)
      else setAviso(guia ? avisoGuiaTalonario(guia) : `No hay ningún envío con la guía ${n}.`)
    } catch (e) {
      setAviso(errorMessage(e))
    } finally {
      ocupado.current = false
      setBuscando(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void buscar(texto)
  }

  return (
    <div className="space-y-4">
      {camara && (
        <EscanerQr
          onLeido={(t) => void buscar(t)}
          onError={(m) => {
            setCamara(false)
            setAviso(m)
          }}
        />
      )}

      <form onSubmit={onSubmit} noValidate className="flex gap-2" aria-label="Buscar por número de guía">
        <Input
          inputMode="numeric"
          autoComplete="off"
          autoFocus={!camara}
          placeholder="Número de guía"
          aria-label="Número de guía"
          className="h-11 flex-1 font-mono"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Button type="submit" className="h-11 px-4" aria-label="Buscar" disabled={buscando}>
          {buscando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </Button>
      </form>

      {soportaCamara && (
        <Button variant="ghost" className="w-full" onClick={() => setCamara((c) => !c)}>
          {camara ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
          {camara ? 'Apagar cámara' : 'Escanear con la cámara'}
        </Button>
      )}

      {aviso && (
        <p role="alert" className="text-sm break-words text-destructive">
          {aviso}
        </p>
      )}

      {enBlanco && (
        <div role="status" className="space-y-3 rounded-lg border p-3">
          <p className="text-sm">
            {avisoGuiaTalonario(enBlanco)}
            {enBlanco.nota && <span className="block text-xs text-muted-foreground">Talonario: {enBlanco.nota}</span>}
          </p>
          <Button className="w-full" onClick={() => onRegistrar(guiaParaRegistrar(enBlanco.numeroGuia, enBlanco.creadoEn))}>
            <FilePlus2 />
            Registrar esta guía
          </Button>
        </div>
      )}
    </div>
  )
}

/** Botón «Escanear» de la vista de envíos: lee la guía y abre su detalle (estado, repartidor, evidencia). */
export function EscanearGuiaDialog({ onEncontrado }: { onEncontrado: (envioId: string) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [aperturas, setAperturas] = useState(0)
  // Guía de talonario por registrar: se conserva la última para que el formulario no cambie al cerrarse.
  const [registrar, setRegistrar] = useState<GuiaParaRegistrar | null>(null)
  const [registroAbierto, setRegistroAbierto] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setAperturas((n) => n + 1)
          setAbierto(true)
        }}
      >
        <ScanLine />
        Escanear
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Escanear guía</DialogTitle>
            <DialogDescription>Apunta la cámara al QR de la guía o escribe su número.</DialogDescription>
          </DialogHeader>
          {abierto && (
            <Escaneo
              key={aperturas}
              onEncontrado={(id) => {
                setAbierto(false)
                onEncontrado(id)
              }}
              onRegistrar={(g) => {
                setAbierto(false)
                setRegistrar(g)
                setRegistroAbierto(true)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {registrar && <NuevoEnvioDialog abierto={registroAbierto} onAbiertoChange={setRegistroAbierto} guiaTalonario={registrar} />}
    </>
  )
}
