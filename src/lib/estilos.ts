/**
 * Clases compartidas que sostienen las leyes de Gestalt en toda la interfaz.
 *
 * - Región común: toda agrupación visual usa la misma superficie (tarjeta con anillo sutil).
 * - Similitud: todo lo que se puede tocar responde igual (hover, foco, presión);
 *   lo que no es interactivo nunca recibe ese feedback, para no sugerir una acción falsa.
 */

/** Superficie de una región agrupada (figura sobre el fondo `bg-muted/40` del panel). */
export const SUPERFICIE = 'rounded-xl bg-card ring-1 ring-foreground/10'

/** Feedback uniforme para superficies interactivas (tarjetas-enlace, filas clicables, opciones). */
export const INTERACTIVA =
  'cursor-pointer transition hover:bg-muted/40 hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.99]'

/** Opción seleccionada dentro de un grupo de opciones (radio en forma de tarjeta, pestaña…). */
export const SELECCIONADA = 'bg-accent text-accent-foreground ring-primary/60 hover:bg-accent'
