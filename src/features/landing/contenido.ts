import { dependeDeZona, enFrase, pluralizar } from '@/features/envios/domain'
import { enumerar } from '@/lib/format'
import type { ArticuloRestringido, CatalogoPublico, CategoriaArticulo, IconoArticulo, TipoCargaPublico } from '@/types/api'
import { MARCA, whatsappUrl } from './marca'

/*
 * Contenido informativo de la landing: «Qué no transportamos» y «Preguntas frecuentes».
 *
 * REVISIÓN PENDIENTE POR PCARGO: estos textos se redactaron a partir de la guía física de la empresa
 * («NO TRANSPORTAMOS DINERO EN EFECTIVO»), de los términos y condiciones (apartado 6) y de lo que el sistema hace hoy.
 * La empresa debe confirmarlos antes de publicarlos. Las respuestas no afirman horarios, plazos exactos, seguros
 * ni reembolsos: si se añaden, que sea con datos confirmados (ver `marca.ts`, donde un dato sin confirmar es `null`).
 *
 * Desde el contrato v11 «Qué no transportamos» se configura en el panel (`/publico/articulos-restringidos`).
 * Esta lista es solo el respaldo de la landing mientras carga o si la API falla (misma semilla que el backend).
 */

let orden = 0
const base = (categoria: CategoriaArticulo, titulo: string, detalle: string, icono: IconoArticulo | null): ArticuloRestringido => ({
  id: `base-${++orden}`,
  categoria,
  titulo,
  detalle,
  icono,
  activo: true,
  orden,
  actualizadoEn: '2026-10-11T00:00:00.000Z',
  actualizadoPor: null,
})

/** Lista base (semilla v9): 9 prohibidos, 3 con condiciones y 2 notas, coherente con los términos (apartado 6). */
export const ARTICULOS_RESTRINGIDOS_BASE: ArticuloRestringido[] = [
  base('PROHIBIDO', 'Dinero en efectivo', 'Billetes ni monedas, en ninguna cantidad.', 'dinero'),
  base('PROHIBIDO', 'Cheques y títulos valores', 'Cheques, letras, pagarés y otros documentos de valor negociable.', 'documento'),
  base('PROHIBIDO', 'Joyas y metales preciosos', 'Oro, plata, piedras preciosas y alhajas.', 'joya'),
  base('PROHIBIDO', 'Armas y municiones', 'Armas de cualquier tipo, municiones y sus partes.', 'arma'),
  base('PROHIBIDO', 'Explosivos y pirotecnia', 'Pólvora, fuegos artificiales y material explosivo.', 'explosivo'),
  base('PROHIBIDO', 'Sustancias peligrosas', 'Líquidos inflamables, gases, corrosivos y tóxicos.', 'fuego'),
  base('PROHIBIDO', 'Drogas y sustancias fiscalizadas', 'Estupefacientes, psicotrópicos y sustancias sujetas a fiscalización.', 'droga'),
  base('PROHIBIDO', 'Animales vivos', 'Mascotas, aves ni ningún otro animal.', 'animal'),
  base('PROHIBIDO', 'Mercadería ilícita', 'Productos falsificados, de contrabando o de comercio prohibido.', 'prohibido'),
  base('CONDICIONADO', 'Perecibles', 'Solo bien embalados y para entrega en el mismo día.', 'perecible'),
  base('CONDICIONADO', 'Líquidos no peligrosos', 'Solo en envase sellado.', 'liquido'),
  base('CONDICIONADO', 'Objetos frágiles', 'Con embalaje adecuado y declarando el contenido.', 'fragil'),
  base('NOTA', 'Declara siempre el contenido real de tu envío.', 'Podemos pedir revisar un paquete antes de recibirlo.', null),
  base('NOTA', 'No entregamos en apartados postales.', '', null),
]

/** Artículos de una categoría, activos y en su orden. */
export function articulosDe(articulos: ArticuloRestringido[], categoria: CategoriaArticulo): ArticuloRestringido[] {
  return articulos.filter((a) => a.categoria === categoria && a.activo).sort((a, b) => a.orden - b.orden)
}

/** Artículos que PCargo no transporta (respaldo). */
export const PROHIBIDOS = articulosDe(ARTICULOS_RESTRINGIDOS_BASE, 'PROHIBIDO')
/** Artículos que se aceptan solo si cumplen una condición (respaldo). */
export const CON_CONDICIONES = articulosDe(ARTICULOS_RESTRINGIDOS_BASE, 'CONDICIONADO')
/** Texto de una nota: título y detalle en una sola frase (contrato v11: el título tiene como máximo 80 caracteres). */
export const textoNota = (n: Pick<ArticuloRestringido, 'titulo' | 'detalle'>) => (n.detalle.trim() ? `${n.titulo} ${n.detalle.trim()}` : n.titulo)

export const NOTAS_PROHIBIDOS = articulosDe(ARTICULOS_RESTRINGIDOS_BASE, 'NOTA').map(textoNota)

/** Fragmento de una respuesta: texto o enlace. El texto plano (JSON-LD) es la concatenación de los fragmentos. */
export type Fragmento = string | { texto: string; href: string; tipo: 'ancla' | 'ruta' | 'externo' | 'tel' }

export interface PreguntaFrecuente {
  id: string
  pregunta: string
  respuesta: Fragmento[]
}

const CIUDADES_BASE = ['Ibarra', 'Atuntaqui', 'Otavalo', 'Quito']
/** Tipos de la semilla del contrato (v8), por si el catálogo aún no cargó. */
const TIPOS_BASE: Pick<TipoCargaPublico, 'nombre' | 'pesoMaxKg' | 'precio' | 'precioRural'>[] = [
  { nombre: 'Sobre', pesoMaxKg: 0.5, precio: 3, precioRural: null },
  { nombre: 'Paquete', pesoMaxKg: 50, precio: 3, precioRural: null },
  { nombre: 'Cartón', pesoMaxKg: 35, precio: 3, precioRural: null },
  { nombre: 'Valija', pesoMaxKg: 25, precio: 3, precioRural: null },
  { nombre: 'Rollo de tela', pesoMaxKg: 50, precio: 1.25, precioRural: 1.5 },
  { nombre: 'Plumón pequeño', pesoMaxKg: 50, precio: 3, precioRural: null },
  { nombre: 'Plumón grande', pesoMaxKg: 50, precio: 4, precioRural: null },
]

const kg = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 })

export { enumerar }

/**
 * Preguntas frecuentes. Con el catálogo público, las ciudades y los pesos máximos salen de la configuración real;
 * sin él, se usan los valores del contrato de la API.
 */
export function preguntasFrecuentes(
  catalogo?: Pick<CatalogoPublico, 'ciudades' | 'tiposCarga'>,
  articulos?: ArticuloRestringido[],
): PreguntaFrecuente[] {
  const ciudades = catalogo?.ciudades.filter((c) => c.activa).map((c) => c.nombre) ?? []
  const tipos = catalogo?.tiposCarga.length ? catalogo.tiposCarga : TIPOS_BASE
  const conZona = tipos.filter(dependeDeZona).map((t) => pluralizar(enFrase(t.nombre)))
  const queEnviar = enumerar(tipos.map((t) => pluralizar(enFrase(t.nombre))))
  const prohibidos = articulos ? articulosDe(articulos, 'PROHIBIDO').map((a) => enFrase(a.titulo)) : []
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
        `${queEnviar.charAt(0).toUpperCase()}${queEnviar.slice(1)}. Cada unidad tiene un peso máximo: ${tipos
          .map((t) => `${enFrase(t.nombre)}, hasta ${kg.format(t.pesoMaxKg)} kg`)
          .join('; ')}. Revisa también `,
        { texto: 'qué no transportamos', href: '#prohibidos', tipo: 'ancla' },
        '.',
      ],
    },
    {
      id: 'precio',
      pregunta: '¿Cuánto cuesta enviar?',
      respuesta: [
        `Pagas por unidad según el tipo de encomienda, con el mismo precio en todas las rutas y sin recargo por peso dentro del máximo de cada tipo. ${
          conZona.length
            ? `La zona de entrega (urbana o rural) solo cambia el precio de: ${enumerar(conZona)}. `
            : 'La zona de entrega (urbana o rural) no cambia el precio. '
        }El valor definitivo es el de tu guía. `,
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
        prohibidos.length
          ? `No transportamos ${enumerar(prohibidos)}. `
          : 'No transportamos dinero en efectivo, cheques ni títulos valores, joyas, armas, explosivos, sustancias peligrosas o fiscalizadas, animales vivos ni mercadería ilícita. ',
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
