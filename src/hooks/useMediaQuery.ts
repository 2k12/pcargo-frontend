import { useSyncExternalStore } from 'react'

/** `true` mientras se cumpla la media query. Sin `matchMedia` (SSR, algunos tests) devuelve `false`. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (avisar) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', avisar)
      return () => mql.removeEventListener('change', avisar)
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  )
}

/** Pantallas por debajo del breakpoint `md` de Tailwind (768 px): teléfonos. */
export const useEsMovil = () => useMediaQuery('(max-width: 767px)')
