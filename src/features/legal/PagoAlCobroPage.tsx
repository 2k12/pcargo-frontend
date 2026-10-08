import { Link } from 'react-router'
import { Apartado, DatosResponsable, LegalLayout } from './components/LegalLayout'

/**
 * Pago al cobro (contra entrega). En PCargo cubre solo el valor del envío: no se recauda el precio
 * de la mercadería por cuenta del remitente (forma de pago `AL_COBRO` del sistema).
 */
export function PagoAlCobroPage() {
  return (
    <LegalLayout
      titulo="Política de pago al cobro"
      resumen="Con el pago al cobro, quien recibe la encomienda paga el valor del envío en el momento de la entrega. Solo cobramos el transporte: no cobramos el precio de lo que se envía."
    >
      <Apartado id="que-es" titulo="1. Qué es el pago al cobro">
        <p>
          Es una forma de pago en la que el <strong>destinatario</strong> paga el valor del envío al recibir la encomienda, en lugar de
          que lo pague el remitente al registrarla. Se elige al registrar el envío y queda indicado en la guía.
        </p>
      </Apartado>

      <Apartado id="que-cobramos" titulo="2. Qué se cobra">
        <ul>
          <li>
            Solo el <strong>valor del envío</strong> que consta en la guía, calculado con las{' '}
            <a href="/#cobertura">tarifas publicadas</a>. No se agregan recargos por elegir esta forma de pago.
          </li>
          <li>
            <strong>No recaudamos el precio de la mercadería</strong> ni otros valores por cuenta del remitente. Si vendes un producto,
            el cobro de su precio lo acuerdas directamente con tu comprador.
          </li>
          <li>El repartidor no puede cobrar un valor distinto al de la guía. Si eso ocurre, repórtalo a la oficina.</li>
        </ul>
      </Apartado>

      <Apartado id="como-pagar" titulo="3. Cómo pagar">
        <ul>
          <li>Al recibir la encomienda, con los medios de pago que te indiquemos al registrar el envío.</li>
          <li>Recibirás el comprobante de venta que corresponda según la normativa del SRI.</li>
          <li>Puedes verificar el valor antes de la entrega preguntándonos con el número de guía.</li>
        </ul>
      </Apartado>

      <Apartado id="rechazo" titulo="4. Si el destinatario no paga o no recibe">
        <ul>
          <li>
            Si el destinatario no puede o no quiere pagar, la encomienda no se entrega y queda registrada como «No entregado» con el
            motivo, visible en el <Link to="/seguimiento">seguimiento</Link>.
          </li>
          <li>
            Nos comunicamos con el remitente para acordar un nuevo intento o la devolución de la encomienda. Cualquier costo adicional se
            informa antes de realizarlo.
          </li>
          <li>Mientras se resuelve, la encomienda queda bajo nuestra custodia.</li>
        </ul>
      </Apartado>

      <Apartado id="remitente" titulo="5. Responsabilidad del remitente">
        <p>
          Al elegir el pago al cobro, el remitente confirma que el destinatario sabe que recibirá la encomienda y que deberá pagar el
          envío. Los datos de contacto del destinatario deben ser correctos para poder coordinar la entrega.
        </p>
      </Apartado>

      <Apartado id="contacto" titulo="6. Dudas y reclamos">
        <p>
          Puedes escribirnos o visitarnos con tu número de guía. Aplican también los <Link to="/terminos">términos y condiciones</Link>{' '}
          del servicio.
        </p>
        <DatosResponsable />
      </Apartado>
    </LegalLayout>
  )
}
