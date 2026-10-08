import type { Estado } from '@/types/api'

/** Color semántico de cada estado (sky/amber/emerald/rose/violet de las insignias). */
export const COLOR_ESTADO: Record<Estado, string> = {
  REGISTRADO: '#0186C9',
  EN_TRANSITO: '#0EA5E9',
  EN_REPARTO: '#F59E0B',
  ENTREGADO: '#10B981',
  NO_ENTREGADO: '#F43F5E',
  NOVEDAD: '#8B5CF6',
  CANCELADO: '#EF4444',
}

/** Frase que acompaña al personaje (en pantallas grandes). */
export const MENSAJE_ESTADO: Record<Estado, { titulo: string; texto: string }> = {
  REGISTRADO: { titulo: '¡Ya tenemos tu encomienda!', texto: 'La registramos y la estamos preparando para su viaje.' },
  EN_TRANSITO: { titulo: '¡Va en camino!', texto: 'Tu encomienda viaja hacia la ciudad de destino.' },
  EN_REPARTO: { titulo: '¡Sale rumbo a tu puerta!', texto: 'Un mensajero la está llevando a la dirección de entrega.' },
  ENTREGADO: { titulo: '¡Entregada con éxito!', texto: 'Tu encomienda llegó a su destino. ¡Gracias por elegirnos!' },
  NO_ENTREGADO: { titulo: 'Esta vez no pudimos entregarla', texto: 'Volveremos a intentarlo o te contactaremos pronto.' },
  NOVEDAD: { titulo: 'Estamos revisando algo', texto: 'Surgió un inconveniente y lo estamos resolviendo para que siga su camino.' },
  CANCELADO: { titulo: 'Este envío se canceló', texto: 'La guía ya no está activa. Si tienes dudas, escríbenos.' },
}
