import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Copia `valor` al portapapeles. Funciona sin Toaster: el propio botón confirma ("Copiado") y lo anuncia. */
async function copiarTexto(valor: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(valor)
    return true
  } catch {
    return false
  }
}

export function BotonCopiar({
  valor,
  etiqueta = 'Copiar',
  texto,
  variant = 'ghost',
  size,
  className,
}: {
  valor: string
  /** Nombre accesible, p. ej. "Copiar request id". */
  etiqueta?: string
  /** Texto visible junto al icono (el nombre accesible `etiqueta` debe contenerlo, WCAG 2.5.3). */
  texto?: string
  variant?: 'ghost' | 'outline' | 'default' | 'secondary'
  size?: 'xs' | 'sm' | 'default' | 'icon-xs' | 'icon-sm' | 'icon'
  className?: string
}) {
  const [copiado, setCopiado] = useState(false)
  useEffect(() => {
    if (!copiado) return
    const t = setTimeout(() => setCopiado(false), 2000)
    return () => clearTimeout(t)
  }, [copiado])

  const Icono = copiado ? Check : Copy
  return (
    <Button
      type="button"
      variant={variant}
      size={size ?? (texto ? 'sm' : 'icon-xs')}
      aria-label={etiqueta}
      className={cn(className)}
      onClick={async () => setCopiado(await copiarTexto(valor))}
    >
      <Icono />
      {texto && <span aria-hidden>{copiado ? 'Copiado' : texto}</span>}
      <span className="sr-only" aria-live="polite">
        {copiado ? 'Copiado' : ''}
      </span>
    </Button>
  )
}
