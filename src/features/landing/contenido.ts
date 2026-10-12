import {
  Apple,
  Ban,
  Banknote,
  Bomb,
  Crosshair,
  Droplets,
  Flame,
  Gem,
  PawPrint,
  Pill,
  ReceiptText,
  Wine,
  type LucideIcon,
} from 'lucide-react'
import type { CatalogoPublico } from '@/types/api'
import { MARCA, whatsappUrl } from './marca'

/*
 * Contenido informativo de la landing: «Qué no transportamos» y «Preguntas frecuentes».
 *
 * REVISIÓN PENDIENTE POR PCARGO: estos textos se redactaron a partir de la guía física de la empresa
 * («NO TRANSPORTAMOS DINERO EN EFECTIVO»), de los términos y condiciones (apartado 6) y de lo que el sistema hace hoy.
 * La empresa debe confirmarlos antes de publicarlos. Las respuestas no afirman horarios, plazos exactos, seguros
 * ni reembolsos: si se añaden, que sea con datos confirmados (ver `marca.ts`, donde un dato sin confirmar es `null`).
 */

export interface ArticuloRestringido {
  icon: LucideIcon
  titulo: string
  detalle: string
}

/** Artículos que PCargo no transporta (coherente con los términos y condiciones, apartado 6). */
export const PROHIBIDOS: ArticuloRestringido[] = [
  { icon: Banknote, titulo: 'Dinero en efectivo', detalle: 'Billetes ni monedas, en ninguna cantidad.' },
  { icon: ReceiptText, titulo: 'Cheques y títulos valores', detalle: 'Cheques, letras, pagarés y otros documentos de valor negociable.' },
  { icon: Gem, titulo: 'Joyas y metales preciosos', detalle: 'Oro, plata, piedras preciosas y alhajas.' },
  { icon: Crosshair, titulo: 'Armas y municiones', detalle: 'Armas de cualquier tipo, municiones y sus partes.' },
  { icon: Bomb, titulo: 'Explosivos y pirotecnia', detalle: 'Pólvora, fuegos artificiales y material explosivo.' },
  { icon: Flame, titulo: 'Sustancias peligrosas', detalle: 'Líquidos inflamables, gases, corrosivos y tóxicos.' },
  { icon: Pill, titulo: 'Drogas y sustancias fiscalizadas', detalle: 'Estupefacientes, psicotrópicos y sustancias sujetas a fiscalización.' },
  { icon: PawPrint, titulo: 'Animales vivos', detalle: 'Mascotas, aves ni ningún otro animal.' },
  { icon: Ban, titulo: 'Mercadería ilícita', detalle: 'Productos falsificados, de contrabando o de comercio prohibido.' },
]

/** Artículos que se aceptan solo si cumplen una condición. */
export const CON_CONDICIONES: ArticuloRestringido[] = [
  { icon: Apple, titulo: 'Perecibles', detalle: 'Solo bien embalados y para entrega en el mismo día.' },
  { icon: Droplets, titulo: 'Líquidos no peligrosos', detalle: 'Solo en envase sellado.' },
  { icon: Wine, titulo: 'Objetos frágiles', detalle: 'Con embalaje adecuado y declarando el contenido.' },
]

export const NOTAS_PROHIBIDOS = [
  'Declara siempre el contenido real de tu envío. Podemos pedir revisar un paquete antes de recibirlo.',
  'No entregamos en apartados postales.',
] as const

/** Fragmento de una respuesta: texto o enlace. El texto plano (JSON-LD) es la concatenación de los fragmentos. */
export type Fragmento = string | { texto: string; href: string; tipo: 'ancla' | 'ruta' | 'externo' | 'tel' }

export interface PreguntaFrecuente {
  id: string
  pregunta: string
  respuesta: Fragmento[]
}

const CIUDADES_BASE = ['Ibarra', 'Atuntaqui', 'Otavalo', 'Quito']
/** Pesos máximos del contrato de la API (v8), por si el catálogo aún no cargó. */
const PESOS_BASE: { nombre: string; pesoMaxKg: number }[] = [
  { nombre: 'Sobre', pesoMaxKg: 0.5 },
  { nombre: 'Paquete', pesoMaxKg: 50 },
  { nombre: 'Cartón', pesoMaxKg: 35 },
  { nombre: 'Valija', pesoMaxKg: 25 },
  { nombre: 'Rollo de tela', pesoMaxKg: 50 },
  { nombre: 'Plumón pequeño', pesoMaxKg: 50 },
  { nombre: 'Plumón grande', pesoMaxKg: 50 },
]

const kg = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 })

/** «A, B, C y D». */
export function enumerar(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`
}

/**
 * Preguntas frecuentes. Con el catálogo público, las ciudades y los pesos máximos salen de la configuración real;
 * sin él, se usan los valores del contrato de la API.
 */
export function preguntasFrecuentes(catalogo?: Pick<CatalogoPublico, 'ciudades' | 'tiposCarga'>): PreguntaFrecuente[] {
  const ciudades = catalogo?.ciudades.filter((c) => c.activa).map((c) => c.nombre) ?? []
  const pesos = catalogo?.tiposCarga.length ? catalogo.tiposCarga : PESOS_BASE
  const { fijo, celular } = MARCA.telefonos

  return [
    {
      id: 'ciudades',
      pregunta: '¿A qué ciudades llegan?',
      respuesta: [
        `Hoy llegamos a ${enumerar(ciudades.length ? ciudades : CIUDADES_BASE)}. Hacemos entregas urbanas dentro de cada ciudad e interurbanas entre ellas, en ambos sentidos. `,
        { texto: 'Ver cobertura y tiempos estimados', href: '#cobertura', tipo: 'ancla' },
        '.',
      ],
    },
    {
      id: 'que-enviar',
      pregunta: '¿Qué puedo enviar?',
      respuesta: [
        `Sobres, paquetes, cartones, valijas, rollos de tela y plumones. Cada unidad tiene un peso máximo: ${pesos
          .map((t) => `${t.nombre.toLowerCase()}, hasta ${kg.format(t.pesoMaxKg)} kg`)
          .join('; ')}. Revisa también `,
        { texto: 'qué no transportamos', href: '#prohibidos', tipo: 'ancla' },
        '.',
      ],
    },
    {
      id: 'precio',
      pregunta: '¿Cuánto cuesta enviar?',
      respuesta: [
        'Pagas por unidad según el tipo de encomienda, con el mismo precio en todas las rutas y sin recargo por peso dentro del máximo de cada tipo. La zona de entrega (urbana o rural) solo cambia el precio del rollo de tela. El valor definitivo es el de tu guía. ',
        { texto: 'Cotiza tu envío', href: '#cotizar', tipo: 'ancla' },
        '.',
      ],
    },
    {
      id: 'rastreo',
      pregunta: '¿Cómo rastreo mi envío?',
      respuesta: [
        'Con el número de tu guía, en la página de ',
        { texto: 'seguimiento', href: '/seguimiento', tipo: 'ruta' },
        '. Los ceros de adelante no importan: 0040425 y 40425 son la misma guía. Verás el estado y el historial del envío, sin datos personales.',
      ],
    },
    {
      id: 'pago-al-cobro',
      pregunta: '¿Puede pagar quien recibe?',
      respuesta: [
        'Sí. Con el pago al cobro, el destinatario paga el valor del envío al recibir la encomienda. Solo cobramos el transporte, no el precio de lo que se envía. Más detalles en la ',
        { texto: 'política de pago al cobro', href: '/pago-al-cobro', tipo: 'ruta' },
        '.',
      ],
    },
    {
      id: 'sin-receptor',
      pregunta: '¿Qué pasa si no hay nadie para recibir?',
      respuesta: [
        'El envío queda como «No entregado» con el motivo, que puedes ver en el seguimiento, y coordinamos un nuevo intento de entrega. Para coordinarlo, ',
        { texto: 'escríbenos por WhatsApp', href: whatsappUrl('Hola PCargo, quiero coordinar la entrega de mi guía N.º '), tipo: 'externo' },
        ' con tu número de guía.',
      ],
    },
    {
      id: 'prueba-entrega',
      pregunta: '¿Cómo sé que entregaron mi envío?',
      respuesta: [
        'Quien recibe firma la guía, y guardamos una foto de la guía firmada junto con su nombre como prueba de entrega. En el seguimiento verás el estado «Entregado».',
      ],
    },
    {
      id: 'prohibidos',
      pregunta: '¿Qué no transportan?',
      respuesta: [
        'No transportamos dinero en efectivo, cheques ni títulos valores, joyas, armas, explosivos, sustancias peligrosas o fiscalizadas, animales vivos ni mercadería ilícita. ',
        { texto: 'Ver la lista completa', href: '#prohibidos', tipo: 'ancla' },
        '.',
      ],
    },
    {
      id: 'solicitar',
      pregunta: '¿Cómo solicito un envío?',
      respuesta: [
        `Acércate a nuestra oficina en ${MARCA.oficina.ciudad}, `,
        { texto: 'escríbenos por WhatsApp', href: whatsappUrl(), tipo: 'externo' },
        ' o llámanos al ',
        { texto: celular.texto, href: `tel:${celular.tel}`, tipo: 'tel' },
        ' o al ',
        { texto: fijo.texto, href: `tel:${fijo.tel}`, tipo: 'tel' },
        ' para coordinar tu envío.',
      ],
    },
  ]
}

/** Texto plano de una respuesta (para JSON-LD y lectores sin estilos). */
export function textoRespuesta(respuesta: Fragmento[]): string {
  return respuesta.map((f) => (typeof f === 'string' ? f : f.texto)).join('')
}

/** Datos estructurados schema.org `FAQPage`, generados desde las mismas preguntas que se muestran. */
export function faqJsonLd(preguntas: PreguntaFrecuente[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: preguntas.map((p) => ({
      '@type': 'Question',
      name: p.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: textoRespuesta(p.respuesta) },
    })),
  }
}

/** Serializa JSON para un `<script>` sin permitir cerrar la etiqueta desde el contenido. */
export function jsonParaScript(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, '\\u003c')
}
