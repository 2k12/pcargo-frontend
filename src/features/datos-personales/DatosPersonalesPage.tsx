import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { PoliticaConservacion } from './components/PoliticaConservacion'
import { RegistroSolicitudes } from './components/RegistroSolicitudes'
import { SolicitudEliminacion } from './components/SolicitudEliminacion'

/** Retención y eliminación de datos personales (LOPDP). Solo ADMIN. */
export function DatosPersonalesPage() {
  return (
    <>
      <PageHeader
        title="Datos personales"
        description="Cuánto tiempo guardamos los datos de remitentes y destinatarios, y cómo atender a quien pide borrarlos."
      />

      {/* Lo esencial de la ley, en tres frases (proximidad: explicación junto a lo que explica). */}
      <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <li>
          <span className="block font-medium text-foreground">Solo el tiempo necesario</span>
          La Ley Orgánica de Protección de Datos Personales pide no conservarlos más de lo que exige el servicio.
        </li>
        <li>
          <span className="block font-medium text-foreground">Anonimizar, no perder cifras</span>
          Se borran nombres, teléfonos, direcciones, notas y fotos; se conservan guía, ruta, costos y estados.
        </li>
        <li>
          <span className="block font-medium text-foreground">Derecho de eliminación</span>
          Cualquier persona puede pedir que borremos sus datos. Más detalles en la{' '}
          <Link to="/privacidad" className="text-foreground underline-offset-2 hover:underline">
            política de privacidad
          </Link>
          .
        </li>
      </ul>

      <section className="space-y-3" aria-label="Conservación">
        <SectionLabel as="h2">Conservación</SectionLabel>
        <PoliticaConservacion />
      </section>

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
