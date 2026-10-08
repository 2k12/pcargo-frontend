import { Link } from 'react-router'
import { Apartado, DatosResponsable, LegalLayout } from './components/LegalLayout'

/**
 * Política de privacidad conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP, Registro Oficial
 * Suplemento 459, 26-05-2021) y su Reglamento. Describe solo los tratamientos que el sistema realiza de verdad.
 */
export function PrivacidadPage() {
  return (
    <LegalLayout
      titulo="Política de privacidad"
      resumen="Usamos tus datos solo para transportar y entregar tus encomiendas, para atenderte y para cumplir la ley. No los vendemos ni los usamos para publicidad. Puedes pedir verlos, corregirlos o eliminarlos cuando quieras."
    >
      <Apartado id="responsable" titulo="1. Quién es el responsable de tus datos">
        <p>El responsable del tratamiento de tus datos personales es:</p>
        <DatosResponsable />
      </Apartado>

      <Apartado id="datos" titulo="2. Qué datos tratamos">
        <h3>Si envías o recibes una encomienda</h3>
        <ul>
          <li>
            <strong>Remitente:</strong> nombre y teléfono.
          </li>
          <li>
            <strong>Destinatario:</strong> nombre, teléfono y dirección de entrega. Estos datos nos los entrega el remitente, que
            debe contar con el permiso del destinatario para compartirlos.
          </li>
          <li>
            <strong>Del envío:</strong> número de guía, ruta, tipo, cantidad y peso de las piezas, descripción del contenido,
            forma de pago, costo y el historial de estados con las notas de entrega.
          </li>
        </ul>
        <h3>Si aceptas ser cliente frecuente</h3>
        <p>
          Guardamos tu nombre, teléfono y, si nos los das, tu dirección y notas de atención (por ejemplo, «entregar en bodega»),
          junto con la fecha en que diste tu consentimiento. Así no tienes que dictar tus datos en cada envío.
        </p>
        <h3>Si solo visitas este sitio web</h3>
        <ul>
          <li>No usamos cookies, píxeles de seguimiento ni herramientas de analítica o publicidad.</li>
          <li>
            Para proteger el servicio contra abusos, el servidor usa tu dirección IP durante unos minutos para limitar la cantidad de
            consultas por minuto. No la asociamos a tu identidad.
          </li>
          <li>
            El rastreo por número de guía muestra solo el estado, las ciudades, el tipo y la cantidad de piezas y el historial. No
            muestra nombres, teléfonos ni direcciones.
          </li>
          <li>
            El cotizador no pide datos personales. Más detalles en la <Link to="/cookies">política de cookies</Link>.
          </li>
        </ul>
        <h3>Si eres parte del personal de PCargo</h3>
        <p>
          Tu nombre, correo y rol para acceder al panel; tu contraseña se guarda cifrada (nunca en texto legible). El sistema registra
          qué usuario hizo cada cambio de estado de un envío.
        </p>
      </Apartado>

      <Apartado id="finalidades" titulo="3. Para qué los usamos y con qué base legal">
        <ul>
          <li>
            <strong>Transportar y entregar la encomienda</strong>, calcular su costo y mostrar su seguimiento. Base legal: la ejecución
            del contrato de transporte que celebras con nosotros.
          </li>
          <li>
            <strong>Recordar tus datos como cliente frecuente.</strong> Base legal: tu consentimiento, que puedes retirar en cualquier
            momento sin que afecte a los envíos ya hechos.
          </li>
          <li>
            <strong>Emitir comprobantes y llevar la contabilidad.</strong> Base legal: el cumplimiento de obligaciones legales y
            tributarias.
          </li>
          <li>
            <strong>Atender consultas, reclamos y solicitudes</strong> sobre tus datos. Base legal: el contrato y las obligaciones de
            la Ley Orgánica de Defensa del Consumidor y de la LOPDP.
          </li>
          <li>
            <strong>Proteger el sitio y el sistema</strong> (control de acceso, límite de consultas). Base legal: nuestro interés
            legítimo en mantener el servicio seguro.
          </li>
        </ul>
        <p>No tomamos decisiones automatizadas que te afecten ni elaboramos perfiles. No enviamos publicidad.</p>
      </Apartado>

      <Apartado id="destinatarios" titulo="4. Con quién los compartimos">
        <p>No vendemos ni alquilamos tus datos. Solo los conocen:</p>
        <ul>
          <li>El personal de PCargo que gestiona y entrega tu envío, con acceso según su función.</li>
          <li>
            Los proveedores que alojan nuestro sistema, como encargados del tratamiento, con obligación de confidencialidad y solo
            para prestarnos ese servicio.
          </li>
          <li>Las autoridades que los requieran conforme a la ley (por ejemplo, el SRI o un juez).</li>
        </ul>
        <p>
          Si nos escribes por WhatsApp, esa conversación pasa también por los servidores de WhatsApp (Meta), que la tratan según su
          propia política de privacidad. Puedes usar en su lugar el teléfono o nuestra oficina.
        </p>
      </Apartado>

      <Apartado id="conservacion" titulo="5. Cuánto tiempo los guardamos">
        <ul>
          <li>
            <strong>Datos de los envíos:</strong> mientras dure el servicio y, después, durante los plazos que exige la normativa
            tributaria y para atender posibles reclamos.
          </li>
          <li>
            <strong>Datos de cliente frecuente:</strong> hasta que retires tu consentimiento o pidas eliminarlos.
          </li>
          <li>
            <strong>Dirección IP para el límite de consultas:</strong> solo minutos.
          </li>
        </ul>
      </Apartado>

      <Apartado id="derechos" titulo="6. Tus derechos">
        <p>La LOPDP te reconoce, entre otros, estos derechos sobre tus datos:</p>
        <ul>
          <li>
            <strong>Acceso:</strong> saber qué datos tuyos tenemos.
          </li>
          <li>
            <strong>Rectificación y actualización:</strong> corregirlos si están mal o incompletos.
          </li>
          <li>
            <strong>Eliminación:</strong> pedir que los borremos, salvo los que la ley nos obliga a conservar.
          </li>
          <li>
            <strong>Oposición</strong> y <strong>suspensión del tratamiento</strong>.
          </li>
          <li>
            <strong>Portabilidad:</strong> recibirlos en un formato de uso común.
          </li>
          <li>
            <strong>Retirar tu consentimiento</strong> como cliente frecuente en cualquier momento.
          </li>
        </ul>
        <p>
          Para ejercerlos, acércate a la oficina o escríbenos por cualquiera de los canales del apartado 1. Te pediremos confirmar tu
          identidad (por ejemplo, con el teléfono registrado) para no entregar tus datos a otra persona. Responderemos dentro de los
          plazos que fija la ley, y el trámite es gratuito.
        </p>
        <p>
          Si consideras que no atendimos bien tu solicitud, puedes presentar un reclamo ante la{' '}
          <strong>Superintendencia de Protección de Datos Personales</strong>.
        </p>
      </Apartado>

      <Apartado id="seguridad" titulo="7. Cómo protegemos tus datos">
        <ul>
          <li>Solo el personal autorizado entra al sistema, con usuario y contraseña, y cada uno ve lo que necesita según su rol.</li>
          <li>Las contraseñas se guardan cifradas con un algoritmo de un solo sentido.</li>
          <li>El sistema registra quién y cuándo cambió el estado de cada envío.</li>
          <li>El seguimiento público no muestra datos personales.</li>
        </ul>
        <p>
          Si ocurriera una vulneración de seguridad que afecte tus datos, lo notificaremos a la autoridad y, cuando corresponda, a ti,
          como manda la ley.
        </p>
      </Apartado>

      <Apartado id="cambios" titulo="8. Cambios en esta política">
        <p>
          Si cambiamos esta política, publicaremos la nueva versión aquí con su fecha de vigencia. Si el cambio afecta a un tratamiento
          basado en tu consentimiento, te lo pediremos de nuevo.
        </p>
      </Apartado>
    </LegalLayout>
  )
}
