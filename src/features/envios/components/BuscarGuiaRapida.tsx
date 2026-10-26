import { Loader2, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { talonariosApi } from '@/features/talonarios/api'
import { avisoGuiaTalonario } from '@/features/talonarios/domain'
import { useEsMovil } from '@/hooks/useMediaQuery'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Envio } from '@/types/api'
import { enviosApi } from '../api'
import { normalizarGuia, rutaEnvio } from '../guia'
import { ElegirGuiaDialog } from './ElegirGuiaDialog'

/** ¿El foco está en un campo donde «/» se escribe (no debe robarse el atajo)? */
function escribiendo(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/**
 * Búsqueda rápida de guías en la barra superior del panel (contrato v21): un número busca por número del sistema
 * o guía física (`GET /envios/buscar-guia/:numero`); un texto lleva a la búsqueda normal de Envíos.
 * Escritorio: campo compacto con atajo «/». Móvil: una lupa que despliega el campo sobre la barra.
 */
export function BuscarGuiaRapida() {
  const navigate = useNavigate()
  const esMovil = useEsMovil()
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [eleccion, setEleccion] = useState<{ numero: string; envios: Envio[] } | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  // «/» enfoca el campo en escritorio (como en GitHub o Gmail), salvo que ya se esté escribiendo en otro campo.
  useEffect(() => {
    if (esMovil) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || escribiendo(document.activeElement)) return
      e.preventDefault()
      campo.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [esMovil])

  const terminar = () => {
    setTexto('')
    setAbierto(false)
    campo.current?.blur()
  }

  const buscar = async (valor: string) => {
    const t = valor.trim()
    if (!t || buscando) return
    const n = normalizarGuia(t)
    if (!n) {
      navigate(`/envios?q=${encodeURIComponent(t)}`)
      return terminar()
    }
    setBuscando(true)
    try {
      const envios = await enviosApi.buscarGuia(n)
      if (envios.length === 1) {
        navigate(rutaEnvio(n, envios[0]!))
        return terminar()
      }
      if (envios.length > 1) return setEleccion({ numero: n, envios })
      // Sin envío: si es una guía en blanco de talonario disponible, Envíos ofrece registrarla (contrato v20).
      const guia = await talonariosApi.porGuia(n)
      if (guia?.estado === 'DISPONIBLE') {
        navigate(`/envios?guia=${n}`)
        return terminar()
      }
      toast.error(guia ? avisoGuiaTalonario(guia) : `No hay ningún envío con la guía ${n}`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBuscando(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void buscar(texto)
  }

  const formulario = (
    <form
      role="search"
      aria-label="Buscar guía"
      onSubmit={onSubmit}
      className={cn(
        'flex items-center gap-1',
        // Móvil: ocupa toda la barra superior (sin desbordar a lo ancho).
        esMovil && 'absolute inset-0 z-10 bg-background px-4',
      )}
    >
      <div className="relative min-w-0 flex-1">
        {buscando ? (
          <Loader2 className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          ref={campo}
          type="search"
          inputMode={esMovil ? 'numeric' : undefined}
          enterKeyHint="search"
          autoComplete="off"
          aria-label="Buscar guía"
          placeholder="Buscar guía"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') terminar()
          }}
          autoFocus={esMovil}
          className={cn('h-8 pl-8', esMovil ? 'w-full' : 'w-40 pr-7 lg:w-52')}
        />
        {!esMovil && !texto && (
          <kbd
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border bg-muted px-1 font-mono text-[10px] leading-4 text-muted-foreground"
          >
            /
          </kbd>
        )}
      </div>
      {esMovil && (
        <Button type="button" variant="ghost" size="icon" aria-label="Cerrar búsqueda" onClick={terminar}>
          <X />
        </Button>
      )}
    </form>
  )

  return (
    <>
      {esMovil && !abierto ? (
        <Button variant="ghost" size="icon" aria-label="Buscar guía" onClick={() => setAbierto(true)}>
          <Search />
        </Button>
      ) : (
        formulario
      )}
      {eleccion && (
        <ElegirGuiaDialog
          numero={eleccion.numero}
          envios={eleccion.envios}
          onElegir={(e) => {
            navigate(rutaEnvio(eleccion.numero, e))
            setEleccion(null)
            terminar()
          }}
          onCerrar={() => setEleccion(null)}
        />
      )}
    </>
  )
}
