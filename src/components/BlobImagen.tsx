import { useCallback, type ImgHTMLAttributes } from 'react'

/**
 * `<img>` de un Blob (p. ej. una foto descargada con el token). Crea la URL `blob:` al montarse
 * y la revoca al desmontarse o al cambiar el Blob (ref con limpieza de React 19).
 */
export function BlobImagen({ blob, alt, ...props }: { blob: Blob; alt: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const ref = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img || typeof URL.createObjectURL !== 'function') return
      const url = URL.createObjectURL(blob)
      img.src = url
      return () => URL.revokeObjectURL(url)
    },
    [blob],
  )
  return <img ref={ref} alt={alt} {...props} />
}
