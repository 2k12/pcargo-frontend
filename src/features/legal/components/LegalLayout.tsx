import { ArrowLeft } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Logo } from '@/components/brand/PCargoLogo'
import { EnlaceExterno } from '@/components/EnlaceExterno'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import { MARCA, whatsappUrl } from '@/features/landing/marca'
import { cn } from '@/lib/utils'
import { datoLegal, DATOS_LEGALES, fechaVigencia, lineaCopyright, PAGINAS_LEGALES } from '../datos'
import { EnlacesLegales } from './EnlacesLegales'

const ANIO = new Date().getFullYear()

/** Página legal: cabecera mínima, índice, texto legible (≤ 70 caracteres por línea) y pie con las demás políticas. */
export function LegalLayout({ titulo, resumen, children }: { titulo: string; resumen: string; children: ReactNode }) {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = `${titulo} · ${MARCA.nombre}`
    window.scrollTo(0, 0)
    return () => {
      document.title = MARCA.nombre
    }
  }, [titulo])

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" aria-label={`${MARCA.nombre} — ir al inicio`}>
            <Logo markClassName="size-8" />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/" />}>
              <ArrowLeft /> Volver al inicio
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <article
          className={cn(
            'max-w-[70ch] space-y-8 text-[15px] leading-7',
            '[&_h2]:scroll-mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight',
            '[&_h3]:font-semibold [&_p]:text-pretty',
            '[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
            '[&_a]:font-medium [&_a]:text-brand-blue-text [&_a]:underline [&_a]:underline-offset-4',
          )}
        >
          <header className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{titulo}</h1>
            <p className="text-sm text-muted-foreground">
              Vigente desde el <time dateTime={DATOS_LEGALES.vigenteDesde}>{fechaVigencia()}</time>
            </p>
            <p className="rounded-xl bg-muted p-4 text-sm leading-6">{resumen}</p>
          </header>
          {children}
        </article>

        <nav aria-label="Otras políticas" className="mt-14 border-t pt-6">
          <p className="mb-3 text-sm font-medium">Otras políticas</p>
          <ul className="flex flex-wrap gap-2">
            {PAGINAS_LEGALES.filter((p) => p.ruta !== pathname).map((p) => (
              <li key={p.ruta}>
                <Button variant="outline" size="sm" nativeButton={false} render={<Link to={p.ruta} />}>
                  {p.titulo}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{lineaCopyright(ANIO)}</p>
          <EnlacesLegales />
        </div>
      </footer>
    </div>
  )
}

/** Sección numerada con ancla, para que cada apartado se pueda enlazar directamente. */
export function Apartado({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="space-y-3">
      <h2 id={`${id}-titulo`}>{titulo}</h2>
      {children}
    </section>
  )
}

/** Datos del responsable y canales de contacto, comunes a todas las políticas. */
export function DatosResponsable() {
  return (
    <ul>
      <li>
        <strong>Responsable:</strong> {datoLegal('razonSocial')}, que opera con el nombre comercial {MARCA.nombre}.
      </li>
      <li>
        <strong>RUC:</strong> {datoLegal('ruc')}
      </li>
      <li>
        <strong>Dirección:</strong> {DATOS_LEGALES.direccion}
      </li>
      <li>
        <strong>Teléfonos:</strong> <a href={`tel:${MARCA.telefonos.fijo.tel}`}>{MARCA.telefonos.fijo.texto}</a> ·{' '}
        <a href={`tel:${MARCA.telefonos.celular.tel}`}>{MARCA.telefonos.celular.texto}</a>
      </li>
      <li>
        <strong>WhatsApp:</strong>{' '}
        <EnlaceExterno href={whatsappUrl('Hola PCargo, tengo una consulta sobre mis datos personales.')}>
          {MARCA.telefonos.celular.texto}
        </EnlaceExterno>
      </li>
      <li>
        <strong>Correo:</strong>{' '}
        {DATOS_LEGALES.emailDatos ? <a href={`mailto:${DATOS_LEGALES.emailDatos}`}>{DATOS_LEGALES.emailDatos}</a> : datoLegal('emailDatos')}
      </li>
    </ul>
  )
}
