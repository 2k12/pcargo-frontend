// Datos de contacto e identidad de la marca mostrados en la landing.
export const MARCA = {
  nombre: 'PCargo',
  eslogan: 'Encomiendas puerta a puerta',
  oficina: {
    ciudad: 'Ibarra',
    direccion: 'Las Gardenias s/n y El Rosal (La Florida), Ibarra, Ecuador',
    horario: 'Lunes a viernes 08:00–18:00 · Sábados 08:00–13:00', // ejemplo
  },
  telefonos: {
    fijo: { texto: '06 263 2669', tel: '+59362632669' },
    celular: { texto: '+593 99 518 7551', tel: '+593995187551' },
  },
  // Se asume que el celular también es el WhatsApp de la empresa. Formato internacional sin "+".
  whatsapp: '593995187551',
  email: 'contacto@pcargo.ec', // ejemplo
} as const

export const whatsappUrl = (mensaje = 'Hola PCargo, quiero enviar una encomienda.') =>
  `https://wa.me/${MARCA.whatsapp}?text=${encodeURIComponent(mensaje)}`
