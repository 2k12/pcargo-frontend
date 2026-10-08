import type { ComponentProps } from 'react'

/**
 * Enlace a otro sitio (WhatsApp, Google Maps…). Se abre en una pestaña nueva, sin enviar la página de origen
 * (`noreferrer`), y lo anuncia a los lectores de pantalla (WCAG 3.2.5: cambio de contexto avisado).
 */
export function EnlaceExterno({ children, ...props }: Omit<ComponentProps<'a'>, 'target' | 'rel'>) {
  return (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </a>
  )
}
