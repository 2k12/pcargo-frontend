import { useCallback, useState } from 'react'

/** Clave de almacenamiento local del menú lateral minimizado (declarada en la política de cookies). */
export const CLAVE_MENU = 'pcargo.menu'

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE_MENU) === 'minimizado'
  } catch {
    return false // almacenamiento bloqueado (modo privado, política del navegador): menú expandido
  }
}

/** Menú lateral del panel minimizado o expandido; la preferencia se recuerda en este navegador. */
export function useMenuMinimizado() {
  const [minimizado, setMinimizado] = useState(leer)
  const alternar = useCallback(() => {
    setMinimizado((actual) => {
      const nuevo = !actual
      try {
        if (nuevo) localStorage.setItem(CLAVE_MENU, 'minimizado')
        else localStorage.removeItem(CLAVE_MENU)
      } catch {
        // Sin almacenamiento la preferencia dura solo esta visita.
      }
      return nuevo
    })
  }, [])
  return { minimizado, alternar }
}
