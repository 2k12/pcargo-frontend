// Lectura de QR con la cámara mediante `BarcodeDetector` (Chrome/Android; Safari reciente).

/** API mínima de `BarcodeDetector` (aún no está en los tipos de TypeScript). */
interface DetectorCodigos {
  detect: (fuente: CanvasImageSource) => Promise<{ rawValue: string }[]>
}
type ConstructorDetector = new (opciones: { formats: string[] }) => DetectorCodigos

export function constructorDetector(): ConstructorDetector | null {
  const c = (globalThis as { BarcodeDetector?: ConstructorDetector }).BarcodeDetector
  return typeof c === 'function' && !!navigator.mediaDevices?.getUserMedia ? c : null
}

/** ¿El navegador puede leer QR con la cámara (`BarcodeDetector` + `getUserMedia`)? */
export const escanerDisponible = (): boolean => !!constructorDetector()
