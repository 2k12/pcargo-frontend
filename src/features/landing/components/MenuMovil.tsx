import { LogIn, Menu, MessageCircle, PackageSearch } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/brand/PCargoLogo'
import { EnlaceExterno } from '@/components/EnlaceExterno'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { whatsappUrl } from '../marca'

/** Menú de secciones para pantallas pequeñas (en escritorio la navegación va en la cabecera). */
export function MenuMovil({ secciones }: { secciones: { href: string; label: string }[] }) {
  const [abierto, setAbierto] = useState(false)
  const cerrar = () => setAbierto(false)
  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="right" className="w-[85%] max-w-xs">
        <SheetHeader>
          <SheetTitle>
            <Logo markClassName="size-8" />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col px-4" aria-label="Secciones">
          {secciones.map((s) => (
            <a key={s.href} href={s.href} onClick={cerrar} className="rounded-lg px-3 py-3 text-base hover:bg-accent">
              {s.label}
            </a>
          ))}
          <Link to="/seguimiento" onClick={cerrar} className="flex items-center gap-2 rounded-lg px-3 py-3 text-base hover:bg-accent">
            <PackageSearch className="size-4" /> Rastrear envío
          </Link>
        </nav>
        <div className="mt-auto space-y-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button size="lg" variant="outline" className="w-full" nativeButton={false} render={<EnlaceExterno href={whatsappUrl()} />}>
            <MessageCircle /> Escríbenos por WhatsApp
          </Button>
          <Button size="lg" className="w-full" nativeButton={false} render={<Link to="/login" />}>
            <LogIn /> Acceso del personal
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Botón flotante de WhatsApp: el canal más familiar para los clientes. */
export function WhatsAppFlotante() {
  return (
    <a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="¿Dudas? Escríbenos por WhatsApp (se abre en una pestaña nueva)"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <MessageCircle className="size-5" />
      <span className="hidden sm:inline">¿Dudas? Escríbenos</span>
    </a>
  )
}
