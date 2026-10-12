import { describe, expect, it } from 'vitest'
import { CON_CONDICIONES, enumerar, faqJsonLd, jsonParaScript, preguntasFrecuentes, PROHIBIDOS, textoRespuesta } from './contenido'

describe('contenido de la landing', () => {
  it('enumera en español', () => {
    expect(enumerar([])).toBe('')
    expect(enumerar(['Ibarra'])).toBe('Ibarra')
    expect(enumerar(['Ibarra', 'Atuntaqui', 'Quito'])).toBe('Ibarra, Atuntaqui y Quito')
  })

  it('el dinero en efectivo encabeza los prohibidos y hay artículos con condiciones', () => {
    expect(PROHIBIDOS[0]!.titulo).toBe('Dinero en efectivo')
    expect(CON_CONDICIONES.map((a) => a.titulo)).toEqual(['Perecibles', 'Líquidos no peligrosos', 'Objetos frágiles'])
  })

  it('sin catálogo usa las ciudades y pesos del contrato', () => {
    const [ciudades, enviar] = preguntasFrecuentes()
    expect(textoRespuesta(ciudades!.respuesta)).toContain('Ibarra, Atuntaqui, Otavalo y Quito')
    expect(textoRespuesta(enviar!.respuesta)).toContain('sobre, hasta 0,5 kg; paquete, hasta 50 kg; cartón, hasta 35 kg; valija, hasta 25 kg')
  })

  it('con catálogo usa solo las ciudades activas y los pesos configurados', () => {
    const [ciudades, enviar] = preguntasFrecuentes({
      ciudades: [
        { id: 1, nombre: 'Ibarra', activa: true },
        { id: 2, nombre: 'Atuntaqui', activa: false },
        { id: 3, nombre: 'Cayambe', activa: true },
      ],
      tiposCarga: [{ codigo: 'SOBRE', nombre: 'Sobre', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 0.75 }],
    })
    expect(textoRespuesta(ciudades!.respuesta)).toContain('Hoy llegamos a Ibarra y Cayambe.')
    expect(textoRespuesta(enviar!.respuesta)).toContain('sobre, hasta 0,75 kg.')
  })

  it('no afirma horarios, plazos de entrega, seguros ni reembolsos', () => {
    const todo = preguntasFrecuentes()
      .map((p) => `${p.pregunta} ${textoRespuesta(p.respuesta)}`)
      .join(' ')
    expect(todo).not.toMatch(/horario|\d+\s*(h|horas|días)\b|seguro|reembols|garantiz/i)
  })

  it('genera el JSON-LD FAQPage con todas las preguntas y escapa «<»', () => {
    const preguntas = preguntasFrecuentes()
    const ld = faqJsonLd(preguntas)
    expect(ld['@type']).toBe('FAQPage')
    expect(ld.mainEntity).toHaveLength(preguntas.length)
    expect(ld.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: '¿A qué ciudades llegan?',
      acceptedAnswer: { '@type': 'Answer', text: textoRespuesta(preguntas[0]!.respuesta) },
    })
    expect(jsonParaScript({ a: '</script>' })).toBe('{"a":"\\u003c/script>"}')
  })
})
