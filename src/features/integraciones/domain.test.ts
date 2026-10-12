import { describe, expect, it } from 'vitest'
import { destinoEjemplo, ejemploCurl, ejemploFetch, ejemploVerificacionNode, esIpOCidr, urlBaseIntegraciones } from './domain'

describe('esIpOCidr', () => {
  it.each(['203.0.113.10', '10.0.0.0/8', '0.0.0.0/0', '192.168.1.1/32', '2001:db8::1', '2001:db8::/32', '::1', 'fe80::1:2:3:4', '::ffff:192.0.2.1'])(
    'acepta %s',
    (ip) => expect(esIpOCidr(ip)).toBe(true),
  )

  it.each(['', '256.1.1.1', '1.2.3', '10.0.0.0/33', '2001:db8::/129', 'abc', '1.2.3.4/', '1.2.3.4/8/1', '2001:db8:::1', 'localhost', '1:2:3:4:5:6:7:8:9'])(
    'rechaza %j',
    (ip) => expect(esIpOCidr(ip)).toBe(false),
  )
})

describe('ejemplos de código', () => {
  const opciones = { base: urlBaseIntegraciones('https://pcargo.ec/'), ciudadOrigen: 'Atuntaqui', destino: 'Quito' }

  it('la URL base es la de la API versionada', () => {
    expect(opciones.base).toBe('https://pcargo.ec/api/v1/integraciones')
  })

  it('curl crea un envío con Bearer, Idempotency-Key y la ciudad de origen real', () => {
    const curl = ejemploCurl(opciones)
    expect(curl).toContain('curl -X POST https://pcargo.ec/api/v1/integraciones/envios')
    expect(curl).toContain('Authorization: Bearer pc_live_...')
    expect(curl).toContain('Idempotency-Key: PED-1001')
    expect(curl).toContain('recoge en Atuntaqui')
    expect(curl).toContain('"ciudad": "Quito"')
    expect(curl).toContain('"referenciaExterna": "PED-1001"')
    // El body es JSON válido (lo que va entre comillas simples).
    expect(() => JSON.parse(curl.slice(curl.indexOf("'") + 1, curl.lastIndexOf("'")))).not.toThrow()
  })

  it('fetch usa la key desde variables de entorno y la cabecera de idempotencia', () => {
    const js = ejemploFetch(opciones)
    expect(js).toContain("fetch('https://pcargo.ec/api/v1/integraciones/envios'")
    expect(js).toContain('process.env.PCARGO_API_KEY')
    expect(js).toContain("'Idempotency-Key': 'PED-1001'")
    expect(js).toContain('Origen: Atuntaqui')
  })

  it('la verificación del webhook sigue Standard Webhooks', () => {
    const node = ejemploVerificacionNode()
    expect(node).toContain("crypto\n    .createHmac('sha256', clave)")
    expect(node).toContain('`${id}.${timestamp}.${cuerpo}`')
    expect(node).toContain("replace(/^whsec_/, ''), 'base64'")
    expect(node).toContain('timingSafeEqual')
    expect(node).toContain("version !== 'v1'")
  })

  it('el destino de ejemplo es otra ciudad distinta del origen', () => {
    expect(destinoEjemplo('Ibarra', ['Ibarra', 'Otavalo'])).toBe('Otavalo')
    expect(destinoEjemplo('Quito')).toBe('Ibarra')
    expect(destinoEjemplo('Otavalo')).toBe('Quito')
  })
})
