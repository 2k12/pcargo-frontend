import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { RegistroSolicitudes } from './components/RegistroSolicitudes'
import { SolicitudEliminacion } from './components/SolicitudEliminacion'

/** Eliminación de datos personales a pedido del titular (LOPDP). Solo ADMIN. Nada se borra automáticamente. */
export function DatosPersonalesPage() {
  return (
    <>
      <PageHeader
        title="Datos personales"
        description="Atiende a quien pide que borremos sus datos y deja constancia de cada solicitud."
      />

      {/* Lo esencial de la ley, en tres frases (proximidad: explicación junto a lo que explica). */}
      <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <li data-testid="aviso-sin-borrado">
          <span className="block font-medium text-foreground">Nada se borra solo</span>
          El sistema no elimina datos por su cuenta: solo cuando el titular lo pide y tú atiendes la solicitud.
        </li>
        <li>
          <span className="block font-medium text-foreground">Anonimizar, no perder cifras</span>
          Al atender una solicitud se borran nombres, teléfonos, direcciones, notas y fotos; se conservan guía, ruta, costos y estados.
        </li>
        <li>
          <span className="block font-medium text-foreground">Derecho de eliminación</span>
          La Ley Orgánica de Protección de Datos Personales permite a cualquier persona pedir que borremos sus datos. Más
          detalles en la{' '}
          <Link to="/privacidad" className="text-foreground underline-offset-2 hover:underline">
            política de privacidad
          </Link>
          .
        </li>
      </ul>

      <section className="space-y-3" aria-label="Solicitud de eliminación">
        <SectionLabel as="h2">Solicitud de eliminación</SectionLabel>
        <SolicitudEliminacion />
      </section>

      <section className="space-y-3" aria-label="Solicitudes atendidas">
        <SectionLabel as="h2">Solicitudes atendidas</SectionLabel>
        <RegistroSolicitudes />
      </section>
    </>
  )
}
