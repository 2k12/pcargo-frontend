import { ArrowLeft, FileJson, MessageCircle } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router'
import { BloqueCodigo } from '@/components/BloqueCodigo'
import { Logo } from '@/components/brand/PCargoLogo'
import { EnlaceExterno } from '@/components/EnlaceExterno'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import { destinoEjemplo, ejemploCurl, ejemploFetch, ejemploVerificacionNode, urlBaseIntegraciones } from '@/features/integraciones/domain'
import { MARCA, whatsappUrl } from '@/features/landing/marca'
import { EnlacesLegales } from '@/features/legal/components/EnlacesLegales'
import { lineaCopyright } from '@/features/legal/datos'
import { cn } from '@/lib/utils'
import {
  ejemploCabecerasWebhook,
  ejemploCobertura,
  ejemploCotizacion,
  ejemploCotizarRequest,
  ejemploEnvioApi,
  ejemploError,
  ejemploLote,
  ejemploNuevoEnvio,
  ejemploWebhook,
  ENDPOINTS,
  ERRORES,
  EVENTOS_DOC,
  REINTENTOS,
  SECCIONES,
  TIPOS_CARGA_EJEMPLO,
} from './contenido'

const ANIO = new Date().getFullYear()
const MENSAJE_ACCESO = 'Hola PCargo, quiero integrar mi empresa con la API para registrar envíos desde nuestro sistema.'

function Seccion({ id, children }: { id: (typeof SECCIONES)[number]['id']; children: ReactNode }) {
  const titulo = SECCIONES.find((s) => s.id === id)!.titulo
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="space-y-4">
      <h2 id={`${id}-titulo`}>{titulo}</h2>
      {children}
    </section>
  )
}

/** Tabla simple y legible; en móvil se desplaza en horizontal sin romper la página. */
function Tabla({ etiqueta, columnas, filas }: { etiqueta: string; columnas: string[]; filas: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10" tabIndex={0} role="region" aria-label={etiqueta}>
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            {columnas.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t align-top">
              {f.map((celda, j) => (
                <td key={j} className="px-3 py-2">
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const C = ({ children }: { children: ReactNode }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px] [overflow-wrap:anywhere]">{children}</code>

/** Guía pública de la API para empresas (contrato v10), en español sencillo. */
export function DesarrolladoresPage() {
  useEffect(() => {
    document.title = `API para empresas · ${MARCA.nombre}`
    window.scrollTo?.(0, 0)
    return () => {
      document.title = MARCA.nombre
    }
  }, [])

  const origen = window.location.origin
  const base = urlBaseIntegraciones(origen)
  const opciones = { base, ciudadOrigen: 'Ibarra', destino: destinoEjemplo('Ibarra') }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" aria-label={`${MARCA.nombre} — ir al inicio`}>
            <Logo markClassName="size-8" />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {/* En el teléfono solo «Inicio»: con el texto grande de Android la frase completa ensanchaba la página. */}
            <Button variant="ghost" size="sm" nativeButton={false} aria-label="Volver al inicio" render={<Link to="/" />}>
              <ArrowLeft />
              <span className="sm:hidden">Inicio</span>
              <span className="max-sm:hidden">Volver al inicio</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <article
          className={cn(
            'space-y-12 text-[15px] leading-7',
            '[&_h2]:scroll-mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight',
            '[&_h3]:font-semibold [&_p]:max-w-[70ch] [&_p]:text-pretty',
            '[&_ul]:max-w-[70ch] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:max-w-[70ch] [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
            '[&_p_a]:font-medium [&_p_a]:text-brand-blue-text [&_p_a]:underline [&_p_a]:underline-offset-4',
          )}
        >
          <header className="space-y-4">
            <p className="text-sm font-medium text-brand-blue-text">Desarrolladores</p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">API para empresas</h1>
            <p className="text-muted-foreground">
              Si tienes una tienda en línea o distribuyes productos, puedes registrar tus envíos con {MARCA.nombre} directamente desde
              tu sistema, sin escribirlos a mano en el panel. Te devolvemos el número de guía y el enlace de rastreo, y te avisamos
              cada vez que cambia el estado.
            </p>
            <nav aria-label="Contenido" className="rounded-xl bg-muted p-4 text-sm">
              <p className="mb-2 font-medium">En esta página</p>
              <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {SECCIONES.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="underline-offset-4 hover:underline">
                      {s.titulo}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </header>

          <Seccion id="como-funciona">
            <ol>
              <li>
                <strong>Pide acceso.</strong> Escríbenos por WhatsApp con el nombre de tu empresa, la dirección donde recogemos y la
                ciudad. Creamos tu integración con un remitente fijo: todos tus envíos salen a ese nombre y desde esa ciudad.
              </li>
              <li>
                <strong>Recibe tus API keys.</strong> Te entregamos una key de prueba (<C>pc_test_…</C>) para conectar tu sistema
                sin crear envíos reales y, cuando estés listo, una key en vivo (<C>pc_live_…</C>).
              </li>
              <li>
                <strong>Crea envíos.</strong> Envías el destinatario (con su ciudad), la carga y tu número de pedido. Te respondemos
                con el número de guía, el costo y el enlace de seguimiento.
              </li>
              <li>
                <strong>Recibe avisos.</strong> Si nos das una URL, te enviamos un webhook firmado en cada cambio de estado.
              </li>
            </ol>
            <Button nativeButton={false} render={<EnlaceExterno href={whatsappUrl(MENSAJE_ACCESO)} />}>
              <MessageCircle />
              Pedir acceso por WhatsApp
            </Button>
          </Seccion>

          <Seccion id="autenticacion">
            <p>
              Todas las solicitudes van a <C>{base}</C> y llevan tu key en la cabecera{' '}
              <C>Authorization: Bearer pc_live_…</C>. La key se muestra una sola vez al crearla: guárdala en las variables de
              entorno de tu servidor y nunca la pongas en el navegador ni en una app móvil.
            </p>
            <ul>
              <li>
                Cada key tiene <strong>alcances</strong>: <C>envios:crear</C>, <C>envios:leer</C> y <C>cotizar</C>.
              </li>
              <li>Puedes tener varias keys activas para cambiarlas sin cortar el servicio; una key revocada deja de funcionar al instante.</li>
              <li>Si lo pides, aceptamos solicitudes solo desde las IPs (o rangos CIDR) de tus servidores.</li>
              <li>
                Cada respuesta trae la cabecera <C>X-Request-Id</C>; inclúyela si nos escribes por un problema.
              </li>
              <li>El usuario y la contraseña del panel no sirven en esta API, y la API key no sirve en el panel.</li>
            </ul>
          </Seccion>

          <Seccion id="idempotencia">
            <p>
              <C>POST /envios</C> y <C>POST /envios/lote</C> exigen la cabecera <C>Idempotency-Key</C> (de 1 a 255 caracteres; por
              ejemplo, tu número de pedido). Así, si se corta la conexión y vuelves a enviar lo mismo, no se crea un envío duplicado.
            </p>
            <ul>
              <li>
                Misma clave y mismo body durante 24 h: recibes <strong>la misma respuesta</strong> con la cabecera{' '}
                <C>Idempotent-Replayed: true</C>.
              </li>
              <li>
                Misma clave con otro body: <C>422 IDEMPOTENCIA_CONFLICTO</C>.
              </li>
              <li>
                Misma clave mientras la primera sigue en proceso: <C>409 IDEMPOTENCIA_EN_PROCESO</C> (reintenta en unos segundos).
              </li>
              <li>Las claves son tuyas: otra empresa puede usar la misma sin que se mezclen.</li>
            </ul>
          </Seccion>

          <Seccion id="endpoints">
            <Tabla
              etiqueta="Tabla de endpoints"
              columnas={['Método', 'Ruta', 'Alcance', 'Para qué']}
              filas={ENDPOINTS.map((e) => [
                <C key="m">{e.metodo}</C>,
                <C key="r">{e.ruta}</C>,
                <span key="a" className="text-muted-foreground">
                  {e.alcance}
                </span>,
                e.descripcion,
              ])}
            />
            <p>
              El origen del envío lo define tu integración (nunca el body). La ciudad del destinatario se escribe por su nombre, sin
              importar mayúsculas ni tildes. El número de guía siempre es automático. Los tipos de carga los configura PCargo
              y pueden cambiar: consulta los vigentes, con su precio y peso máximo, en <C>tiposCarga</C> de <C>GET /cobertura</C>{' '}
              (por ejemplo{' '}
              {TIPOS_CARGA_EJEMPLO.map((t, i) => (
                <span key={t}>
                  {i > 0 && ', '}
                  <C>{t}</C>
                </span>
              ))}
              ). Un tipo desactivado responde <C>422 TIPO_CARGA_INACTIVO</C>; <C>pesoKg</C> es el peso por unidad. <C>formaPago</C> es opcional (por defecto, la de tu integración) y{' '}
              <C>zona</C> puede ser <C>URBANA</C> (por defecto) o <C>RURAL</C>. Los precios son los mismos que en ventanilla.
            </p>
            <p>
              <C>referenciaExterna</C> es tu número de pedido: obligatorio, de 1 a 64 caracteres (letras, números y{' '}
              <C>. _ - / #</C>) y único en tu empresa.
            </p>

            <h3>Crear un envío</h3>
            <div className="grid grid-cols-1 gap-3">
              <BloqueCodigo titulo="curl" lenguaje="bash" codigo={ejemploCurl(opciones)} />
              <BloqueCodigo titulo="JavaScript (fetch)" lenguaje="js" codigo={ejemploFetch(opciones)} />
              <BloqueCodigo titulo="Body: NuevoEnvioApi" lenguaje="json" codigo={ejemploNuevoEnvio()} />
              <BloqueCodigo titulo="Respuesta 201: EnvioApi" lenguaje="json" codigo={ejemploEnvioApi(origen)} />
            </div>

            <h3>Cobertura y cotización</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <BloqueCodigo titulo="GET /cobertura" lenguaje="json" codigo={ejemploCobertura()} />
              <BloqueCodigo titulo="POST /cotizar (body)" lenguaje="json" codigo={ejemploCotizarRequest()} />
            </div>
            <BloqueCodigo titulo="Respuesta de /cotizar" lenguaje="json" codigo={ejemploCotizacion()} />

            <h3>Envíos en lote</h3>
            <p>
              <C>{'POST /envios/lote'}</C> recibe <C>{'{ "envios": [ … ] }'}</C> con 1 a 100 envíos. No es todo o nada: cada elemento
              trae su propio resultado.
            </p>
            <BloqueCodigo titulo="Respuesta de /envios/lote" lenguaje="json" codigo={ejemploLote()} />

            <h3>Consultar un envío</h3>
            <p>
              <C>GET /envios/PED-1001</C> devuelve el envío con su <C>historial</C> (estado, nota y fecha de cada cambio). Si la
              referencia no es tuya responde 404.
            </p>
          </Seccion>

          <Seccion id="errores">
            <p>
              Los errores siempre tienen la forma <C>{'{ "error": { "code", "message" } }'}</C>. Usa <C>code</C> en tu programa;{' '}
              <C>message</C> es texto para personas.
            </p>
            <Tabla
              etiqueta="Tabla de códigos de error"
              columnas={['Status', 'code', 'Cuándo']}
              filas={ERRORES.map((e) => [<C key="s">{e.status}</C>, <C key="c">{e.code}</C>, e.cuando])}
            />
            <BloqueCodigo titulo="Ejemplo: referencia repetida (409)" lenguaje="json" codigo={ejemploError()} />
          </Seccion>

          <Seccion id="limites">
            <ul>
              <li>
                <strong>120 solicitudes por minuto</strong> por empresa. Las respuestas traen <C>RateLimit-Limit</C>,{' '}
                <C>RateLimit-Remaining</C> y <C>RateLimit-Reset</C>; al superarlo recibes 429 con <C>Retry-After</C> (segundos).
              </li>
              <li>Body JSON de hasta 1 MB y esquemas estrictos: un campo que no existe se rechaza con 400.</li>
              <li>Hasta 100 envíos por lote; cada envío con 1 a 20 líneas de carga.</li>
              <li>Guardamos un registro de cada solicitud durante 90 días (sin tu key ni el body) para ayudarte a revisar problemas.</li>
            </ul>
          </Seccion>

          <Seccion id="pruebas">
            <p>
              Las keys <C>pc_test_…</C> hacen todas las validaciones y cotizan igual que en vivo, pero <strong>no guardan nada</strong>:
              la respuesta trae <C>"prueba": true</C>, <C>numeroGuia: 0</C> e <C>id</C> con el prefijo <C>prueba_</C>. Por eso{' '}
              <C>GET /envios/:referencia</C> con una key de prueba responde 404, y no se envían webhooks reales (para probar tu URL,
              pídenos un evento de prueba). La idempotencia también funciona en modo prueba.
            </p>
          </Seccion>

          <Seccion id="webhooks">
            <p>
              Si configuramos una URL <C>https://</C> para tu empresa, te enviamos un <C>POST</C> con JSON cada vez que pasa algo con
              uno de tus envíos. Seguimos el estándar{' '}
              <EnlaceExterno href="https://www.standardwebhooks.com/">Standard Webhooks</EnlaceExterno>.
            </p>
            <Tabla
              etiqueta="Tabla de eventos del webhook"
              columnas={['Evento', 'Cuándo']}
              filas={EVENTOS_DOC.map((e) => [<C key="e">{e.evento}</C>, e.cuando])}
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <BloqueCodigo titulo="Cabeceras" lenguaje="http" codigo={ejemploCabecerasWebhook()} />
              <BloqueCodigo titulo="Body" lenguaje="json" codigo={ejemploWebhook()} />
            </div>
            <ul>
              <li>
                <C>webhook-id</C> identifica el mensaje y se repite en los reintentos: úsalo para no procesar dos veces lo mismo.
              </li>
              <li>
                <C>webhook-signature</C> es <C>v1,</C> + base64 de HMAC-SHA256 de <C>{'"<id>.<timestamp>.<body>"'}</C>, con tu secreto{' '}
                <C>whsec_…</C> decodificado de base64. El secreto se muestra una sola vez; si lo pierdes, lo rotamos.
              </li>
              <li>
                Responde 2xx en menos de 10 s. Si no, reintentamos tras {REINTENTOS.join(', ')} (8 intentos en total). No seguimos
                redirecciones.
              </li>
            </ul>
            <BloqueCodigo titulo="Node: verificar webhook-signature" lenguaje="js" codigo={ejemploVerificacionNode()} />
          </Seccion>

          <Seccion id="openapi">
            <p>
              La especificación completa (OpenAPI 3.1) está en <C>{`${base}/openapi.json`}</C>. Puedes importarla en Postman,
              Insomnia o en un generador de clientes.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" nativeButton={false} render={<EnlaceExterno href={`${base}/openapi.json`} />}>
                <FileJson />
                Abrir openapi.json
              </Button>
              <Button variant="ghost" nativeButton={false} render={<EnlaceExterno href={whatsappUrl(MENSAJE_ACCESO)} />}>
                <MessageCircle />
                Hablar con PCargo
              </Button>
            </div>
          </Seccion>
        </article>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{lineaCopyright(ANIO)}</p>
          <EnlacesLegales />
        </div>
      </footer>
    </div>
  )
}
