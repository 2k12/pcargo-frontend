import { INTERACTIVA, SELECCIONADA } from '@/lib/estilos'
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
              'rounded-xl px-3 py-2 text-left ring-1 ring-foreground/10',
              INTERACTIVA,
              activo && SELECCIONADA,
              invalid && !value && 'ring-destructive/50',
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
