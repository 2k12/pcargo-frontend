# PCargo · Frontend

Panel web de PCargo, servicio de encomiendas a domicilio con base en Ibarra. Las ciudades de cobertura son
configurables desde el panel (semilla: Ibarra, Atuntaqui, Otavalo y Quito).

- **Stack**: Vite 8 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (estilo `base-nova`, Base UI) · React Router · TanStack Query · react-hook-form + zod · sonner · lucide-react
- **Contrato de API**: [`../docs/api-contract.md`](../docs/api-contract.md)

## Uso

```bash
pnpm install
pnpm dev        # http://localhost:5173  (proxy /api → http://localhost:3000)
pnpm test       # Vitest + Testing Library (jsdom)
pnpm build      # typecheck + build de producción en dist/
pnpm lint       # tsc + oxlint
```

Variables (`.env.example`): `VITE_API_URL` (opcional, por defecto `/api`).

Credenciales de demostración (sembradas por el backend):

| Correo | Contraseña | Rol |
|---|---|---|
| admin@pcargo.ec | Admin123! | ADMIN |
| operador@pcargo.ec | Operador123! | OPERADOR |

## Pantallas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | pública | Landing de la marca: servicios, cobertura y tarifas, cotizador, rastreo, contacto y acceso al login |
| `/login` | pública | Inicio de sesión (JWT en `localStorage`) |
| `/panel` | autenticado | Resumen: envíos, piezas, ingresos, entregados; distribución por estado, ruta, tipo de carga (piezas) y forma de pago |
| `/envios` | autenticado | Tabla con filtros (estado, forma de pago, ruta, búsqueda). Alta con varios ítems (tipo, cantidad, peso por unidad), forma de pago (pagado, al cobro, contrato, seguro) y cotización en vivo con desglose. Detalle con ítems, registro y última gestión de entrega (fecha + operador), historial y cambio de estado (NO_ENTREGADO/NOVEDAD exigen motivo) |
| `/rutas` | autenticado (edición: ADMIN) | Cobertura y tarifas. **Ciudades de cobertura**: ADMIN agrega, renombra, activa/desactiva o elimina ciudades (solo sin rutas; si tienen rutas se desactivan). **Rutas**: ADMIN crea rutas, edita tarifa/tiempo y activa/desactiva; una ruta con una ciudad inactiva aparece como "No operativa" |
| `/seguimiento[/:codigo]` | pública | Rastreo por código `PC-XXXXXXXX` |

## Estructura

```
src/
  app/            providers (Query, tema, auth, toasts) y rutas
  components/
    layout/       AppShell (sidebar + sheet móvil), PageHeader, ThemeToggle
    ui/           componentes shadcn (generados por CLI, no editar a mano)
  features/
    auth/         AuthProvider, ProtectedRoute, LoginPage
    dashboard/    resumen
    envios/       dominio (estados/transiciones), schema zod, hooks, componentes
    rutas/        tabla de rutas, diálogos de alta/edición
    seguimiento/  rastreo público
    landing/      sitio público de la marca (datos de contacto en marca.ts)
  hooks/          hooks genéricos (useDebounced)
  lib/            cliente HTTP (api.ts), formatos es-EC (format.ts), utils
  types/api.ts    tipos espejo del contrato
  test/           setup y utilidades de test
```
