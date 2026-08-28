# Registro de auditorías de seguridad

Memoria del agente `security-auditor`. No se borra historia — solo se actualiza estado y se agrega
la razón. Cada corrida es un barrido completo de las 4 áreas (base de datos, auth/sesión, API
routes/acceso a datos, cliente/entrega); cada ficha debajo documenta lo encontrado en esa corrida.

## Estado

| Fecha      | Áreas con hallazgos | Críticos | Altos | Medios | Bajos | Spec                                         |
| ---------- | ------------------- | -------- | ----- | ------ | ----- | -------------------------------------------- |
| 2026-08-27 | A, B, C, D          | 0        | 3     | 3      | 2     | specs/27-seguridad-auditoria-integral.md     |
| 2026-08-28 | C, D                | 0        | 1     | 2      | 1     | specs/28-seguridad-pendientes-post-spec27.md |

## Hallazgos abiertos

| ID  | Regla                                                                      | Ubicación                                                                                                                                                                                                                                          | Severidad | Estado   | Spec                                         | Detectado  |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------------------------------------- | ---------- |
| A2  | Ninguna política INSERT/UPDATE/DELETE con `WITH CHECK(true)`/`USING(true)` | `pg_policies` (verificado 2026-08-28): `scores_public_insert` ya no existe; solo `scores_authenticated_insert` (`with_check=(auth.uid() = user_id)`, rol `authenticated`) y `scores_public_select` (SELECT)                                        | alta      | resuelto | specs/27-seguridad-auditoria-integral.md     | 2026-08-27 |
| A5  | `CHECK` de dominio en columnas de entrada                                  | `list_tables` (verificado 2026-08-28): `public.scores.player_name` tiene `CHECK (char_length(player_name) >= 1 AND char_length(player_name) <= 20)`                                                                                                | media     | resuelto | specs/27-seguridad-auditoria-integral.md     | 2026-08-27 |
| A6  | Escrituras atadas a `auth.uid()`                                           | `public.scores.user_id uuid` con FK a `auth.users(id)` (verificado 2026-08-28); `lib/scores.ts:88-100` e `insertScore` en `components/game-player.tsx:241-253` ya usan `user.id`/`user.name`, input de nombre `readOnly`, botón `disabled={!user}` | alta      | resuelto | specs/27-seguridad-auditoria-integral.md     | 2026-08-27 |
| A9  | Leaked password protection activo                                          | `get_advisors(security)` (verificado 2026-08-28) — `auth_leaked_password_protection` sigue siendo el único WARN activo                                                                                                                             | baja      | en-spec  | specs/28-seguridad-pendientes-post-spec27.md | 2026-08-27 |
| B3  | Error de `exchangeCodeForSession` manejado                                 | `app/auth/callback/route.ts:11-13` (ya redirige a `/acceso?error=oauth` si falla)                                                                                                                                                                  | alta      | resuelto | specs/27-seguridad-auditoria-integral.md     | 2026-08-28 |
| B7  | `signOut` con `await` y manejo de error                                    | `lib/session.tsx:78` (ya usa `await` y loguea el error)                                                                                                                                                                                            | baja      | resuelto | specs/27-seguridad-auditoria-integral.md     | 2026-08-28 |
| C1  | `request.json()` en `try/catch`                                            | `app/api/contacto/route.ts:7-9` (ya en try/catch)                                                                                                                                                                                                  | alta      | resuelto | specs/27-seguridad-auditoria-integral.md     | 2026-08-28 |
| C2  | Validación de tipo/formato/longitud de body                                | `app/api/contacto/route.ts:18-37` (longitud, regex de email)                                                                                                                                                                                       | alta      | resuelto | specs/27-seguridad-auditoria-integral.md     | 2026-08-28 |
| C3  | Rate limiting en endpoints que consumen cuota externa                      | `app/api/contacto/route.ts` (sin rate limit sobre Resend — confirmado sin cambios 2026-08-28)                                                                                                                                                      | media     | en-spec  | specs/28-seguridad-pendientes-post-spec27.md | 2026-08-27 |
| C4  | Input de usuario en headers/subject de email                               | `app/api/contacto/route.ts:39,47` (`safeName` sin `\r\n`, `replyTo: email` ya validado por `EMAIL_REGEX`)                                                                                                                                          | alta      | resuelto | specs/27-seguridad-auditoria-integral.md     | 2026-08-28 |
| C5  | `error.message` de proveedor no crudo al cliente                           | `app/api/contacto/route.ts:52-58`, `app/api/health/supabase/route.ts:8-14` (mensajes genéricos, detalle solo en `console.error`)                                                                                                                   | media     | resuelto | specs/27-seguridad-auditoria-integral.md     | 2026-08-28 |
| C6  | Endpoints de diagnóstico sin acceso restringido                            | `app/api/health/supabase/route.ts` (sigue público, sin auth ni rate limit — confirmado sin cambios 2026-08-28)                                                                                                                                     | media     | en-spec  | specs/28-seguridad-pendientes-post-spec27.md | 2026-08-27 |
| D7  | `npm audit` sin vulnerabilidades altas/críticas nuevas                     | `nanoid`, `postcss`, `sharp` (vía `next`) — 4 altas, fix requiere `next@16.3.3` fuera de rango (confirmado sin cambios 2026-08-28)                                                                                                                 | alta      | en-spec  | specs/28-seguridad-pendientes-post-spec27.md | 2026-08-27 |

_(estados posibles: `abierto` · `en-spec` · `resuelto` · `aceptado`)_

## Riesgos aceptados

| Riesgo                                                                      | Justificación                                                          | Spec que lo aceptó | ¿Sigue vigente?                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scores_public_insert` (`WITH CHECK (true)` en `public.scores` para INSERT) | Diseño intencional del leaderboard con modo invitado                   | SPEC 25            | **No, y ya remediado.** Confirmado con `pg_policies` en esta corrida (2026-08-28): `scores_public_insert` ya no existe, reemplazada por `scores_authenticated_insert` (`with_check=(auth.uid() = user_id)`, solo `authenticated`). Cerrado por SPEC 27, verificado hoy. |
| `auth_leaked_password_protection` desactivado                               | SPEC 25 documentó que el usuario lo activó manualmente en el Dashboard | SPEC 25            | **No** — `get_advisors(security)` de esta corrida (2026-08-28) lo sigue mostrando en WARN, único lint activo. Ver hallazgo A9, en specs/28-seguridad-pendientes-post-spec27.md.                                                                                         |
| Falta de rate limiting en `/api/contacto`                                   | Aceptado en specs/03-about-contacto.md:194                             | SPEC 03            | Sigue vigente como riesgo aceptado originalmente en SPEC 03, pero ya tiene severidad y remediación propuesta documentadas como hallazgo C3 (specs/28) — no se trata como "aceptado" sin más, sino como deuda con plan pendiente.                                        |

## Notas

- El checklist embebido en `.claude/agents/security-auditor.md` es la fuente de verdad de las reglas
  (tablas A/B/C/D); este archivo solo lleva el resultado de aplicarlo.
- `references/security/security-checklist.md` es un dump congelado de `get_advisors(security)` del
  2026-08-28 — sirve de línea base, no de estado actual.
- 2026-08-28 (revisión manual previa, solo código): confirmó que B3, B7, C1, C2, C4 y C5 ya estaban
  resueltos por el commit `a9c8918` — la tabla de hallazgos abiertos estaba desactualizada y se
  corrigió. Quedó pendiente de verificación con Supabase real A2, A5, A6, A9 y de `npm audit` D7.
- 2026-08-28 (corrida completa de `security-auditor`, con acceso real a Supabase y a `npm audit`):
  confirmó A2/A5/A6 resueltos (migración de SPEC 27 aplicada en el proyecto real: `user_id`,
  `scores_authenticated_insert`, `CHECK` de longitud) y confirmó que A9 (leaked password protection)
  y D7 (`npm audit`, 4 altas) siguen abiertos sin cambios desde SPEC 27. C3 y C6 también se
  re-confirmaron abiertos, sin cambios de código desde SPEC 27 (documentado explícitamente como
  fuera de su alcance). Spec de esta corrida: specs/28-seguridad-pendientes-post-spec27.md.

## Fichas

<!--
### Auditoría <fecha> (specs/NN-seguridad-<slug>.md)

**A. Base de datos**

| # | Regla | Resultado | Ubicación | Severidad |
|---|-------|-----------|-----------|-----------|

**B. Auth y sesión**

| # | Regla | Resultado | Ubicación | Severidad |
|---|-------|-----------|-----------|-----------|

**C. API routes y acceso a datos**

| # | Regla | Resultado | Ubicación | Severidad |
|---|-------|-----------|-----------|-----------|

**D. Cliente y entrega**

| # | Regla | Resultado | Ubicación | Severidad |
|---|-------|-----------|-----------|-----------|

**Riesgos aceptados re-evaluados:** ...

**Spec escrito:** specs/NN-seguridad-<slug>.md — Estado: Borrador
-->

### Auditoría 2026-08-27 (specs/27-seguridad-auditoria-integral.md)

**A. Base de datos**

| #   | Regla                                                                              | Resultado       | Ubicación                                                                                                                                                                                      | Severidad |
| --- | ---------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| A1  | RLS habilitado en toda tabla de `public`                                           | Pasa            | `public.scores` (`rls_enabled: true` vía `list_tables`)                                                                                                                                        | —         |
| A2  | Ninguna política INSERT/UPDATE/DELETE con `WITH CHECK(true)`/`USING(true)`         | Falla           | `pg_policies`: `scores_public_insert` (INSERT, `with_check=true`, `anon,authenticated`)                                                                                                        | alta      |
| A3  | Funciones `SECURITY DEFINER` no ejecutables por `anon`/`authenticated`             | Pasa            | `public.rls_auto_enable()` — `information_schema.routine_privileges` solo lista `postgres`/`service_role`; SPEC 25 se implementó correctamente                                                 | —         |
| A4  | `search_path` fijo en funciones `SECURITY DEFINER`                                 | Pasa            | `public.rls_auto_enable()` — `proconfig: search_path=pg_catalog`                                                                                                                               | —         |
| A5  | `CHECK` de dominio en columnas de entrada                                          | Falla (parcial) | `score` tiene `CHECK` (pasa); `public.scores.player_name` sin `CHECK` de longitud                                                                                                              | media     |
| A6  | Escrituras atadas a `auth.uid()`                                                   | Falla           | `public.scores` sin `user_id`; `components/game-player.tsx:47,249-258` permite alias libre                                                                                                     | alta      |
| A7  | `get_advisors(security)` sin WARN/ERROR nuevos no justificados                     | Falla (parcial) | Solo 1 WARN vivo: `auth_leaked_password_protection`; los 2 WARN de `rls_auto_enable` del dump congelado ya no aparecen                                                                         | baja      |
| A8  | Extensiones fuera de `public` y sin versión vulnerable                             | Pasa            | `list_extensions` — únicas instaladas (`pgcrypto`, `pg_stat_statements`, `supabase_vault`, `uuid-ossp`) viven en `extensions`/`vault`, no en `public`; no se identificó versión desactualizada | —         |
| A9  | Config de Auth: leaked password protection, min length, confirm email, signup rate | Falla           | `get_advisors` — `auth_leaked_password_protection` en WARN pese a que SPEC 25 documentó activación manual                                                                                      | baja      |

**B. Auth y sesión**

| #   | Regla                                                         | Resultado                | Ubicación                                                                                                                                                                                                                                  | Severidad |
| --- | ------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| B1  | Matcher/rutas protegidas por `proxy.ts`                       | Pasa (decisión conocida) | `proxy.ts:8-11`, `lib/supabase/middleware.ts:33-39` — solo `/juegos/[id]/jugar` redirige                                                                                                                                                   | —         |
| B2  | Autorización con `getUser()`, no `getSession()`               | Pasa                     | `lib/supabase/middleware.ts:30-31`                                                                                                                                                                                                         | —         |
| B3  | Error de `exchangeCodeForSession` manejado, sin open redirect | Falla                    | `app/auth/callback/route.ts:10` (error descartado; destino fijo, no hay open redirect)                                                                                                                                                     | alta      |
| B4  | Ninguna decisión de autorización basada en `localStorage`     | Pasa                     | `lib/session.tsx` — `localStorage` solo para `av_scores`; sin `isGuest`/`av_user` (confirmado eliminado por SPEC 26)                                                                                                                       | —         |
| B5  | `user_metadata` tratado como input no confiable               | Pasa                     | `lib/auth-alias.ts:15-37` — normalizado y truncado a 10 chars                                                                                                                                                                              | —         |
| B6  | Password policy cliente alineada con Dashboard                | Pasa                     | `lib/password-policy.ts`, `components/auth-form.tsx:26-29`                                                                                                                                                                                 | —         |
| B7  | `signOut` con `await` y manejo de error                       | Falla                    | `lib/session.tsx:73-76`                                                                                                                                                                                                                    | baja      |
| B8  | Sin service-role key en el repo ni en `NEXT_PUBLIC_*`         | Pasa                     | `git ls-files \| grep env` solo trackea `.env.local.example`; variables ahí son `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `SUPABASE_DB_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — ninguna es service-role | —         |

**C. API routes y acceso a datos**

| #   | Regla                                                   | Resultado                      | Ubicación                                                                                           | Severidad |
| --- | ------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------- | --------- |
| C1  | `request.json()` en `try/catch`                         | Falla                          | `app/api/contacto/route.ts:4`                                                                       | alta      |
| C2  | Validación de tipo/formato/longitud del body            | Falla                          | `app/api/contacto/route.ts:10` (solo truthy)                                                        | alta      |
| C3  | Rate limiting en endpoints con cuota externa            | Falla (riesgo re-confirmado)   | `app/api/contacto/route.ts` — sin límite sobre Resend; aceptado en specs/03-about-contacto.md:194   | media     |
| C4  | Input de usuario en headers/subject de email            | Falla                          | `app/api/contacto/route.ts:22-23` (`replyTo: email`, `subject` con `name` sin sanear)               | alta      |
| C5  | `error.message` de proveedor no crudo al cliente        | Falla                          | `app/api/contacto/route.ts:28`; `app/api/health/supabase/route.ts:10,19`                            | media     |
| C6  | Endpoints de diagnóstico sin acceso irrestricto         | Falla                          | `app/api/health/supabase/route.ts` — público, sin auth/rate limit                                   | media     |
| C7  | Escrituras desde browser: validación real en BD         | Falla (mismo origen que A2/A6) | `components/game-player.tsx:249` (`insertScore` con anon key, `.catch` silencioso en consola)       | alta      |
| C8  | Secretos solo server-side, sin `NEXT_PUBLIC_*` sensible | Pasa                           | `.env.local.example` — únicas `NEXT_PUBLIC_*` son URL y publishable key, ambas de exposición segura | —         |

**D. Cliente y entrega**

| #   | Regla                                                                 | Resultado                     | Ubicación                                                                                                        | Severidad |
| --- | --------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------- |
| D1  | 5 headers de SPEC 25 presentes con valores exactos                    | Pasa                          | `next.config.ts:3-24`                                                                                            | —         |
| D2  | CSP ausente por decisión ya documentada                               | No aplica (deuda ya conocida) | `next.config.ts` — sin CSP, fuera de alcance de SPEC 25                                                          | —         |
| D3  | Sin `dangerouslySetInnerHTML`/`eval`/`innerHTML` con input de usuario | Pasa                          | `Grep` sin coincidencias en `*.ts/*.tsx`                                                                         | —         |
| D4  | Redirects sin input de usuario                                        | Pasa                          | `app/auth/callback/route.ts:13` — destino fijo `/biblioteca`                                                     | —         |
| D5  | `.gitignore` cubre `.env*`; nada trackeado                            | Pasa                          | `.gitignore` (`.env*` con excepción de `.env.local.example`); `git ls-files` confirma                            | —         |
| D6  | Secretos huérfanos sin consumidor en código                           | Falla                         | `SUPABASE_DB_PASSWORD` en `.env.local.example` — sin referencias en `Grep` sobre el código                       | baja      |
| D7  | `npm audit --omit=dev` sin vulnerabilidades altas/críticas nuevas     | Falla                         | `nanoid`, `postcss`, `sharp` (vía `next`) — 4 altas; fix requiere `next@16.3.3` fuera del rango declarado        | alta      |
| D8  | Datos sensibles en `localStorage`                                     | Pasa                          | `lib/session.tsx` (`av_scores`), `components/game-player.tsx:60,91` (`av_skin`) — solo display, sin credenciales | —         |

**Riesgos aceptados re-evaluados:**

- `scores_public_insert` (`WITH CHECK(true)`): **justificación caducada** — SPEC 26 eliminó el modo invitado; pasa de "aceptado" a hallazgo activo A2/A6, remediado en specs/27.
- `auth_leaked_password_protection`: **justificación caducada** — SPEC 25 documentó activación manual, pero `get_advisors` de hoy lo sigue mostrando en WARN; pasa a hallazgo A9.
- Falta de rate limiting en `/api/contacto` (SPEC 03): sigue vigente, sin cambio de contexto.

**Spec escrito:** specs/27-seguridad-auditoria-integral.md — Estado: Borrador

### Auditoría 2026-08-28 (specs/28-seguridad-pendientes-post-spec27.md)

Corrida de verificación tras el commit `a9c8918` ("feat(security): close SPEC 27 findings"). El
usuario había revisado manualmente el código (sin acceso a Supabase) y marcó B3/B7/C1/C2/C4/C5 como
resueltos en este registro; se confirma aquí con lectura fresca de código que esas conclusiones son
correctas, y se agrega la verificación con acceso real a Supabase/`npm audit` que faltaba.

**A. Base de datos**

| #   | Regla                                                                              | Resultado       | Ubicación                                                                                                                                                     | Severidad |
| --- | ---------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| A1  | RLS habilitado en toda tabla de `public`                                           | Pasa            | `public.scores` (`rls_enabled: true` vía `list_tables`)                                                                                                       | —         |
| A2  | Ninguna política INSERT/UPDATE/DELETE con `WITH CHECK(true)`/`USING(true)`         | Pasa (resuelto) | `pg_policies`: solo `scores_public_select` (SELECT) y `scores_authenticated_insert` (INSERT, `with_check=(auth.uid() = user_id)`, rol `authenticated`)        | —         |
| A3  | Funciones `SECURITY DEFINER` no ejecutables por `anon`/`authenticated`             | Pasa            | Sin cambios desde SPEC 27 — `get_advisors` no reporta lints de `rls_auto_enable`                                                                              | —         |
| A4  | `search_path` fijo en funciones `SECURITY DEFINER`                                 | Pasa            | Sin cambios desde SPEC 27                                                                                                                                     | —         |
| A5  | `CHECK` de dominio en columnas de entrada                                          | Pasa (resuelto) | `list_tables`: `public.scores.player_name` con `CHECK (char_length(player_name) >= 1 AND char_length(player_name) <= 20)`; `score` mantiene su `CHECK` previo | —         |
| A6  | Escrituras atadas a `auth.uid()`                                                   | Pasa (resuelto) | `public.scores.user_id uuid` con FK `scores_user_id_fkey` → `auth.users(id)`; política de INSERT exige `auth.uid() = user_id`                                 | —         |
| A7  | `get_advisors(security)` sin WARN/ERROR nuevos no justificados                     | Pasa (parcial)  | Único lint activo: `auth_leaked_password_protection` (ver A9); ya no aparece `rls_policy_always_true` sobre `scores`                                          | baja      |
| A8  | Extensiones fuera de `public` y sin versión vulnerable                             | Pasa            | Sin cambios desde SPEC 27                                                                                                                                     | —         |
| A9  | Config de Auth: leaked password protection, min length, confirm email, signup rate | Falla           | `get_advisors(security)`: `auth_leaked_password_protection` en WARN — sin cambios desde SPEC 27, requiere acción manual del usuario                           | baja      |

**B. Auth y sesión**

| #   | Regla                                                         | Resultado                | Ubicación                                                                                           | Severidad |
| --- | ------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- | --------- |
| B1  | Matcher/rutas protegidas por `proxy.ts`                       | Pasa (decisión conocida) | `lib/supabase/middleware.ts:33-39` — solo `/juegos/[id]/jugar` redirige, sin cambios                | —         |
| B2  | Autorización con `getUser()`, no `getSession()`               | Pasa                     | `lib/supabase/middleware.ts:30-31`                                                                  | —         |
| B3  | Error de `exchangeCodeForSession` manejado, sin open redirect | Pasa (resuelto)          | `app/auth/callback/route.ts:8-13` — captura `{ error }` y redirige a `/acceso?error=oauth` si falla | —         |
| B4  | Ninguna decisión de autorización basada en `localStorage`     | Pasa                     | `lib/session.tsx` — `localStorage` solo para `av_scores`                                            | —         |
| B5  | `user_metadata` tratado como input no confiable               | Pasa                     | `lib/auth-alias.ts` — sin cambios                                                                   | —         |
| B6  | Password policy cliente alineada con Dashboard                | Pasa                     | `lib/password-policy.ts` — sin cambios                                                              | —         |
| B7  | `signOut` con `await` y manejo de error                       | Pasa (resuelto)          | `lib/session.tsx:76-82` — `await supabase.auth.signOut()` con `if (error) console.error(...)`       | —         |
| B8  | Sin service-role key en el repo ni en `NEXT_PUBLIC_*`         | Pasa                     | `git ls-files` — solo `.env.local.example` trackeado, ninguna variable de service-role              | —         |

**C. API routes y acceso a datos**

| #   | Regla                                                   | Resultado       | Ubicación                                                                                                                                                | Severidad |
| --- | ------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| C1  | `request.json()` en `try/catch`                         | Pasa (resuelto) | `app/api/contacto/route.ts:6-14`                                                                                                                         | —         |
| C2  | Validación de tipo/formato/longitud del body            | Pasa (resuelto) | `app/api/contacto/route.ts:18-37` (longitud ≤80/≤2000, `EMAIL_REGEX`)                                                                                    | —         |
| C3  | Rate limiting en endpoints con cuota externa            | Falla           | `app/api/contacto/route.ts` — sin límite sobre Resend, sin cambios desde SPEC 27                                                                         | media     |
| C4  | Input de usuario en headers/subject de email            | Pasa (resuelto) | `app/api/contacto/route.ts:39,47` — `safeName` sin `\r\n`, `replyTo` validado por `EMAIL_REGEX`                                                          | —         |
| C5  | `error.message` de proveedor no crudo al cliente        | Pasa (resuelto) | `app/api/contacto/route.ts:52-58`, `app/api/health/supabase/route.ts:8-23` — mensajes genéricos                                                          | —         |
| C6  | Endpoints de diagnóstico sin acceso irrestricto         | Falla           | `app/api/health/supabase/route.ts` — sigue público, sin auth/rate limit, sin cambios desde SPEC 27                                                       | media     |
| C7  | Escrituras desde browser: validación real en BD         | Pasa (resuelto) | `components/game-player.tsx:241-253` — `insertScore` con `user.id`, input `readOnly`, botón `disabled={!user}`; la BD ahora exige `auth.uid() = user_id` | —         |
| C8  | Secretos solo server-side, sin `NEXT_PUBLIC_*` sensible | Pasa            | Sin cambios desde SPEC 27                                                                                                                                | —         |

**D. Cliente y entrega**

| #   | Regla                                                                 | Resultado                     | Ubicación                                                                                                                | Severidad |
| --- | --------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------- |
| D1  | 5 headers de SPEC 25 presentes con valores exactos                    | Pasa                          | `next.config.ts:3-24` — sin cambios                                                                                      | —         |
| D2  | CSP ausente por decisión ya documentada                               | No aplica (deuda ya conocida) | `next.config.ts` — sin cambios                                                                                           | —         |
| D3  | Sin `dangerouslySetInnerHTML`/`eval`/`innerHTML` con input de usuario | Pasa                          | Sin cambios desde SPEC 27                                                                                                | —         |
| D4  | Redirects sin input de usuario                                        | Pasa                          | `app/auth/callback/route.ts:12,16` — ambos destinos (`/acceso?error=oauth`, `/biblioteca`) son fijos                     | —         |
| D5  | `.gitignore` cubre `.env*`; nada trackeado                            | Pasa                          | `git ls-files` — solo `.env.local.example`                                                                               | —         |
| D6  | Secretos huérfanos sin consumidor en código                           | Falla                         | `SUPABASE_DB_PASSWORD` — sin cambios desde SPEC 27                                                                       | baja      |
| D7  | `npm audit --omit=dev` sin vulnerabilidades altas/críticas nuevas     | Falla                         | `nanoid <3.3.18`, `postcss <=8.5.22`, `sharp <0.35.0` (vía `next`) — mismas 4 altas que SPEC 27, sin fix dentro de rango | alta      |
| D8  | Datos sensibles en `localStorage`                                     | Pasa                          | Sin cambios desde SPEC 27                                                                                                | —         |

**Riesgos aceptados re-evaluados:**

- `scores_public_insert`: confirmado cerrado — verificado con `pg_policies` real, ya no existe.
- `auth_leaked_password_protection`: sigue sin resolver, confirmado con `get_advisors` real; acción
  100% manual pendiente del usuario.
- Falta de rate limiting en `/api/contacto` (SPEC 03): sigue vigente; se documenta remediación
  concreta en specs/28 para una spec de implementación futura.

**Spec escrito:** specs/28-seguridad-pendientes-post-spec27.md — Estado: Borrador
