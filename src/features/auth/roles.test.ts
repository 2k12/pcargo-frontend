import { describe, expect, it } from 'vitest'
import { destinoGuiaConSesion, destinoTrasLogin, esPersonalPanel, espacioDeRol, rutaPermitida } from './roles'

describe('roles — espacio de cada rol (contrato v12)', () => {
  it('ADMIN/OPERADOR → /panel, REPARTIDOR → /repartidor, CLIENTE → /portal', () => {
    expect(espacioDeRol('ADMIN')).toBe('/panel')
    expect(espacioDeRol('OPERADOR')).toBe('/panel')
    expect(espacioDeRol('REPARTIDOR')).toBe('/repartidor')
    expect(espacioDeRol('CLIENTE')).toBe('/portal')
    expect(esPersonalPanel('OPERADOR')).toBe(true)
    expect(esPersonalPanel('CLIENTE')).toBe(false)
  })

  it('cada rol solo entra a su espacio', () => {
    expect(rutaPermitida('REPARTIDOR', '/repartidor/caja')).toBe(true)
    expect(rutaPermitida('REPARTIDOR', '/envios')).toBe(false)
    expect(rutaPermitida('CLIENTE', '/portal/envios')).toBe(true)
    expect(rutaPermitida('CLIENTE', '/repartidor')).toBe(false)
    expect(rutaPermitida('ADMIN', '/caja')).toBe(true)
    expect(rutaPermitida('OPERADOR', '/portal')).toBe(false)
    // «/portales» no es el portal.
    expect(rutaPermitida('CLIENTE', '/portales')).toBe(false)
  })

  it('tras el login respeta la ruta pedida solo si el rol puede verla', () => {
    expect(destinoTrasLogin('OPERADOR', '/envios')).toBe('/envios')
    expect(destinoTrasLogin('REPARTIDOR', '/envios')).toBe('/repartidor')
    expect(destinoTrasLogin('CLIENTE', '/portal/nuevo')).toBe('/portal/nuevo')
    expect(destinoTrasLogin('CLIENTE', undefined)).toBe('/portal')
    expect(destinoTrasLogin('ADMIN', '/login')).toBe('/panel')
  })
})

describe('QR de la guía con la sesión abierta', () => {
  it('el personal va al envío en el panel, el repartidor a su app y el cliente al rastreo público', () => {
    expect(destinoGuiaConSesion('ADMIN', '40461')).toBe('/envios?guia=40461')
    expect(destinoGuiaConSesion('OPERADOR', '40461')).toBe('/envios?guia=40461')
    expect(destinoGuiaConSesion('REPARTIDOR', '40461')).toBe('/repartidor?guia=40461')
    expect(destinoGuiaConSesion('CLIENTE', '40461')).toBeNull()
  })
})
