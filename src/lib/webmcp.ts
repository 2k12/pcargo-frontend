import { useEffect } from 'react'

/**
 * WebMCP (https://developer.chrome.com/docs/ai/webmcp): expone herramientas del sitio a los agentes de IA del navegador.
 * Es una API experimental (origin trial desde Chrome 149): todo se activa solo si `document.modelContext` existe,
 * así que en navegadores sin soporte no tiene ningún efecto.
 */

type JsonSchema = {
  type: 'object'
  properties: Record<string, Record<string, unknown>>
  required?: string[]
}

export interface HerramientaAgente {
  name: string
  description: string
  inputSchema: JsonSchema
  execute: (input: Record<string, unknown>) => Promise<string>
  annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean; untrustedContentHint?: boolean }
}

interface ModelContext {
  registerTool: (tool: HerramientaAgente, options?: { signal?: AbortSignal }) => Promise<void> | void
}

function modelContext(): ModelContext | undefined {
  return (document as Document & { modelContext?: ModelContext }).modelContext
}

/** Registra las herramientas mientras el componente está montado y las retira al desmontarlo. */
export function useHerramientasAgente(herramientas: HerramientaAgente[]) {
  useEffect(() => {
    const mc = modelContext()
    if (!mc) return
    const controller = new AbortController()
    for (const h of herramientas) {
      // Un fallo al registrar una herramienta (p. ej. nombre duplicado) no debe romper la página.
      Promise.resolve(mc.registerTool(h, { signal: controller.signal })).catch(() => {})
    }
    return () => controller.abort()
  }, [herramientas])
}

/** Resultado de herramienta: JSON legible para el modelo. */
export const respuesta = (datos: unknown) => JSON.stringify(datos, null, 2)

type SubmitDeAgente = SubmitEvent & { agentInvoked?: boolean; respondWith?: (p: Promise<unknown>) => void }

/**
 * Formularios con `toolautosubmit` que navegan dentro de la SPA (sin recarga): si el envío lo hizo un agente,
 * le devuelve `resultado()` como salida de la herramienta. Debe llamarse de forma síncrona en el `onSubmit`.
 */
export function responderAgente(e: { nativeEvent: Event }, resultado: () => string | Promise<string>) {
  const ev = e.nativeEvent as SubmitDeAgente
  if (ev.agentInvoked && typeof ev.respondWith === 'function') ev.respondWith(Promise.resolve(resultado()))
}
