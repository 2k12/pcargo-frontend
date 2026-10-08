import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Rótulo de un grupo de contenido. Siempre el mismo estilo (similitud) y pegado a lo que rotula (proximidad).
 */
export function SectionLabel({
  children,
  aside,
  className,
  as: Tag = 'p',
}: {
  children: ReactNode
  aside?: ReactNode
  className?: string
  as?: 'p' | 'h2' | 'h3'
}) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <Tag className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</Tag>
      {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
    </div>
  )
}
