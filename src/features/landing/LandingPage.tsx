import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  HandCoins,
  LogIn,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  PackageSearch,
  Phone,
  Search,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react'
import { lazy, Suspense, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Logo, LogoMark } from '@/components/brand/PCargoLogo'
import { EnlaceExterno } from '@/components/EnlaceExterno'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { precioDesde, precioTipoTexto } from '@/features/envios/domain'
import { TIPO_CARGA_ICON } from '@/features/envios/ui'
import { formatCurrency, formatDuracion } from '@/lib/format'
import { cn } from '@/lib/utils'
import { responderAgente, useHerramientasAgente } from '@/lib/webmcp'
import type { TipoCargaCodigo } from '@/types/api'
import { MENSAJE_GUIA_INVALIDA, normalizarGuia } from '@/features/envios/guia'
import { EnlacesLegales } from '@/features/legal/components/EnlacesLegales'
import { lineaCopyright } from '@/features/legal/datos'
import { consultarGuiaParaAgente, HERRAMIENTAS_PUBLICAS } from './agente'
import { useCatalogoPublico } from './api'
import { CarruselCiudades } from './components/CarruselCiudades'
import { matrizRutas, resumenCobertura } from './cobertura'
import { MenuMovil, WhatsAppFlotante } from './components/MenuMovil'
import { TablaPrecios } from './components/TablaPrecios'
import { HeroPaisaje } from './ilustraciones/HeroPaisaje'
import { MapaCobertura } from './ilustraciones/MapaCobertura'
import { MARCA, whatsappUrl } from './marca'

// Bajo el pliegue y con Select (Base UI + floating-ui): se descarga aparte para no retrasar el primer pintado.
const CotizadorPublico = lazy(() => import('./components/CotizadorPublico').then((m) => ({ default: m.CotizadorPublico })))

const ANIO = new Date().getFullYear()

const NAV = [
  { href: '#servicios', label: 'Servicios' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#cobertura', label: 'Cobertura' },
  { href: '#cotizar', label: 'Cotizar' },
  { href: '#contacto', label: 'Contacto' },
]

const DESCRIPCION_CARGA: Record<TipoCargaCodigo, string> = {
  SOBRE: 'Documentos, cartas, contratos y trámites.',
  PAQUETE: 'Compras, ropa, repuestos y pedidos de tu tienda en línea.',
  CARTON: 'Cajas de mercadería, textiles y productos para tu negocio.',
  VALIJA: 'Equipaje y maletas que viajan sin ti, de puerta a puerta.',
  TELA: 'Rollos de tela para talleres, almacenes y confeccionistas.',
  PLUMON_PEQUENO: 'Plumones de tamaño pequeño, empacados para el viaje.',
  PLUMON_GRANDE: 'Plumones de tamaño grande, empacados para el viaje.',
}

const PASOS = [
  { icon: Store, titulo: 'Deja o agenda tu envío', texto: 'Acércate a nuestra oficina en Ibarra o escríbenos por WhatsApp para coordinar tu envío.' },
  { icon: PackageCheck, titulo: 'Recibe tu guía', texto: 'Te entregamos tu guía con su número de seguimiento y el costo calculado con los precios publicados.' },
  { icon: Truck, titulo: 'Entregamos a domicilio', texto: 'Llevamos tu encomienda hasta la puerta del destinatario y puedes seguirla en línea.' },
]

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MARCA.oficina.direccion)}`

function Seccion({ id, titulo, subtitulo, children, className }: { id?: string; titulo: string; subtitulo?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('scroll-mt-20 py-16 sm:py-24', className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{titulo}</h2>
          {subtitulo && <p className="text-muted-foreground text-pretty">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

function Rastreador({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [guia, setGuia] = useState('')
  const [invalido, setInvalido] = useState(false)
  const buscar = (e: FormEvent) => {
    e.preventDefault()
    if (!guia.trim()) return
    const n = normalizarGuia(guia)
    setInvalido(n === null)
    responderAgente(e, () => (n ? consultarGuiaParaAgente(n) : MENSAJE_GUIA_INVALIDA))
    if (n) navigate(`/seguimiento/${n}`)
  }
  return (
    <form
      onSubmit={buscar}
      id="rastrear"
      toolname="ver_seguimiento"
      tooldescription="Abre la página de seguimiento de una encomienda de PCargo a partir de su número de guía."
      toolautosubmit=""
      className={cn('scroll-mt-24 space-y-3 rounded-2xl border bg-card p-5 shadow-lg sm:p-6', className)}>
      <div className="space-y-1">
        <p className="font-medium">Rastrea tu encomienda</p>
        <p className="text-sm text-muted-foreground">Ingresa el número de tu guía (con o sin ceros adelante).</p>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <PackageSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="numeroGuia"
            toolparamdescription="Número de guía: solo dígitos; los ceros a la izquierda no cuentan."
            aria-label="Número de guía"
            aria-invalid={invalido}
            inputMode="numeric"
            autoComplete="off"
            className="h-10 pl-8 font-mono"
            placeholder="N.º de guía"
            value={guia}
            onChange={(e) => {
              setGuia(e.target.value)
              setInvalido(false)
            }}
          />
        </div>
        <Button type="submit" size="lg" className="h-10">
          <Search /> Rastrear
        </Button>
      </div>
      {invalido && (
        <p role="alert" className="text-xs text-destructive">
          {MENSAJE_GUIA_INVALIDA}
        </p>
      )}
    </form>
  )
}

/** Avisos flotantes sobre la ilustración: muestran cómo se ve el seguimiento (ejemplo ilustrativo). */
function AvisosHero() {
  return (
    <div aria-hidden="true">
      <div className="absolute top-[8%] left-[4%] flex items-center gap-2.5 rounded-xl border bg-card/95 px-3 py-2 shadow-md backdrop-blur sm:left-[-4%]">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Truck className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="font-mono text-[11px] text-muted-foreground">Ejemplo · Guía 0040425</p>
          <p className="text-xs font-medium">En reparto · Otavalo</p>
        </div>
      </div>
      <div className="absolute right-[4%] bottom-[30%] flex items-center gap-2.5 rounded-xl border bg-card/95 px-3 py-2 shadow-md backdrop-blur sm:right-[-3%]">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-green text-brand-green-foreground">
          <Check className="size-4" strokeWidth={3} />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-medium">Entregado</p>
          <p className="text-[11px] text-muted-foreground">en la puerta del destinatario</p>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const { data: catalogo, isLoading } = useCatalogoPublico()
  useHerramientasAgente(HERRAMIENTAS_PUBLICAS)
  // Menor precio base publicado (el de mayoreo no cuenta: exige más de 50 rollos).
  const desde = catalogo ? precioDesde(catalogo.tiposCarga) : null
  const ciudadesTexto = catalogo ? resumenCobertura(catalogo.ciudades, catalogo.rutas, MARCA.oficina.ciudad) : ''

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#inicio" aria-label={`${MARCA.nombre} — inicio`}>
            <Logo className="text-lg" markClassName="size-9" />
          </a>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Secciones">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button className="hidden sm:inline-flex" nativeButton={false} render={<Link to="/login" />}>
              <LogIn /> Acceso del personal
            </Button>
            <MenuMovil secciones={NAV} />
          </div>
        </div>
      </header>

      <main id="inicio">
        {/* Portada */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--brand-blue)_14%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_right,color-mix(in_oklch,var(--brand-green)_18%,transparent),transparent_55%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pb-24">
            <div className="space-y-6">
              <Badge variant="secondary" className="min-h-5 gap-1.5" render={<a href="#cobertura" />}>
                <MapPin className="size-3" /> {ciudadesTexto || 'Cobertura en el norte del Ecuador'}
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Tus encomiendas,{' '}
                <span className="text-brand-blue-text">
                  puerta a puerta<span className="text-brand-green-text">.</span>
                </span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground text-pretty">
                Somos una empresa de Ibarra. Llevamos sobres, paquetes, cartones, valijas, rollos de tela y plumones
                hasta el domicilio de tu destinatario, con precio claro y seguimiento en línea.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" nativeButton={false} render={<a href="#cotizar" />}>
                  Cotizar mi envío <ArrowRight />
                </Button>
                <Button size="lg" variant="outline" nativeButton={false} render={<EnlaceExterno href={whatsappUrl()} />}>
                  <MessageCircle /> Escríbenos por WhatsApp
                </Button>
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {['Oficina física en Ibarra', 'Pago al cobro disponible', 'Precios publicados'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <BadgeCheck className="size-4 text-brand-blue-text" /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="relative">
                <HeroPaisaje className="h-auto w-full drop-shadow-xl" />
                <AvisosHero />
              </div>
              <Rastreador className="relative mx-auto -mt-6 w-[94%]" />
            </div>
          </div>
        </section>

        {/* Cifras reales del servicio */}
        <section className="border-y bg-muted/30">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-8 sm:px-6 md:grid-cols-4">
            {[
              { icon: MapPin, k: 'Ciudades de cobertura', v: catalogo ? String(catalogo.ciudades.length) : '—' },
              { icon: Truck, k: 'Rutas directas', v: catalogo ? String(catalogo.rutas.length) : '—' },
              { icon: HandCoins, k: 'Envíos desde', v: desde !== null ? formatCurrency(desde) : '—' },
              { icon: PackageSearch, k: 'Seguimiento', v: 'En línea' },
            ].map((s) => (
              // <dl> solo admite <div> con <dt>/<dd> dentro: el icono va dentro del <dt> (árbol accesible válido).
              <div key={s.k} className="relative space-y-0.5 pl-12">
                <dt className="text-sm text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-0 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                  >
                    <s.icon className="size-4" />
                  </span>
                  {s.k}
                </dt>
                <dd className="text-2xl font-semibold tracking-tight">{s.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Servicios */}
        <Seccion id="servicios" titulo="Lo que transportamos" subtitulo="Cada tipo de encomienda tiene su precio por unidad y su peso máximo.">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {(catalogo?.tiposCarga ?? []).map((t) => {
              const Icon = TIPO_CARGA_ICON[t.codigo]
              return (
                <article key={t.codigo} className="space-y-3 rounded-2xl border bg-card p-4 max-lg:last:odd:col-span-2 sm:space-y-4 sm:p-6">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="font-semibold">{t.nombre}</h3>
                    <p className="text-xs text-muted-foreground sm:text-sm">{DESCRIPCION_CARGA[t.codigo]}</p>
                  </div>
                  <p className="text-xs font-medium text-brand-blue-text">
                    {precioTipoTexto(t)} c/u · hasta {t.pesoMaxKg} kg
                  </p>
                </article>
              )
            })}
            {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
          </div>
        </Seccion>

        {/* Cómo funciona */}
        <Seccion id="como-funciona" titulo="Así de simple" subtitulo="De tu mano a la puerta de quien lo recibe, en tres pasos." className="bg-muted/30">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <ol className="relative space-y-8">
              {/* línea que une los pasos (continuidad) */}
              <span aria-hidden="true" className="absolute top-5 bottom-5 left-5 w-0.5 -translate-x-1/2 bg-brand-green/50" />
              {PASOS.map((p, i) => (
                <li key={p.titulo} className="relative flex gap-4">
                  <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-brand-green bg-background">
                    <p.icon className="size-4" />
                  </span>
                  <div className="space-y-1 pt-1.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Paso {i + 1}</p>
                    <h3 className="font-semibold">{p.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
            <img
              src="/landing/entrega-1600.webp"
              srcSet="/landing/entrega-640.webp 640w, /landing/entrega-800.webp 800w, /landing/entrega-1600.webp 1600w"
              sizes="(min-width: 1024px) 560px, 100vw"
              width={1600}
              height={1065}
              loading="lazy"
              decoding="async"
              alt="Un repartidor con uniforme azul entrega una caja de cartón a una clienta en la puerta de su casa. Un globo dice: ¡Entregado! En la puerta de tu casa."
              className="h-auto w-full rounded-3xl shadow-xl ring-1 ring-foreground/10"
            />
          </div>
        </Seccion>

        {/* Cobertura y tarifas */}
        <Seccion
          id="cobertura"
          titulo="Cobertura y tarifas"
          subtitulo="Pagas por unidad según lo que envías, con el mismo precio en todas las rutas. Entregas urbanas dentro de cada ciudad e interurbanas en ambos sentidos."
        >
          {catalogo ? (
            <div className="space-y-10">
              <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-3">
                  <h3 className="font-semibold">Precios por unidad</h3>
                  <TablaPrecios tipos={catalogo.tiposCarga} />
                </div>
                <MapaCobertura ciudades={catalogo.ciudades} rutas={catalogo.rutas} />
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Tiempos estimados por trayecto</h3>
                <div className="overflow-x-auto rounded-2xl border">
                  <table className="w-full min-w-[520px] text-sm">
                    <caption className="sr-only">Tiempo estimado de entrega por trayecto (origen en filas, destino en columnas)</caption>
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th scope="col" className="p-4 text-left font-medium text-muted-foreground">Desde \ Hasta</th>
                        {catalogo.ciudades.map((c) => (
                          <th key={c.id} scope="col" className="p-4 text-left font-medium">{c.nombre}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrizRutas(catalogo.ciudades, catalogo.rutas).map((fila) => (
                        <tr key={fila[0]!.origen.id} className="border-b last:border-0">
                          <th scope="row" className="p-4 text-left font-medium">{fila[0]!.origen.nombre}</th>
                          {fila.map(({ destino, ruta }) => (
                            <td key={destino.id} className="p-4">
                              {ruta ? (
                                <span className="flex items-center gap-1.5 tabular-nums">
                                  <Clock aria-hidden="true" className="size-3.5 text-muted-foreground" />
                                  {formatDuracion(ruta.tiempoEstimadoMin)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  <span aria-hidden="true">—</span>
                                  <span className="sr-only">Sin ruta</span>
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <Skeleton className="h-64 rounded-2xl" />
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Precios en USD por unidad, iguales en cualquier ruta y sin recargo por peso dentro del máximo de cada tipo. La zona
            rural solo cambia el precio del rollo de tela. El valor definitivo es el de tu guía, con las piezas y la zona de
            entrega verificadas en la oficina. Los tiempos son estimados y pueden variar.
          </p>
        </Seccion>

        {/* Cotizador */}
        <Seccion id="cotizar" titulo="Cotiza en segundos" subtitulo="Calcula el precio referencial de tu envío antes de venir." className="bg-muted/30">
          {catalogo ? (
            <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
              <CotizadorPublico catalogo={catalogo} />
            </Suspense>
          ) : (
            <Skeleton className="h-80 rounded-2xl" />
          )}
        </Seccion>

        {/* Confianza */}
        <Seccion titulo="¿Por qué PCargo?" subtitulo="Somos una empresa de Ibarra, con oficina física y precios a la vista.">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: ShieldCheck, t: 'Precios publicados', d: 'El precio se calcula con la tabla de precios de esta página. Pagas al registrar el envío o lo paga el destinatario al recibirlo.' },
              { icon: PackageSearch, t: 'Seguimiento en línea', d: 'Cada cambio de estado que registramos aparece en el seguimiento con tu número de guía.' },
              { icon: MapPin, t: 'Entrega a domicilio', d: 'Llevamos la encomienda a la dirección del destinatario. Si una entrega no se concreta, el motivo queda en el seguimiento.' },
            ].map((x) => (
              <div key={x.t} className="space-y-3 rounded-2xl border bg-card p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <x.icon className="size-5" />
                </span>
                <h3 className="font-semibold">{x.t}</h3>
                <p className="text-sm text-muted-foreground">{x.d}</p>
              </div>
            ))}
          </div>
        </Seccion>

        {/* Contacto */}
        <Seccion id="contacto" titulo="Contáctanos" subtitulo={`Visítanos en nuestra oficina principal en ${MARCA.oficina.ciudad}.`} className="bg-muted/30">
          <div className={cn('grid gap-4 sm:grid-cols-2', MARCA.oficina.horario && MARCA.email && 'lg:grid-cols-4')}>
            <div className="space-y-2 rounded-2xl border bg-card p-6">
              <MapPin className="size-4 text-brand-blue-text" />
              <p className="text-sm font-medium">Oficina</p>
              <address className="text-sm text-muted-foreground not-italic">{MARCA.oficina.direccion}</address>
              <EnlaceExterno
                href={mapsUrl}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue-text hover:underline"
              >
                <Navigation className="size-3.5" /> Cómo llegar en Google Maps
              </EnlaceExterno>
            </div>
            <div className="space-y-2 rounded-2xl border bg-card p-6">
              <Phone className="size-4 text-brand-blue-text" />
              <p className="text-sm font-medium">Teléfonos</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  Fijo:{' '}
                  <a href={`tel:${MARCA.telefonos.fijo.tel}`} className="hover:text-foreground">
                    {MARCA.telefonos.fijo.texto}
                  </a>
                </li>
                <li>
                  Celular:{' '}
                  <a href={`tel:${MARCA.telefonos.celular.tel}`} className="hover:text-foreground">
                    {MARCA.telefonos.celular.texto}
                  </a>
                </li>
              </ul>
              <EnlaceExterno
                href={whatsappUrl()}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue-text hover:underline"
              >
                <MessageCircle className="size-3.5" /> Escríbenos por WhatsApp
              </EnlaceExterno>
            </div>
            {MARCA.oficina.horario && (
              <div className="space-y-2 rounded-2xl border bg-card p-6">
                <Clock className="size-4 text-brand-blue-text" />
                <p className="text-sm font-medium">Horario</p>
                <p className="text-sm text-muted-foreground">{MARCA.oficina.horario}</p>
              </div>
            )}
            {MARCA.email && (
              <div className="space-y-2 rounded-2xl border bg-card p-6">
                <Mail className="size-4 text-brand-blue-text" />
                <p className="text-sm font-medium">Correo</p>
                <a href={`mailto:${MARCA.email}`} className="text-sm break-all text-muted-foreground hover:text-foreground">
                  {MARCA.email}
                </a>
              </div>
            )}
          </div>
        </Seccion>

        {/* Acceso del personal */}
        <section className="px-4 py-16 sm:px-6">
          <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl bg-[image:var(--brand-gradient)] px-6 py-10 text-white sm:flex-row sm:items-center sm:px-10">
            <LogoMark className="pointer-events-none absolute -right-6 -bottom-8 size-40 opacity-15" />
            <div className="relative space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">¿Eres parte del equipo PCargo?</h2>
              <p className="text-sm">Ingresa al panel de operaciones para registrar y gestionar envíos.</p>
            </div>
            <Button size="lg" className="relative bg-brand-green text-brand-green-foreground hover:bg-brand-green/90" nativeButton={false} render={<Link to="/login" />}>
              <LogIn /> Acceso del personal
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        {/* Datos de PCargo a la izquierda; a la derecha, centradas verticalmente, las ciudades con cobertura. */}
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10 sm:px-6">
          <div className="space-y-3">
            <Logo markClassName="size-8" />
            <p>{MARCA.oficina.direccion}</p>
            <p>
              <a href={`tel:${MARCA.telefonos.fijo.tel}`} className="hover:text-foreground">{MARCA.telefonos.fijo.texto}</a>
              {' · '}
              <a href={`tel:${MARCA.telefonos.celular.tel}`} className="hover:text-foreground">{MARCA.telefonos.celular.texto}</a>
            </p>
            <div className="flex gap-4">
              <Link to="/seguimiento" className="hover:text-foreground">Rastrear envío</Link>
              <Link to="/login" className="hover:text-foreground">Acceso del personal</Link>
            </div>
          </div>
          <CarruselCiudades ciudades={catalogo?.ciudades ?? []} />
        </div>
        {/* Franja legal: identidad del negocio a la izquierda y políticas a la derecha. El espacio inferior extra en
            móvil deja libre el botón flotante de WhatsApp. */}
        <div className="border-t">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pt-5 pb-24 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pb-5">
            <p>{lineaCopyright(ANIO)}</p>
            <EnlacesLegales />
          </div>
        </div>
      </footer>

      <WhatsAppFlotante />
    </div>
  )
}
