import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/features/auth/hooks'
import { CodigoAccesoForm } from '@/features/perfil/CodigoAccesoForm'
import { ContrasenaForm, DatosForm } from '@/features/perfil/PerfilPage'
import { useClientePortal } from './hooks'

/** Perfil del usuario del portal: mismos formularios que el panel (datos y contraseña). */
export function PerfilPortalPage() {
  const { usuario } = useAuth()
  const cliente = useClientePortal()
  if (!usuario) return null
  return (
    <>
      <PageHeader title="Mi perfil" description={cliente ? `Acceso al portal de ${cliente.nombre}` : 'Tus datos de acceso al portal.'} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <DatosForm usuario={usuario} />
        <ContrasenaForm />
        <CodigoAccesoForm />
      </div>
    </>
  )
}
