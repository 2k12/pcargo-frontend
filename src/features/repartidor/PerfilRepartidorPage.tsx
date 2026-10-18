import { useAuth } from '@/features/auth/hooks'
import { ContrasenaForm, DatosForm } from '@/features/perfil/PerfilPage'

/** Perfil del repartidor: mismos formularios que el panel (nombre, correo y contraseña), en una columna. */
export function PerfilRepartidorPage() {
  const { usuario } = useAuth()
  if (!usuario) return null
  return (
    <>
      <h1 className="text-lg font-semibold">Mi perfil</h1>
      <DatosForm usuario={usuario} />
      <ContrasenaForm />
    </>
  )
}
