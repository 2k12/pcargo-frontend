// Datos de contacto e identidad de la marca mostrados en la landing.
// TODO(PCargo): reemplazar los valores de ejemplo por los datos reales de la empresa.
export const MARCA = {
  nombre: 'PCargo',
  eslogan: 'Encomiendas puerta a puerta en Imbabura y Quito',
  oficina: {
    ciudad: 'Ibarra',
    direccion: 'Av. Mariano Acosta y Calle Ejemplo, Ibarra', // ejemplo
    horario: 'Lunes a viernes 08:00–18:00 · Sábados 08:00–13:00', // ejemplo
  },
  telefono: '+593 6 000 0000', // ejemplo
  whatsapp: '593990000000', // ejemplo, formato internacional sin "+"
  email: 'contacto@pcargo.ec', // ejemplo
} as const

export const whatsappUrl = (mensaje = 'Hola PCargo, quiero enviar una encomienda.') =>
  `https://wa.me/${MARCA.whatsapp}?text=${encodeURIComponent(mensaje)}`
