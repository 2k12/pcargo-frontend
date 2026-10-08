import {
  ArrowRight,
  Clock,
  LogIn,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  PackageSearch,
  Phone,
  Search,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Logo } from '@/components/brand/PCargoLogo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TIPO_CARGA_ICON } from '@/features/envios/ui'
import { listaCiudades } from '@/features/rutas/hooks'
import { formatCurrency, formatDuracion } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TipoCargaCodigo } from '@/types/api'
import { useCatalogoPublico } from './api'
import { matrizTarifas, tarifaDesde } from './cobertura'
import { CotizadorPublico } from './components/CotizadorPublico'
import { MARCA, whatsappUrl } from './marca'

const ANIO = new Date().getFullYear()

const NAV = [
  { href: '#servicios', label: 'Servicios' },
  { href: '#cobertura', label: 'Cobertura' },
  { href: '#cotizar', label: 'Cotizar' },
  { href: '#contacto', label: 'Contacto' },
]

const DESCRIPCION_CARGA: Record<TipoCargaCodigo, string> = {
  SOBRE: 'Documentos, cartas, contratos y trámites que necesitan llegar hoy.',
  PAQUETE: 'Compras, ropa, repuestos y pedidos de tu tienda en línea.',
  CARTON: 'Cajas de mercadería, textiles y productos para tu negocio.',
  VALIJA: 'Equipaje y maletas que viajan sin ti, de puerta a puerta.',
}

const PASOS = [
  { icon: Store, titulo: 'Deja o agenda tu envío', texto: 'Acércate a nuestra oficina o escríbenos por WhatsApp y retiramos tu encomienda.' },
  { icon: PackageCheck, titulo: 'Recibe tu código', texto: 'Te entregamos un código de seguimiento PC-XXXXXXXX con el costo exacto.' },
  { icon: Truck, titulo: 'Entregamos a domicilio', texto: 'Llevamos tu encomienda hasta la puerta del destinatario y puedes seguirla en línea.' },
]

function Seccion({ id, titulo, subtitulo, children, className }: { id?: string; titulo: string; subtitulo?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('scroll-mt-20 py-16 sm:py-24', className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{titulo}</h2>
          {subtitulo && <p className="text-muted-foreground">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

function Rastreador() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const buscar = (e: FormEvent) => {
    e.preventDefault()
    const c = codigo.trim().toUpperCase()
    if (c) navigate(`/seguimiento/${c}`)
  }
  return (
    <form onSubmit={buscar} id="rastrear" className="scroll-mt-24 space-y-3 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="space-y-1">
        <p className="font-medium">Rastrea tu encomienda</p>
        <p className="text-sm text-muted-foreground">Ingresa el código que recibiste al enviar.</p>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <PackageSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Código de seguimiento"
            className="h-10 pl-8 font-mono uppercase"
            placeholder="PC-XXXXXXXX"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="h-10">
          <Search /> Rastrear
        </Button>
      </div>
    </form>
  )
}

export function LandingPage() {
  const { data: catalogo, isLoading } = useCatalogoPublico()
  const desde = catalogo ? tarifaDesde(catalogo.rutas) : null
  const ciudadesTexto = listaCiudades(catalogo?.ciudades)

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
            <Button nativeButton={false} render={<Link to="/login" />}>
              <LogIn /> <span className="hidden sm:inline">Acceso personal</span>
              <span className="sm:hidden">Ingresar</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="inicio">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--brand-blue)_14%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_right,color-mix(in_oklch,var(--brand-green)_18%,transparent),transparent_55%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-6">
              <Badge variant="secondary" className="min-h-5 gap-1.5">
                <MapPin className="size-3" /> {ciudadesTexto || 'Cobertura en el norte del Ecuador'}
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Tus encomiendas,{' '}
                <span className="text-brand-blue-text">
                  puerta a puerta<span className="text-brand-green">.</span>
                </span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground text-pretty">
                En PCargo llevamos sobres, paquetes, cartones y valijas desde Ibarra hasta el domicilio de tu
                destinatario en nuestras ciudades de cobertura, con precio claro y seguimiento en línea.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" nativeButton={false} render={<a href="#cotizar" />}>
                  Cotizar mi envío <ArrowRight />
                </Button>
                <Button size="lg" variant="outline" nativeButton={false} render={<a href={whatsappUrl()} target="_blank" rel="noreferrer" />}>
                  <MessageCircle /> Escríbenos
                </Button>
              </div>
            </div>
            <Rastreador />
          </div>
        </section>

        {/* Cifras */}
        <section className="border-y bg-muted/30">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
            {[
              { k: 'Ciudades', v: catalogo ? String(catalogo.ciudades.length) : '—' },
              { k: 'Rutas activas', v: catalogo ? String(catalogo.rutas.length) : '—' },
              { k: 'Envíos desde', v: desde !== null ? formatCurrency(desde) : '—' },
              { k: 'Seguimiento', v: 'En línea' },
            ].map((s) => (
              <div key={s.k} className="space-y-1">
                <dt className="text-sm text-muted-foreground">{s.k}</dt>
                <dd className="text-2xl font-semibold tracking-tight">{s.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Servicios */}
        <Seccion id="servicios" titulo="Lo que transportamos" subtitulo="Cuatro tipos de encomienda, cada una con su tarifa y peso máximo.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(catalogo?.tiposCarga ?? []).map((t) => {
              const Icon = TIPO_CARGA_ICON[t.codigo]
              return (
                <article key={t.codigo} className="group space-y-4 rounded-2xl border bg-card p-6 transition-colors hover:bg-muted/40">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="font-semibold">{t.nombre}</h3>
                    <p className="text-sm text-muted-foreground">{DESCRIPCION_CARGA[t.codigo]}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Hasta {t.pesoMaxKg} kg</p>
                </article>
              )
            })}
            {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
          </div>
        </Seccion>

        {/* Cómo funciona */}
        <Seccion titulo="Así de simple" className="bg-muted/30">
          <ol className="grid gap-6 md:grid-cols-3">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full border-2 border-brand-green bg-background">
                    <p.icon className="size-4" />
                  </span>
                  <span className="text-sm text-muted-foreground">Paso {i + 1}</span>
                </div>
                <h3 className="font-semibold">{p.titulo}</h3>
                <p className="text-sm text-muted-foreground">{p.texto}</p>
              </li>
            ))}
          </ol>
        </Seccion>

        {/* Cobertura y tarifas */}
        <Seccion
          id="cobertura"
          titulo="Cobertura y tarifas"
          subtitulo="Tarifa base por trayecto. Entregas urbanas dentro de cada ciudad e interurbanas en ambos sentidos."
        >
          {catalogo ? (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-4 text-left font-medium text-muted-foreground">Desde \ Hasta</th>
                    {catalogo.ciudades.map((c) => (
                      <th key={c.id} className="p-4 text-left font-medium">{c.nombre}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrizTarifas(catalogo.ciudades, catalogo.rutas).map((fila) => (
                    <tr key={fila[0]!.origen.id} className="border-b last:border-0">
                      <th scope="row" className="p-4 text-left font-medium">{fila[0]!.origen.nombre}</th>
                      {fila.map(({ destino, ruta }) => (
                        <td key={destino.id} className="p-4">
                          {ruta ? (
                            <div className="space-y-0.5">
                              <p className="font-medium">{formatCurrency(ruta.tarifaBase)}</p>
                              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="size-3" /> {formatDuracion(ruta.tiempoEstimadoMin)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Skeleton className="h-64 rounded-2xl" />
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Precio final = tarifa base × factor del tipo de carga (sobre ×1, paquete ×1,4, cartón ×1,6, valija ×1,8)
            + $0,50 por cada kg adicional sobre el peso incluido.
          </p>
        </Seccion>

        {/* Cotizador */}
        <Seccion id="cotizar" titulo="Cotiza en segundos" subtitulo="Calcula el precio exacto de tu envío antes de venir." className="bg-muted/30">
          {catalogo ? <CotizadorPublico catalogo={catalogo} /> : <Skeleton className="h-80 rounded-2xl" />}
        </Seccion>

        {/* Confianza */}
        <Seccion titulo="¿Por qué PCargo?">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: ShieldCheck, t: 'Precio transparente', d: 'La tarifa se calcula por sistema: pagas exactamente lo cotizado.' },
              { icon: PackageSearch, t: 'Trazabilidad total', d: 'Cada cambio de estado queda registrado y lo ves con tu código.' },
              { icon: MapPin, t: 'Gente de la zona', d: 'Conocemos Imbabura: entregamos en la puerta, no en una agencia.' },
            ].map((x) => (
              <div key={x.t} className="space-y-3 rounded-2xl border p-6">
                <x.icon className="size-5" />
                <h3 className="font-semibold">{x.t}</h3>
                <p className="text-sm text-muted-foreground">{x.d}</p>
              </div>
            ))}
          </div>
        </Seccion>

        {/* Contacto */}
        <Seccion id="contacto" titulo="Contáctanos" subtitulo={`Oficina principal en ${MARCA.oficina.ciudad}.`} className="bg-muted/30">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 rounded-2xl border bg-card p-6">
              <MapPin className="size-4 text-brand-blue-text" />
              <p className="text-sm font-medium">Oficina</p>
              <address className="text-sm text-muted-foreground not-italic">{MARCA.oficina.direccion}</address>
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
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue-text hover:underline"
              >
                <MessageCircle className="size-3.5" /> Escríbenos por WhatsApp
              </a>
            </div>
            <div className="space-y-2 rounded-2xl border bg-card p-6">
              <Clock className="size-4 text-brand-blue-text" />
              <p className="text-sm font-medium">Horario</p>
              <p className="text-sm text-muted-foreground">{MARCA.oficina.horario}</p>
            </div>
            <div className="space-y-2 rounded-2xl border bg-card p-6">
              <Mail className="size-4 text-brand-blue-text" />
              <p className="text-sm font-medium">Correo</p>
              <a href={`mailto:${MARCA.email}`} className="text-sm text-muted-foreground hover:text-foreground">
                {MARCA.email}
              </a>
            </div>
          </div>
        </Seccion>

        {/* Acceso personal */}
        <section className="py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-2xl bg-[image:var(--brand-gradient)] px-6 py-10 text-white sm:flex-row sm:items-center sm:px-10">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">¿Eres parte del equipo PCargo?</h2>
              <p className="text-sm opacity-80">Ingresa al panel de operaciones para registrar y gestionar envíos.</p>
            </div>
            <Button size="lg" className="bg-brand-green text-brand-green-foreground hover:bg-brand-green/90" nativeButton={false} render={<Link to="/login" />}>
              <LogIn /> Acceso personal
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {ANIO} {MARCA.nombre} · {MARCA.eslogan}</p>
          <div className="flex gap-4">
            <Link to="/seguimiento" className="hover:text-foreground">Rastrear envío</Link>
            <Link to="/login" className="hover:text-foreground">Acceso personal</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
