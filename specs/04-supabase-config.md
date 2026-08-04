# SPEC 04 — Configuración base de Supabase

> **Estado:** Aprobado
> **Depende de:** ninguna spec previa (independiente)
> **Fecha:** 2026-08-03
> **Objetivo:** Configurar la conexión base a Supabase (proyecto `rwiimwxdcieqbwcnfavg`) con clientes browser y server vía `@supabase/ssr`, dejando el terreno listo para futuras specs de auth, Realtime y Edge Functions, sin implementar todavía ninguna de esas features.

---

## Alcance

**Dentro:**

1. **Dependencia `@supabase/ssr` y `@supabase/supabase-js`**: agregar ambas a `package.json`.
2. **Cliente browser** (`lib/supabase/client.ts`): función `createClient()` que instancia el cliente de Supabase para componentes cliente, usando `createBrowserClient` de `@supabase/ssr`.
3. **Cliente server** (`lib/supabase/server.ts`): función `async createClient()` (async, por el manejo de cookies de Next.js 16) que instancia el cliente para Server Components y route handlers, usando `createServerClient` de `@supabase/ssr` con el adaptador de cookies de `next/headers`.
4. **Variables de entorno**: agregar a `.env.local.example` `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (placeholders, sin valores reales — igual que `RESEND_API_KEY`).
5. **Verificación de conexión**: route handler `GET /api/health/supabase` que usa el cliente server para llamar `supabase.auth.getSession()` (no depende de tablas) y responde `{ ok: true }` si no hay error de conexión, o `{ ok: false, error }` si la URL/key son inválidas o la petición falla.

**Fuera de alcance (para specs futuras):**

- Autenticación real (reemplazar `lib/session.tsx`) — spec aparte.
- Persistencia de puntuaciones y tabla de scores (reemplazar `localStorage`/`seededScores`) — spec aparte.
- `middleware.ts` de refresco de sesión — se deja explícitamente para la spec de auth, según lo acordado.
- Cualquier tabla, esquema o migración de base de datos.
- Uso de Supabase Realtime — solo se deja el cliente listo para soportarlo a futuro, no se implementa ninguna suscripción.
- Uso de Supabase Edge Functions — no se crea ninguna función todavía.
- RLS (Row Level Security) — no aplica sin tablas.
- Pruebas automatizadas.

---

## Plan de implementación

Cada paso deja el proyecto compilando y navegable.

### Paso 1 — Dependencias y variables de entorno

`npm install @supabase/ssr @supabase/supabase-js`. Agregar a `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Sin código todavía que las use. `npm run build` sigue pasando.

### Paso 2 — `lib/supabase/client.ts`

Exporta `createClient()` usando `createBrowserClient` de `@supabase/ssr`, leyendo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Sin consumidores todavía.

### Paso 3 — `lib/supabase/server.ts`

Exporta `async function createClient()` usando `createServerClient` de `@supabase/ssr`, con el adaptador de cookies de `next/headers` (`cookies()` async, patrón de Next 16 — revisar `node_modules/next/dist/docs/02-guides/authentication.md` antes de escribir esto, tal como indica `AGENTS.md`).

### Paso 4 — `app/api/health/supabase/route.ts`

Route handler `GET` que instancia el cliente server (paso 3) y llama `supabase.auth.getSession()`; responde `{ ok: true }` (200) si no hay error, o `{ ok: false, error: string }` (500) si la llamada falla (URL/key inválidas, red caída, etc.).

### Paso 5 — Verificación

Con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` reales en `.env.local`, `npm run dev` y confirmar `GET /api/health/supabase` responde `{ ok: true }`. `npm run lint`, `npx tsc --noEmit`, `npm run build`.

---

## Criterios de aceptación

### Dependencias y configuración

- [ ] `@supabase/ssr` y `@supabase/supabase-js` aparecen en `package.json`.
- [ ] `.env.local.example` incluye `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como placeholders sin valores reales.

### Clientes

- [ ] `lib/supabase/client.ts` exporta `createClient()` funcional para componentes cliente.
- [ ] `lib/supabase/server.ts` exporta `async createClient()` funcional para Server Components y route handlers, usando cookies de `next/headers`.

### Verificación de conexión

- [ ] Con credenciales reales en `.env.local`, `GET /api/health/supabase` responde `{ ok: true }` con status 200.
- [ ] Con una `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` inválida, el mismo endpoint responde `{ ok: false, error }` con status 500, sin tumbar el servidor.

### Compilación

- [ ] `npm run build` termina sin errores.
- [ ] `npx tsc --noEmit` y `npm run lint` pasan sin errores ni advertencias nuevas.

---

## Decisiones tomadas y descartadas

### Usar el proyecto Supabase ya vinculado (`rwiimwxdcieqbwcnfavg`)

- **Sí:** ya está referenciado en `.mcp.json` y `SUPABASE_DB_PASSWORD` ya existe en `.env.local.example`. Decisión explícita del usuario.
- **No:** crear un proyecto nuevo — hubiera duplicado infraestructura sin motivo.

### `@supabase/ssr` + `@supabase/supabase-js` en vez de solo `supabase-js`

- **Sí:** es el patrón recomendado para App Router con Server/Client Components separados; deja el manejo de cookies listo para la futura spec de auth. Confirmado explícitamente por el usuario.
- **No:** usar solo `supabase-js` con un cliente único — funcionaría para queries simples pero no maneja sesión/cookies entre servidor y cliente, obligando a rehacerlo en la spec de auth.

### Clave publicable moderna (`sb_publishable_...`) en vez de la legacy `anon` (JWT)

- **Sí:** es la recomendada para apps nuevas por rotación independiente y mejor seguridad, según la propia documentación de la herramienta de Supabase.
- **No:** la legacy `anon` — se deja documentada como alternativa si algo en el SDK todavía no soporta la moderna, pero no se usa por defecto.

### Health check vía `supabase.auth.getSession()` (opción A)

- **Sí:** no depende de que exista ninguna tabla, coherente con que esta spec no crea esquema de base de datos. Decisión explícita del usuario tras comparar con la opción B (query a tabla de sistema).
- **No:** un query a `pg_tables` o crear una tabla de prueba — habría introducido una dependencia de base de datos fuera del alcance declarado.

### `middleware.ts` de refresco de sesión queda fuera de esta spec

- **Sí:** sin auth real todavía (`lib/session.tsx` sigue con localStorage), el middleware no tiene qué refrescar. Decisión explícita del usuario.
- **No:** agregarlo "por si acaso" — sería código sin consumidor, contrario a la convención del proyecto.

### Sin tablas, RLS ni Realtime/Edge Functions implementados

- **Sí:** el pedido explícito era "solo configuración", dejando el terreno listo para Realtime y Edge Functions a futuro (ambos ya funcionan sobre el mismo cliente `supabase-js`/`ssr` sin configuración adicional en esta capa).
- **No:** adelantar una suscripción Realtime de ejemplo o una Edge Function dummy — habría sido código especulativo sin uso real todavía.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                       | Mitigación                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Variables de entorno ausentes o mal configuradas en producción.** Sin `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` reales, cualquier feature futura que use el cliente fallaría en silencio. | El health check (`/api/health/supabase`) da una forma explícita de verificar la conexión antes de construir features sobre ella.                                                |
| **Confusión entre clave publicable moderna y legacy `anon`.** Usar la incorrecta en otra parte del código a futuro podría generar inconsistencias.                                                           | Se documenta en las decisiones cuál se usa y por qué; ambas están disponibles vía MCP (`get_publishable_keys`) si hace falta consultarlas de nuevo.                             |
| **Clientes browser/server mal separados.** Si a futuro alguien usa el cliente browser dentro de un Server Component (o viceversa), puede romper cookies de sesión cuando se implemente auth.                 | La separación en dos archivos (`lib/supabase/client.ts` y `lib/supabase/server.ts`) hace explícito cuál usar según el contexto, siguiendo el patrón oficial de `@supabase/ssr`. |

---

## Qué **no** está en esta spec

- Autenticación real.
- Tabla de puntuaciones ni ninguna otra tabla/esquema.
- `middleware.ts`.
- RLS.
- Realtime.
- Edge Functions.
- Pruebas automatizadas.

Cada uno de estos, si se necesita, va en su propia spec.
