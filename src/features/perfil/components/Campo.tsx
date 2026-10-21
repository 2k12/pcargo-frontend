import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/** Campo de formulario del perfil: etiqueta, control y error (o ayuda) enlazables con `aria-describedby`. */
export function Campo({
  id,
  label,
  error,
  ayuda,
  children,
}: {
  id: string
  label: string
  error?: string
  ayuda?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
            {ayuda}
          </p>
        )
      )}
    </div>
  )
}
