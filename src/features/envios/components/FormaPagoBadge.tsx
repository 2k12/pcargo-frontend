import { cn } from '@/lib/utils'
import type { FormaPago } from '@/types/api'
import { FORMA_PAGO_LABEL } from '../domain'
import { FORMA_PAGO_TONO } from '../ui'

export function FormaPagoBadge({ formaPago, className }: { formaPago: FormaPago; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        FORMA_PAGO_TONO[formaPago],
        className,
      )}
    >
      {FORMA_PAGO_LABEL[formaPago]}
    </span>
  )
}
