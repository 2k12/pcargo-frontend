import { Link } from 'react-router'
import { TOKEN_KEY } from '@/lib/api'
import { CLAVE_TEMA } from '@/lib/tema'
import { Apartado, LegalLayout } from './components/LegalLayout'

/**
 * Política de cookies. El sitio no usa cookies ni rastreadores: solo dos entradas de almacenamiento local
 * necesarias o pedidas por el usuario, por eso no muestra un aviso de consentimiento.
 * Si algún día se agrega analítica o publicidad, hay que pedir consentimiento antes de cargarla y actualizar esta tabla.
 */
export function CookiesPage() {
  return (
    <LegalLayout
      titulo="Política de cookies"
      resumen="Este sitio no usa cookies ni herramientas de seguimiento, analítica o publicidad. Solo guarda en tu navegador el tema claro u oscuro que elijas y, si eres parte del personal, tu sesión. Por eso no te pedimos aceptar cookies."
    >
      <Apartado id="que-son" titulo="1. Qué son las cookies y el almacenamiento local">
        <p>
          Las cookies y el almacenamiento local son pequeños datos que un sitio guarda en tu navegador. Algunos son necesarios para que
          el sitio funcione; otros sirven para medir visitas o mostrar publicidad.
        </p>
      </Apartado>

      <Apartado id="que-usamos" titulo="2. Qué guardamos en tu navegador">
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="sr-only">Datos que el sitio guarda en tu navegador</caption>
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="p-3 font-medium">Nombre</th>
                <th scope="col" className="p-3 font-medium">Tipo</th>
                <th scope="col" className="p-3 font-medium">Para qué</th>
                <th scope="col" className="p-3 font-medium">Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3 font-mono text-xs">{CLAVE_TEMA}</td>
                <td className="p-3">Almacenamiento local · preferencia</td>
                <td className="p-3">Recordar si elegiste el tema claro u oscuro. No te identifica.</td>
                <td className="p-3">Hasta que borres los datos del navegador</td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-mono text-xs">{TOKEN_KEY}</td>
                <td className="p-3">Almacenamiento local · necesario</td>
                <td className="p-3">Mantener abierta la sesión del personal de PCargo en el panel. Solo existe si inicias sesión.</td>
                <td className="p-3">Hasta cerrar sesión (la sesión deja de ser válida a las 8 horas)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>No usamos cookies</strong>, ni propias ni de terceros. No usamos Google Analytics, píxeles de redes sociales, mapas o
          videos incrustados, ni otras herramientas que registren tu navegación.
        </p>
      </Apartado>

      <Apartado id="consentimiento" titulo="3. Por qué no te pedimos aceptar cookies">
        <p>
          Lo que guardamos es estrictamente necesario para el servicio que pides (la sesión) o es una preferencia que tú mismo eliges (el
          tema), y no sirve para seguirte ni para hacer perfiles. Si en el futuro usamos herramientas de medición o publicidad, te
          pediremos tu consentimiento antes de activarlas y actualizaremos esta política.
        </p>
      </Apartado>

      <Apartado id="terceros" titulo="4. Enlaces a otros sitios">
        <p>
          Los botones de WhatsApp y «Cómo llegar» (Google Maps) son enlaces: no cargan nada de esos servicios mientras navegas aquí. Si
          los abres, pasas a sus sitios, que usan sus propias cookies según sus políticas.
        </p>
      </Apartado>

      <Apartado id="borrar" titulo="5. Cómo borrar estos datos">
        <p>
          Puedes borrarlos en cualquier momento desde la configuración de tu navegador («Borrar datos de navegación» o «Datos de sitios»).
          El sitio seguirá funcionando: solo volverá al tema de tu sistema y, si eras personal, tendrás que iniciar sesión otra vez.
        </p>
        <p>
          Más información sobre tus datos en la <Link to="/privacidad">política de privacidad</Link>.
        </p>
      </Apartado>
    </LegalLayout>
  )
}
