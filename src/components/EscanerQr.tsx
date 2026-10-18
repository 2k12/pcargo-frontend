import { useEffect, useRef } from 'react'
import { constructorDetector } from '@/lib/escaner'

/** Cámara trasera leyendo el QR de la guía. Llama a `onLeido` con el texto del primer código. */
export function EscanerQr({ onLeido, onError }: { onLeido: (texto: string) => void; onError: (mensaje: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  // Callbacks en refs: la cámara se abre una sola vez aunque el padre se vuelva a pintar.
  const callbacks = useRef({ onLeido, onError })
  useEffect(() => {
    callbacks.current = { onLeido, onError }
  })

  useEffect(() => {
    const Detector = constructorDetector()
    if (!Detector) return
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setInterval> | undefined
    let activo = true
    const detector = new Detector({ formats: ['qr_code'] })
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (s) => {
        if (!activo) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (!video.current) return
        video.current.srcObject = s
        await video.current.play().catch(() => {})
        timer = setInterval(async () => {
          if (!video.current || video.current.readyState < 2) return
          try {
            const [codigo] = await detector.detect(video.current)
            if (codigo?.rawValue && activo) callbacks.current.onLeido(codigo.rawValue)
          } catch {
            // Fotograma ilegible: se intenta con el siguiente.
          }
        }, 350)
      })
      .catch(() => callbacks.current.onError('No se pudo abrir la cámara. Escribe el número de la guía.'))
    return () => {
      activo = false
      if (timer) clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video ref={video} className="aspect-square w-full object-cover" muted playsInline aria-label="Cámara para leer el QR de la guía" />
      {/* Marco de enfoque: indica dónde poner el QR. */}
      <span aria-hidden className="pointer-events-none absolute inset-[18%] rounded-2xl ring-2 ring-white/80" />
    </div>
  )
}
