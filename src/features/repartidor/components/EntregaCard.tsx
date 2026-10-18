import { Check, Loader2, MapPin, MessageCircle, Package, Phone, TriangleAlert, Truck, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EstadoBadge } from '@/features/envios/components/EstadoBadge'
import { piezasLabel, resumenItems, ZONA_LABEL } from '@/features/envios/domain'
import { errorMessage } from '@/lib/api'
import { SUPERFICIE } from '@/lib/estilos'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { EnvioReparto, EstadoReparto } from '@/types/api'
import { accionesReparto, enlaceMapa, enlaceTelefono, enlaceWhatsApp, etiquetaAccion } from '../domain'
import { useCambiarEstadoReparto } from '../hooks'
import type { EstadoConMotivo } from './MotivoSheet'

/** Botón de contacto grande (≥ 44 px), como enlace nativo para que el teléfono abra la app correcta. */
function Contacto({ href, icono, children, externo }: { href: string; icono: ReactNode; children: ReactNode; externo?: boolean }) {
  return (
    <Button
      variant="outline"
      className="h-12 text-base"
      nativeButton={false}
      render={<a href={href} {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})} />}
    >
      {icono}
      {children}
    </Button>
  )
}

const ICONO_ACCION: Record<EstadoReparto, ReactNode> = {
  EN_REPARTO: <Truck className="size-5" />,
  ENTREGADO: <Check className="size-5" />,
  NO_ENTREGADO: <X className="size-5" />,
  NOVEDAD: <TriangleAlert className="size-5" />,
}

/**
 * Tarjeta de una entrega. Figura: a quién y dónde, y cuánto cobrar. Debajo, los contactos y las
 * acciones posibles según el estado, con botones grandes para usar con una mano.
 */
export function EntregaCard({
  envio,
  onEntregar,
  onMotivo,
}: {
  envio: EnvioReparto
  onEntregar: (e: EnvioReparto) => void
  onMotivo: (e: EnvioReparto, estado: EstadoConMotivo) => void
}) {
  const cambiar = useCambiarEstadoReparto()
  const acciones = accionesReparto(envio.estado)
  const whatsapp = enlaceWhatsApp(envio.destinatario.telefono, `Hola, le saluda PCargo. Tengo su encomienda (guía ${envio.numeroGuia}).`)
  const principal = acciones.includes('ENTREGADO') ? 'ENTREGADO' : acciones.includes('EN_REPARTO') ? 'EN_REPARTO' : null
  const secundarias = acciones.filter((a): a is EstadoConMotivo => a === 'NO_ENTREGADO' || a === 'NOVEDAD')

  const ejecutar = async (estado: EstadoReparto) => {
    if (estado === 'ENTREGADO') return onEntregar(envio)
    if (estado === 'NO_ENTREGADO' || estado === 'NOVEDAD') return onMotivo(envio, estado)
    try {
      await cambiar.mutateAsync({ id: envio.id, estado })
      toast.success(`Guía ${envio.numeroGuia}: en reparto`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <article className={cn('space-y-3 p-4', SUPERFICIE)} aria-label={`Guía ${envio.numeroGuia}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm text-muted-foreground tabular-nums">Guía {envio.numeroGuia}</p>
          <h3 className="truncate text-lg leading-tight font-semibold">{envio.destinatario.nombre}</h3>
        </div>
        <EstadoBadge estado={envio.estado} />
      </header>

      <a
        href={enlaceMapa(envio.destinatario.direccion, envio.ruta.destino)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-start gap-2 rounded-lg text-base underline-offset-2 hover:underline"
      >
        <MapPin className="mt-1 size-4 shrink-0 text-muted-foreground" />
        <span>
          {envio.destinatario.direccion}
          <span className="block text-sm text-muted-foreground no-underline">
            {envio.ruta.destino} · zona {ZONA_LABEL[envio.zona ?? 'URBANA'].toLowerCase()} · Abrir en Maps
          </span>
        </span>
      </a>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Package className="mt-0.5 size-4 shrink-0" />
        <span>
          {piezasLabel(envio.totalPiezas)} · {resumenItems(envio.items)}
          {envio.descripcion && <span className="block">{envio.descripcion}</span>}
        </span>
      </p>

      {envio.porCobrar > 0 && (
        <p className="rounded-xl bg-brand-green px-4 py-3 text-center text-xl font-semibold text-brand-green-foreground tabular-nums">
          Cobrar {formatCurrency(envio.porCobrar)}
        </p>
      )}

      {envio.entrega && (envio.estado === 'ENTREGADO' || envio.estado === 'NO_ENTREGADO' || envio.estado === 'NOVEDAD') && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
          {formatDateTime(envio.entrega.fecha)}
          {envio.evidencia ? ` · recibió ${envio.evidencia.recibidoPor}` : envio.entrega.nota ? ` · ${envio.entrega.nota}` : ''}
        </p>
      )}

      {envio.estado !== 'ENTREGADO' && (
        <div className="grid grid-cols-2 gap-2">
          <Contacto href={enlaceTelefono(envio.destinatario.telefono)} icono={<Phone className="size-5" />}>
            Llamar
          </Contacto>
          {whatsapp && (
            <Contacto href={whatsapp} externo icono={<MessageCircle className="size-5" />}>
              WhatsApp
            </Contacto>
          )}
        </div>
      )}

      {principal && (
        <Button className="h-14 w-full text-base" disabled={cambiar.isPending} onClick={() => ejecutar(principal)}>
          {cambiar.isPending ? <Loader2 className="size-5 animate-spin" /> : ICONO_ACCION[principal]}
          {etiquetaAccion(envio.estado, principal)}
        </Button>
      )}
      {secundarias.length > 0 && (
        <div className={cn('grid gap-2', secundarias.length > 1 && 'grid-cols-2')}>
          {secundarias.map((a) => (
            <Button key={a} variant="outline" className="h-12 text-base" onClick={() => ejecutar(a)}>
              {ICONO_ACCION[a]}
              {etiquetaAccion(envio.estado, a)}
            </Button>
          ))}
        </div>
      )}
      {acciones.length === 0 && envio.estado === 'REGISTRADO' && (
        <p className="text-sm text-muted-foreground">Aún en oficina: espera a que salga hacia {envio.ruta.destino}.</p>
      )}
    </article>
  )
}
