import { ChevronDown } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { EnlaceExterno } from '@/components/EnlaceExterno'
import { cn } from '@/lib/utils'
import { faqJsonLd, jsonParaScript, type Fragmento, type PreguntaFrecuente } from '../contenido'

const ESTILO_ENLACE = 'font-medium text-brand-blue-text underline underline-offset-4 hover:no-underline'

function Respuesta({ fragmentos }: { fragmentos: Fragmento[] }) {
  return (
    <p className="text-pretty">
      {fragmentos.map((f, i) => {
        if (typeof f === 'string') return f
        if (f.tipo === 'ruta') return <Link key={i} to={f.href} className={ESTILO_ENLACE}>{f.texto}</Link>
        if (f.tipo === 'externo') return <EnlaceExterno key={i} href={f.href} className={ESTILO_ENLACE}>{f.texto}</EnlaceExterno>
        return <a key={i} href={f.href} className={ESTILO_ENLACE}>{f.texto}</a>
      })}
    </p>
  )
}

/**
 * Acordeón de preguntas frecuentes (patrón WAI-ARIA «Accordion»): cada pregunta es un botón dentro de un encabezado,
 * con `aria-expanded`/`aria-controls`; Enter y Espacio abren o cierran, ↑/↓/Inicio/Fin mueven el foco entre preguntas.
 * Publica además los datos estructurados schema.org `FAQPage` con exactamente el mismo texto.
 */
export function PreguntasFrecuentes({ preguntas }: { preguntas: PreguntaFrecuente[] }) {
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(() => new Set())
  const botones = useRef<(HTMLButtonElement | null)[]>([])

  const alternar = (id: string) =>
    setAbiertas((prev) => {
      const sig = new Set(prev)
      if (!sig.delete(id)) sig.add(id)
      return sig
    })

  const moverFoco = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = preguntas.length
    const destino = { ArrowDown: (i + 1) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key]
    if (destino === undefined) return
    e.preventDefault()
    botones.current[destino]?.focus()
  }

  return (
    <>
      <div className="divide-y overflow-hidden rounded-2xl border bg-card">
        {preguntas.map((p, i) => {
          const abierta = abiertas.has(p.id)
          const idBoton = `faq-${p.id}`
          const idPanel = `faq-${p.id}-respuesta`
          return (
            <div key={p.id}>
              <h3>
                <button
                  ref={(el) => {
                    botones.current[i] = el
                  }}
                  id={idBoton}
                  type="button"
                  aria-expanded={abierta}
                  aria-controls={idPanel}
                  onClick={() => alternar(p.id)}
                  onKeyDown={(e) => moverFoco(e, i)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left font-medium transition-colors outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:px-6"
                >
                  <span className="min-w-0 break-words">{p.pregunta}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn('size-4 shrink-0 text-muted-foreground transition-transform', abierta && 'rotate-180')}
                  />
                </button>
              </h3>
              <div id={idPanel} hidden={!abierta} className="px-4 pb-5 text-sm leading-6 text-muted-foreground sm:px-6">
                <Respuesta fragmentos={p.respuesta} />
              </div>
            </div>
          )
        })}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonParaScript(faqJsonLd(preguntas)) }} />
    </>
  )
}
