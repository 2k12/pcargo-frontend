# CLAUDE.md — pcargo-frontend

Repositorio independiente del frontend de PCargo. Contrato de API en `../docs/api-contract.md`; SRS en `../docs/srs/`.

## Comandos
- `pnpm dev` · `pnpm test` · `pnpm build` · `pnpm lint`
- Antes de dar algo por terminado: `pnpm lint && pnpm test && pnpm build` deben pasar.

## Convenciones
- Organización por feature: `src/features/<feature>/{api.ts, hooks.ts, components/, *Page.tsx}`. La lógica pura del dominio (p. ej. transiciones de estado) va en `domain.ts` y se testea sin React.
- Todo acceso HTTP pasa por `src/lib/api.ts` (`api.get/post/patch`); nunca `fetch` directo en componentes. Errores → `ApiError` y se muestran con `errorMessage()`.
- Datos del servidor con TanStack Query; formularios con react-hook-form + zod.
- Tipos de la API solo en `src/types/api.ts`; si cambia el contrato, actualizar ahí primero.
- UI: componentes shadcn en `src/components/ui` (estilo `base-nova` sobre **Base UI**: usar la prop `render` en lugar de `asChild`; `Select` recibe `items` para mostrar etiquetas). Agregar nuevos con `pnpm dlx shadcn@latest add <nombre>`.
- Textos de interfaz en español; moneda USD con `formatCurrency` (es-EC).
- Estilo minimalista: tokens neutrales de shadcn, sin colores hardcodeados salvo los tonos de estado en `features/envios/ui.tsx`.
- Tests junto al código (`*.test.ts[x]`); mockear `fetch` con `mockFetch`/`jsonResponse` de `src/test/utils.tsx`.

## Marca
- Colores y logo: ver `../docs/marca.md`. Usar tokens (`bg-primary`, `text-brand-blue-text`, `bg-brand-green` + `text-brand-green-foreground`); nunca texto blanco sobre verde ni hex sueltos.
- Logo: `<Logo />` / `<LogoMark />` de `src/components/brand/PCargoLogo.tsx`.
