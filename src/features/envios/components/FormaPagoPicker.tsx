import { cn } from '@/lib/utils'
import type { FormaPago } from '@/types/api'
import { FORMA_PAGO_DESCRIPCION, FORMA_PAGO_LABEL, FORMAS_PAGO } from '../domain'

interface Props {
  value: FormaPago | undefined
  onChange: (v: FormaPago) => void
  invalid?: boolean
}

/** Control segmentado para elegir la forma de pago del envío. */
export function FormaPagoPicker({ value, onChange, invalid }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Forma de pago"
      aria-invalid={invalid}
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {FORMAS_PAGO.map((f) => {
        const activo = value === f
        return (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(f)}
            className={cn(
              'rounded-lg border px-3 py-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
              activo && 'border-primary bg-muted',
              invalid && !value && 'border-destructive/50',
            )}
          >
            <span className="block text-sm font-medium">{FORMA_PAGO_LABEL[f]}</span>
            <span className="block text-[11px] text-muted-foreground">{FORMA_PAGO_DESCRIPCION[f]}</span>
          </button>
        )
      })}
    </div>
  )
}
