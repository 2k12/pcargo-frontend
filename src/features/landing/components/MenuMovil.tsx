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
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-[85%] max-w-xs">
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
            <LogIn /> Plataforma
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
