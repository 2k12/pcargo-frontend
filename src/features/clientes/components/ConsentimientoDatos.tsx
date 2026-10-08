import type { ComponentProps } from 'react'
import { Link } from 'react-router'

/**
 * Casilla de consentimiento (LOPDP) para guardar a alguien como cliente frecuente. Siempre empieza desmarcada:
 * el operador la marca solo después de preguntarle al cliente. El servidor guarda la fecha como prueba.
 */
export function ConsentimientoDatos({
  id,
  error,
  ...input
}: { id: string; error?: string } & Omit<ComponentProps<'input'>, 'type' | 'id'>) {
  const ayuda = `${id}-ayuda`
  const err = `${id}-error`
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm ring-1 ring-foreground/10">
        <input
          id={id}
          type="checkbox"
          aria-invalid={!!error}
          aria-describedby={error ? `${ayuda} ${err}` : ayuda}
          className="mt-0.5 size-4 shrink-0 accent-primary"
          {...input}
        />
        <div className="space-y-0.5">
          <label htmlFor={id} className="font-medium">
            El cliente aceptó que guardemos sus datos
          </label>
          <p id={ayuda} className="text-xs text-muted-foreground">
            Pregúntale antes de marcar. Sus datos se usarán solo para agilizar sus próximos envíos; puede pedir que los borremos
            cuando quiera. Ver la{' '}
            <Link to="/privacidad" target="_blank" className="text-primary underline underline-offset-2">
              política de privacidad<span className="sr-only"> (se abre en una pestaña nueva)</span>
            </Link>
            .
          </p>
        </div>
      </div>
      {error && (
        <p id={err} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
