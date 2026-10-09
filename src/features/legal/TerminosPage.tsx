import { Link } from 'react-router'
import { MARCA } from '@/features/landing/marca'
import { datoLegal } from './datos'
import { Apartado, DatosResponsable, LegalLayout } from './components/LegalLayout'

/**
 * Términos del servicio de encomiendas. Marco: Ley Orgánica de Defensa del Consumidor, Código de Comercio,
 * Ley General de los Servicios Postales y Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos.
 */
export function TerminosPage() {
  return (
    <LegalLayout
      titulo="Términos y condiciones"
      resumen="Estas condiciones regulan el uso de este sitio y el servicio de transporte de encomiendas de PCargo. Al registrar un envío o usar el sitio, las aceptas. Si algo no está claro, pregúntanos antes de enviar."
    >
      <Apartado id="prestador" titulo="1. Quién presta el servicio">
        <DatosResponsable />
        <p>Registro como operador postal: {datoLegal('registroPostal')}</p>
      </Apartado>

      <Apartado id="servicio" titulo="2. El servicio">
        <p>
          {MARCA.nombre} transporta sobres, paquetes, cartones, valijas, rollos de tela y plumones y los entrega en el domicilio del destinatario, en las ciudades
          y rutas que se muestran en la sección <a href="/#cobertura">Cobertura y tarifas</a> del sitio. La cobertura puede cambiar;
          la vigente es la que aparece publicada al registrar tu envío.
        </p>
        <p>
          El contrato de transporte se celebra cuando registramos tu envío en la oficina o por los canales que habilitemos, y te
          entregamos la guía con su número de seguimiento.
        </p>
      </Apartado>

      <Apartado id="precio" titulo="3. Precio y cotización">
        <ul>
          <li>
            El precio se calcula <strong>por unidad</strong>, según el tipo de carga, con los precios publicados en la sección{' '}
            <a href="/#cobertura">Cobertura y tarifas</a>. Es el mismo para cualquier ruta y no tiene recargo por peso; cada tipo
            tiene un peso máximo por unidad. Todos los valores están en dólares de los Estados Unidos (USD).
          </li>
          <li>
            El rollo de tela tiene un precio para la zona urbana y otro para la zona rural de entrega, y un precio por volumen: si un
            mismo envío lleva más de la cantidad publicada (hoy, más de 50 rollos), todos los rollos se cobran al precio por volumen,
            en cualquier zona.
          </li>
          <li>
            El cotizador del sitio es <strong>referencial</strong>: usa las piezas, el peso y la zona que tú ingresas. El valor
            definitivo es el que consta en la guía, calculado con las piezas, su tipo y la zona de entrega verificados al recibir la
            encomienda. Si difiere de tu cotización, te lo informamos antes de aceptar el envío.
          </li>
          <li>
            Formas de pago: pagado al registrar el envío, <Link to="/pago-al-cobro">al cobro</Link> (lo paga el destinatario al
            recibirlo), o según el contrato o la póliza acordados con clientes corporativos.
          </li>
          <li>Emitimos el comprobante de venta que corresponda según la normativa del SRI.</li>
        </ul>
      </Apartado>

      <Apartado id="tiempos" titulo="4. Tiempos de entrega">
        <p>
          Los tiempos que mostramos por trayecto son <strong>estimados</strong>, no garantizados. Pueden variar por el tráfico, el
          clima, cierres de vías, la dirección indicada o la ausencia del destinatario. Si hay una demora o un problema con la entrega,
          el motivo queda registrado en el seguimiento de tu guía.
        </p>
      </Apartado>

      <Apartado id="obligaciones" titulo="5. Lo que te pedimos como remitente">
        <ul>
          <li>Dar datos completos y verdaderos del destinatario y de la dirección de entrega.</li>
          <li>Contar con el permiso del destinatario para compartir con nosotros su nombre, teléfono y dirección.</li>
          <li>Declarar con veracidad el contenido y, si es de valor, informarlo al registrar el envío.</li>
          <li>Embalar la encomienda de forma adecuada para su transporte.</li>
          <li>Respetar el peso máximo de cada tipo de carga.</li>
        </ul>
      </Apartado>

      <Apartado id="prohibidos" titulo="6. Envíos no permitidos">
        <p>No transportamos:</p>
        <ul>
          <li>Sustancias estupefacientes o psicotrópicas, armas, municiones, explosivos ni sus partes.</li>
          <li>Materiales inflamables, corrosivos, tóxicos, radiactivos u otras mercancías peligrosas.</li>
          <li>Dinero en efectivo, títulos valores al portador, joyas o metales preciosos.</li>
          <li>Animales vivos, restos humanos o productos perecibles que no resistan el trayecto.</li>
          <li>Cualquier objeto cuyo transporte o comercio esté prohibido por la ley ecuatoriana.</li>
        </ul>
        <p>
          Podemos negarnos a recibir una encomienda si hay indicios de que su contenido está prohibido o es peligroso, y colaboraremos
          con las autoridades cuando la ley lo exija.
        </p>
      </Apartado>

      <Apartado id="responsabilidad" titulo="7. Pérdidas, daños y reclamos">
        <ul>
          <li>
            Respondemos por la pérdida o el daño de la encomienda ocurridos mientras está bajo nuestra custodia, conforme a la ley
            ecuatoriana.
          </li>
          <li>
            No respondemos por daños causados por un embalaje inadecuado, por la naturaleza del propio contenido, por datos de entrega
            incorrectos ni por casos fortuitos o de fuerza mayor.
          </li>
          <li>
            Revisa la encomienda al recibirla. Si notas un daño, indícalo al repartidor y comunícate con nosotros cuanto antes, con tu
            número de guía.
          </li>
          <li>
            Atendemos reclamos en la oficina y por los canales del apartado 1. Si no quedas conforme, puedes acudir a la Defensoría del
            Pueblo y a los demás mecanismos que prevé la Ley Orgánica de Defensa del Consumidor.
          </li>
        </ul>
      </Apartado>

      <Apartado id="cancelacion" titulo="8. Cancelación y devoluciones">
        <ul>
          <li>
            Puedes cancelar un envío mientras siga en estado «Registrado» (antes de que salga hacia su destino). Si ya lo pagaste, te
            devolvemos el valor pagado.
          </li>
          <li>
            Si no logramos entregar la encomienda, coordinamos contigo un nuevo intento o su devolución. Cualquier costo adicional te lo
            informamos antes de hacerlo.
          </li>
        </ul>
      </Apartado>

      <Apartado id="sitio" titulo="9. Uso del sitio web">
        <ul>
          <li>El sitio permite cotizar, consultar la cobertura y rastrear envíos. Su uso es gratuito.</li>
          <li>
            No está permitido intentar acceder sin autorización al panel interno, consultar guías de forma masiva o automatizada para
            obtener información de terceros, ni afectar el funcionamiento del sitio. Aplicamos límites de consultas por minuto.
          </li>
          <li>
            El nombre, el logotipo y las ilustraciones de {MARCA.nombre} nos pertenecen o los usamos con autorización; no puedes
            reproducirlos con fines comerciales sin nuestro permiso. Algunas imágenes del sitio son ilustrativas.
          </li>
          <li>
            Los enlaces a WhatsApp o Google Maps llevan a servicios de terceros, que tienen sus propias condiciones.
          </li>
        </ul>
      </Apartado>

      <Apartado id="datos" titulo="10. Datos personales">
        <p>
          Tratamos tus datos según nuestra <Link to="/privacidad">política de privacidad</Link>.
        </p>
      </Apartado>

      <Apartado id="ley" titulo="11. Ley aplicable y cambios">
        <p>
          Estas condiciones se rigen por las leyes de la República del Ecuador. Las controversias se someterán a los jueces competentes
          del Ecuador, sin perjuicio de los derechos que la Ley Orgánica de Defensa del Consumidor te reconoce. Ninguna cláusula de estos
          términos limita los derechos que la ley te otorga como consumidor.
        </p>
        <p>
          Podemos actualizar estas condiciones; la versión vigente es la publicada aquí con su fecha. A cada envío se le aplican las
          condiciones vigentes cuando se registró.
        </p>
      </Apartado>
    </LegalLayout>
  )
}
