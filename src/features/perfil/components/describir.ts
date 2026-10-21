/** Id para `aria-describedby`: el error si lo hay; si no, la ayuda (cuando existe). */
export const describir = (id: string, error?: unknown, ayuda?: boolean) =>
  error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined
