import { Camera, Check, X } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { esTipoFoto, MENSAJE_FOTO_TIPO } from '@/features/envios/evidencia'

/**
 * Botón grande para tomar la foto de la guía firmada (abre la cámara trasera). Al elegirla muestra
 * «Foto lista» con la opción de quitarla.
 */
export function FotoGuiaCampo({
  foto,
  onFoto,
  error,
  onError,
  texto = 'Foto de la guía firmada',
  opcional = true,
}: {
  foto: File | null
  onFoto: (f: File | null) => void
  error: string | null
  onError: (mensaje: string | null) => void
  texto?: string
  opcional?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)

  const elegir = (f: File | undefined) => {
    if (!f) return
    if (!esTipoFoto(f.type)) {
      onError(MENSAJE_FOTO_TIPO)
      return
    }
    onError(null)
    onFoto(f)
  }

  return (
    <div className="space-y-1.5">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Foto de la guía firmada"
        onChange={(e) => elegir(e.target.files?.[0])}
      />
      {foto ? (
        <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
          <Check className="size-4 text-brand-green-text" />
          <span className="min-w-0 flex-1 truncate">Foto lista</span>
          <Button type="button" variant="ghost" className="h-11" onClick={() => onFoto(null)} aria-label="Quitar foto">
            <X />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="h-12 w-full text-base" onClick={() => input.current?.click()}>
          <Camera className="size-5" />
          {texto}
          {opcional && <span className="font-normal text-muted-foreground">(opcional)</span>}
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
