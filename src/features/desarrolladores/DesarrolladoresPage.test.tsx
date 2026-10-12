import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import { DesarrolladoresPage } from './DesarrolladoresPage'
import { ERRORES, SECCIONES } from './contenido'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

describe('DesarrolladoresPage (/desarrolladores)', () => {
  it('tiene un índice y todas las secciones clave como regiones con título', () => {
    renderWithProviders(<DesarrolladoresPage />, { route: '/desarrolladores', path: '/desarrolladores' })
    expect(screen.getByRole('heading', { level: 1, name: 'API para empresas' })).toBeInTheDocument()
    const indice = screen.getByRole('navigation', { name: 'Contenido' })
    for (const s of SECCIONES) {
      expect(screen.getByRole('region', { name: s.titulo })).toBeInTheDocument()
      expect(within(indice).getByRole('link', { name: s.titulo })).toHaveAttribute('href', `#${s.id}`)
    }
    expect(document.title).toBe('API para empresas · PCargo')
  })

  it('el acceso se pide por WhatsApp a PCargo', () => {
    renderWithProviders(<DesarrolladoresPage />, { route: '/desarrolladores', path: '/desarrolladores' })
    const enlace = screen.getByRole('link', { name: /Pedir acceso por WhatsApp/ })
    expect(enlace.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/593998014093\?text=/)
    expect(enlace).toHaveAttribute('target', '_blank')
  })

  it('documenta autenticación, idempotencia, errores, límites, pruebas y webhooks según el contrato v10', () => {
    renderWithProviders(<DesarrolladoresPage />, { route: '/desarrolladores', path: '/desarrolladores' })
    const auth = screen.getByRole('region', { name: 'Autenticación' })
    expect(auth).toHaveTextContent('Authorization: Bearer pc_live_…')
    expect(auth).toHaveTextContent('/api/v1/integraciones')

    const idem = screen.getByRole('region', { name: 'Idempotencia' })
    expect(idem).toHaveTextContent('Idempotency-Key')
    expect(idem).toHaveTextContent('Idempotent-Replayed: true')
    expect(idem).toHaveTextContent('422 IDEMPOTENCIA_CONFLICTO')
    expect(idem).toHaveTextContent('409 IDEMPOTENCIA_EN_PROCESO')

    const errores = within(screen.getByRole('region', { name: 'Códigos de error' })).getByRole('table')
    for (const e of ERRORES.filter((x) => x.code !== '—')) expect(errores).toHaveTextContent(e.code)

    expect(screen.getByRole('region', { name: 'Límites' })).toHaveTextContent('120 solicitudes por minuto')
    const pruebas = screen.getByRole('region', { name: 'Keys de prueba' })
    expect(pruebas).toHaveTextContent('"prueba": true')
    expect(pruebas).toHaveTextContent('numeroGuia: 0')

    const webhooks = screen.getByRole('region', { name: 'Webhooks' })
    for (const t of ['envio.creado', 'envio.estado_actualizado', 'envio.evidencia_registrada', 'webhook-id', 'webhook-timestamp', 'webhook-signature', 'createHmac']) {
      expect(webhooks).toHaveTextContent(t)
    }

    const endpoints = screen.getByRole('region', { name: 'Endpoints' })
    expect(endpoints).toHaveTextContent('/envios/lote')
    expect(endpoints).toHaveTextContent('"seguimientoUrl"')
  })

  it('enlaza a la especificación OpenAPI', () => {
    renderWithProviders(<DesarrolladoresPage />, { route: '/desarrolladores', path: '/desarrolladores' })
    const openapi = screen.getByRole('link', { name: /Abrir openapi\.json/ })
    expect(openapi.getAttribute('href')).toMatch(/\/api\/v1\/integraciones\/openapi\.json$/)
  })
})
