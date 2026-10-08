// Atributos del API declarativo de WebMCP (https://developer.chrome.com/docs/ai/webmcp/declarative-api).
import 'react'

declare module 'react' {
  interface FormHTMLAttributes<T> {
    /** Nombre de la herramienta que el agente verá para este formulario. */
    toolname?: string
    /** Qué hace la herramienta. */
    tooldescription?: string
    /** Presente (`""`): el formulario se envía solo cuando el agente invoca la herramienta. */
    toolautosubmit?: ''
  }
  interface InputHTMLAttributes<T> {
    /** Descripción del parámetro en el JSON Schema de la herramienta. */
    toolparamdescription?: string
  }
}
