# Registro de auditorías de seguridad

Memoria del agente `security-auditor`. No se borra historia — solo se actualiza estado y se agrega
la razón. Cada corrida es un barrido completo de las 4 áreas (base de datos, auth/sesión, API
routes/acceso a datos, cliente/entrega); cada ficha debajo documenta lo encontrado en esa corrida.

## Estado

| Fecha      | Áreas con hallazgos | Críticos | Altos | Medios | Bajos | Spec                                     |
| ---------- | ------------------- | -------- | ----- | ------ | ----- | ---------------------------------------- |
| 2026-08-27 | A, B, C, D          | 0        | 3     | 3      | 2     | specs/27-seguridad-auditoria-integral.md |

## Hallazgos abiertos

| ID  | Regla                                                                      | Ubicación                                                                                                       | Severidad | Estado  | Spec                                     | Detectado  |
| --- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------- | ------- | ---------------------------------------- | ---------- |
| A2  | Ninguna política INSERT/UPDATE/DELETE con `WITH CHECK(true)`/`USING(true)` | `pg_policies`: `public.scores` / `scores_public_insert` (INSERT, `with_check=true`, roles `anon,authenticated`) | alta      | en-spec | specs/27-seguridad-auditoria-integral.md | 2026-08-27 |
| A5  | `CHECK` de dominio en columnas de entrada                                  | `public.scores.player_name` (sin `CHECK` de longitud)                                                           | media     | en-spec | specs/27-seguridad-auditoria-integral.md | 2026-08-27 |
| A6  | Escrituras atadas a `auth.uid()`                                           | `public.scores` sin columna `user_id`; `components/game-player.tsx:47,249-258` permite alias libre al guardar   | alta      | en-spec | specs/27-seguridad-auditoria-integral.md | 2026-08-27 |
| A9  | Leaked password protection activo                                          | `get_advisors(security)` — `auth_leaked_password_protection` sigue en WARN pese a SPEC 25                       | baja      | en-spec | specs/27-seguridad-auditoria-integral.md | 2026-08-27 |
| B3  | Error de `exchangeCodeForSession` manejado                                 | `app/auth/callback/route.ts:10` (resultado descartado, siempre redirige a `/biblioteca`)                        | alta      | en-spec | specs/27-seguridad-auditoria-integral.md | 2026-08-27 |
| B7  | `signOut` con `await` y manejo de error                                    | `lib/session.tsx:75` (`supabase.auth.signOut()` sin `await`)                                                    | baja      | en-spec | specs/27-seguridad-auditoria-integral.md | 2026-08-27 |
| C1  | `request.json()` en `try/catch`                                            | `app/api/contacto/route.ts:4` (sin try/catch)                                                                   | alta      | en-spec | specs/27-seguridad-auditoria-integral.md | 2026-08-27 |
| C2  | Validación de tipo/formato/longitud de body                                | `app/api/contacto/route.ts:10` (solo truthy check)                                                              | alta      | en-spec | specs/27-seguridad-auditoria-integral.md | 2026-08-27 |
| C3  | Rate limiting en endpoints que consumen cuota externa                      | `app/api/contacto/route.ts` (sin rate limit sobre Resend)                                                       | media     | abierto | —                                        | 2026-08-27 |
| C4  | Input de usuario en headers/subject de email                               | `app/api/contacto/route.ts:22-23` (`replyTo: email`, `subject` con `name` sin sanear)                           | alta      | en-spec | specs/27-seguridad-auditoria-integral.md | 2026-08-27 |
| C5  | `error.message` de proveedor no crudo al cliente                           | `app/api/contacto/route.ts:28`, `app/api/health/supabase/route.ts:10,19`                                        | media     | en-spec | specs/27-seguridad-auditoria-integral.md | 2026-08-27 |
| C6  | Endpoints de diagnóstico sin acceso restringido                            | `app/api/health/supabase/route.ts` (público, sin auth ni rate limit)                                            | media     | en-spec | specs/27-seguridad-auditoria-integral.md | 2026-08-27 |
| D7  | `npm audit` sin vulnerabilidades altas/críticas nuevas                     | `nanoid`, `postcss`, `sharp` (vía `next`) — 4 altas, fix requiere `next@16.3.3` fuera de rango                  | alta      | abierto | —                                        | 2026-08-27 |

_(estados posibles: `abierto` · `en-spec` · `resuelto` · `aceptado`)_

## Riesgos aceptados

| Riesgo                                                                      | Justificación                                                          | Spec que lo aceptó | ¿Sigue vigente?                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scores_public_insert` (`WITH CHECK (true)` en `public.scores` para INSERT) | Diseño intencional del leaderboard con modo invitado                   | SPEC 25            | **No** — confirmado en esta auditoría (2026-08-27). SPEC 26 eliminó el modo invitado y la política sigue vigente sin cambios; pasa de "riesgo aceptado" a hallazgo activo A2/A6, remediado en specs/27-seguridad-auditoria-integral.md. |
| `auth_leaked_password_protection` desactivado                               | SPEC 25 documentó que el usuario lo activó manualmente en el Dashboard | SPEC 25            | **No** — `get_advisors(security)` de esta corrida (2026-08-27) lo sigue mostrando en WARN; la nota de SPEC 25 no se refleja en el proyecto real. Ver hallazgo A9.                                                                       |
| Falta de rate limiting en `/api/contacto`                                   | Aceptado en specs/03-about-contacto.md:194                             | SPEC 03            | Sigue vigente como riesgo aceptado — sin cambio de contexto que lo invalide; documentado también como C3 en esta corrida por completitud.                                                                                               |

## Notas

- El checklist embebido en `.claude/agents/security-auditor.md` es la fuente de verdad de las reglas
  (tablas A/B/C/D); este archivo solo lleva el resultado de aplicarlo.
- `references/security/security-checklist.md` es un dump congelado de `get_advisors(security)` del
  2026-08-28 — sirve de línea base, no de estado actual.

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
