# SPEC 27 — Auditoría de seguridad integral (post SPEC 25/26)

> **Estado:** Implementado
> **Depende de:** SPEC 06 (leaderboard/RLS scores), SPEC 24 (auth real Supabase), SPEC 25 (seguridad básica), SPEC 26 (protección de ruta de juego / eliminación de invitado)
> **Fecha:** 2026-08-27
> **Objetivo:** Cerrar los hallazgos activos detectados en la primera corrida completa de `security-auditor` — reactivar la corrección de `scores_public_insert` (justificación caducada tras SPEC 26), atar los puntajes al usuario autenticado, endurecer `app/api/contacto`, y corregir defectos menores de manejo de errores en auth/sesión.

---

## Alcance

**Dentro:**

1. Migración SQL para `public.scores`: agregar columna `user_id uuid references auth.users(id)`, reemplazar `scores_public_insert` (`WITH CHECK (true)`) por una política que exija `auth.uid() = user_id` para `authenticated` y **elimine el rol `anon`** de INSERT (ya no hay modo invitado desde SPEC 26). Agregar `CHECK` de longitud a `player_name`.
2. `lib/scores.ts` / `components/game-player.tsx`: `insertScore` deja de aceptar `playerName` libre para usuarios autenticados — usa el alias derivado de la sesión (`user.name`) en vez del campo de texto editable; el campo "TUS INICIALES" se elimina o se vuelve de solo lectura.
3. `app/api/contacto/route.ts`: `try/catch` alrededor de `request.json()`, validación de formato/longitud de `name`/`email`/`message`, `subject` sin interpolar `name` crudo (o saneado), no devolver `error.message` crudo del proveedor.
4. `app/api/health/supabase/route.ts`: no exponer `error.message` crudo; devolver mensaje genérico y loguear el detalle solo server-side.
5. `app/auth/callback/route.ts`: manejar el error de `exchangeCodeForSession` (si falla, redirigir a `/acceso?error=oauth` en vez de a `/biblioteca`).
6. `lib/session.tsx`: `signOut` con `await` y manejo de error (no dejar la promesa suelta).
7. Re-verificación de `auth_leaked_password_protection`: sigue en WARN según `get_advisors` actual pese a que SPEC 25 documentó que el usuario lo activó manualmente — se documenta como hallazgo activo, acción es manual en el Dashboard (no hay código que tocar).
8. Documentar en esta spec, con evidencia de `get_advisors` de esta corrida, que los 2 WARN de `rls_auto_enable` (SECURITY DEFINER ejecutable por `anon`/`authenticated`) **sí desaparecieron** — SPEC 25 se implementó correctamente en esa parte.

**Fuera de alcance (para specs futuras):**

- Content-Security-Policy granular (deuda ya conocida desde SPEC 25).
- Rate limiting real (middleware/Upstash/Vercel) para `/api/contacto` — se documenta el riesgo, no se implementa control de cuota en esta spec.
- Actualización de dependencias (`next`, `postcss`, `sharp`, `nanoid`) vía `npm audit fix --force` — implica salto de versión de Next fuera del rango declarado en package.json; requiere spec propia de upgrade.
- Migración de `game_id` a foreign key contra una tabla `games` real en Supabase (`games` no existe, catálogo vive en `lib/games.ts`).

---

## Modelo de datos

```sql
-- 1. Columna de propietario real del puntaje.
alter table public.scores
  add column user_id uuid references auth.users(id) on delete cascade;

-- 2. Longitud máxima razonable para player_name (coincide con el
--    truncado a 10 caracteres que ya aplica el cliente en deriveAlias/UI).
alter table public.scores
  add constraint scores_player_name_length check (char_length(player_name) between 1 and 20);

-- 3. Reemplazar la política de INSERT permisiva.
drop policy if exists scores_public_insert on public.scores;

create policy scores_authenticated_insert
  on public.scores
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Nota: el rol `anon` deja de tener política de INSERT — ya no existe modo
-- invitado (SPEC 26), así que cualquier intento de insertar sin sesión debe
-- fallar por RLS, no solo por la UI.

-- 4. SELECT pública se mantiene sin cambios (lectura de leaderboard es
--    intencionalmente pública).
```

Filas existentes (2 registros de prueba) quedarán con `user_id null` tras el `ALTER TABLE`; no se hace backfill porque no hay forma de saber a qué usuario pertenecen (dato pre-SPEC 26). Se documenta como aceptable dado el volumen (2 filas).

---

## Plan de implementación

### Paso 1 (crítica) — `scores_public_insert` con `WITH CHECK (true)` ya no tiene justificación vigente

- **Hallazgo:** A2/A6. SPEC 25 aceptó este riesgo explícitamente "por el modo invitado". SPEC 26 eliminó el modo invitado sin re-evaluar esta política. Hoy cualquier cliente con la anon key (sin sesión) puede insertar puntajes arbitrarios en `public.scores` para cualquier `game_id`/`player_name`, y cualquier usuario autenticado puede insertar puntajes a nombre de otro alias (`components/game-player.tsx:47` permite sobreescribir el nombre vía `typedName` libre, `:249-258` lo envía tal cual a `insertScore`).
- **Vector:** falsificación de leaderboard (spam de puntajes, suplantación de alias ajeno), sin relación con `auth.uid()`.
- **Severidad:** alta.
- **Remediación:** SQL del Paso "Modelo de datos" (columna `user_id`, política `scores_authenticated_insert`); `lib/scores.ts::insertScore` pasa `user_id: session.user.id`; `components/game-player.tsx` usa `user.name` (derivado del alias real) en vez del input libre `typedName` para usuarios con sesión.

### Paso 2 (alta) — inyección de cabeceras / datos crudos en `/api/contacto`

- **Hallazgo:** C1, C2, C4, C5. `app/api/contacto/route.ts:3-32` no tiene `try/catch` alrededor de `request.json()` (revienta con 500 no controlado ante JSON malformado), no valida formato de `email` ni longitud máxima de `name`/`message`, interpola `name` sin sanear en `subject` (inyección de cabeceras de email vía saltos de línea/caracteres de control si Resend no los normaliza), pone `email` sin validar en `replyTo`, y devuelve `error.message` del proveedor (Resend) crudo al cliente.
- **Vector:** DoS ligero (excepción no controlada), envío de emails con `subject`/`replyTo` manipulados, fuga de detalles internos del proveedor.
- **Severidad:** alta.
- **Remediación:** `try/catch` global, validar `email` con una regex simple, limitar `name` (≤80) y `message` (≤2000), sanear `name` antes de interpolarlo en `subject` (quitar `\r`/`\n`), responder con mensaje genérico y loguear `error` solo en servidor.

### Paso 3 (alta) — callback OAuth ignora el error de intercambio de código

- **Hallazgo:** B3. `app/auth/callback/route.ts:10` descarta el resultado de `exchangeCodeForSession` y siempre redirige a `/biblioteca`, incluso si el intercambio falló (código inválido/expirado, CSRF de state). El usuario cae en `/biblioteca` sin sesión real, con UX confusa y sin señal de error.
- **Vector:** no es open redirect (destino fijo), pero sí manejo de error nulo — un fallo de autenticación se comporta como éxito silencioso.
- **Severidad:** alta.
- **Remediación:** capturar `{ error }` de `exchangeCodeForSession`; si existe, redirigir a `/acceso?error=oauth` en vez de `/biblioteca`.

### Paso 4 (media) — `/api/health/supabase` expone `error.message` crudo

- **Hallazgo:** C5, C6. `app/api/health/supabase/route.ts:8-19` es público, sin auth, y devuelve el `message` crudo de cualquier excepción o del error de `getSession()`.
- **Vector:** fuga de detalles internos (nombres de host, versión de librería, mensajes de Postgres) a cualquier visitante no autenticado.
- **Severidad:** media.
- **Remediación:** responder `{ ok: false, error: "Error de conexión" }` sin detalle, loguear el error real con `console.error` server-side.

### Paso 5 (media) — `CHECK` de longitud ausente en `player_name`

- **Hallazgo:** A5. `public.scores.player_name` es `text` sin `CHECK` de longitud; el truncado a 10 caracteres solo existe en la UI (`components/game-player.tsx:241`), no en la BD — un cliente que llame directo a la REST API de Supabase con la anon key puede insertar nombres arbitrariamente largos.
- **Vector:** abuso de almacenamiento / desbordamiento visual del leaderboard.
- **Severidad:** media.
- **Remediación:** `scores_player_name_length` (ver Modelo de datos).

### Paso 6 (baja) — `signOut` sin `await` ni manejo de error

- **Hallazgo:** B7. `lib/session.tsx:73-76` llama `supabase.auth.signOut()` sin `await`; si la llamada falla (red, cookie corrupta), el estado local (`setUser(null)`) ya se limpió y el usuario cree haber cerrado sesión aunque el signOut remoto no se completó.
- **Vector:** inconsistencia de estado, no una vulnerabilidad directa explotable — severidad baja.
- **Remediación:** `const { error } = await supabase.auth.signOut(); if (error) console.error(...)`.

### Paso 7 (baja) — leaked password protection sigue deshabilitada

- **Hallazgo:** A9. `get_advisors(security)` de esta corrida (2026-08-27) todavía reporta `auth_leaked_password_protection` en WARN, pese a que SPEC 25 documentó que el usuario la activó manualmente en el Dashboard el 2026-08-28. La fecha del dump congelado en `security-checklist.md` (2026-08-28) es posterior a la fecha real de esta auditoría (2026-08-27, confirmada con `date +%F`) — es decir, ese ajuste manual documentado en SPEC 25 no está reflejado en el proyecto real hoy.
- **Vector:** credential stuffing con contraseñas filtradas conocidas.
- **Severidad:** baja (mitigado parcialmente por política de complejidad client-side de SPEC 25, pero no reemplaza la verificación contra HaveIBeenPwned).
- **Remediación:** acción manual del usuario en Supabase Dashboard → Authentication → Policies → activar "Leaked password protection". No requiere cambio de código; se deja como pendiente explícito, no como código a escribir.
- **Evidencia post-migración (2026-08-27, tras aplicar el Paso 1 de esta spec):** `get_advisors(security)` devuelve **un único** lint activo — `auth_leaked_password_protection` (WARN, `auth_leaked_password_protection`). Sigue pendiente de la acción manual del usuario en el Dashboard; ningún cambio de código de esta spec lo resuelve.

### Paso 8 (documentación) — confirmación de que los WARN de `rls_auto_enable` (SECURITY DEFINER) ya no aparecen

- **Hallazgo:** ninguno activo. SPEC 25 corrigió las funciones `SECURITY DEFINER` ejecutables por `anon`/`authenticated` que generaban 2 WARN de `rls_auto_enable`.
- **Evidencia (2026-08-27, `get_advisors(security)` tras el Paso 1 de esta spec):** el resultado completo trae un único lint activo, `auth_leaked_password_protection` (Paso 7). No aparece ningún WARN de `rls_auto_enable` ni de `rls_policy_always_true` sobre `scores`. Se confirma que la corrección de SPEC 25 en esa parte quedó bien aplicada y sigue vigente.

---

## Criterios de aceptación

- [x] `public.scores` tiene columna `user_id uuid` con FK a `auth.users(id)`.
- [x] Política `scores_authenticated_insert` reemplaza a `scores_public_insert`; `pg_policies` ya no muestra ninguna política de INSERT con `with_check = 'true'` para `scores`.
- [x] Insertar un puntaje sin sesión (rol `anon`) contra `public.scores` falla por RLS. (No existe política de INSERT para `anon` en `pg_policies` — solo `scores_authenticated_insert` para `authenticated`.)
- [x] `insertScore` recibe y persiste `user_id` del usuario autenticado; `game-player.tsx` ya no permite que el usuario sobreescriba su alias con texto libre antes de guardar el puntaje.
- [x] `scores_player_name_length` rechaza inserts con `player_name` de más de 20 caracteres.
- [x] `app/api/contacto/route.ts` responde 400 controlado ante JSON malformado, rechaza email con formato inválido y mensajes/nombres fuera de límite, y no interpola `name` crudo en `subject`.
- [x] `app/api/contacto/route.ts` y `app/api/health/supabase/route.ts` ya no devuelven `error.message` crudo del proveedor al cliente.
- [x] `app/auth/callback/route.ts` redirige a `/acceso?error=oauth` cuando `exchangeCodeForSession` devuelve error.
- [x] `lib/session.tsx::signOut` usa `await` y maneja el error de `supabase.auth.signOut()`.
- [x] `get_advisors(security)` post-migración: 0 WARN relacionados a `rls_policy_always_true` sobre `scores`. (Único lint activo: `auth_leaked_password_protection`, ver Paso 7.)
- [x] `tsc`, `lint` y `build` pasan sin errores nuevos. (`lint` reporta 4 errores preexistentes en `.claude/hooks/format-on-write.js`, no tocado por esta spec — confirmado comparando contra `main` con `git stash`.)

---

## Decisiones tomadas y descartadas

- **Sí:** agregar `user_id` a `scores` en vez de mantener el diseño sin dueño — es el cambio mínimo que cierra tanto A2/A6 como el vector de suplantación de alias, y ya no hay modo invitado que justifique lo contrario.
- **No:** permitir que `anon` siga insertando — SPEC 26 eliminó el invitado; mantener `anon` en la política de INSERT sería un remanente sin propósito.
- **No:** tocar `scores_public_select` — la lectura pública del leaderboard es intencional y no está en discusión.
- **Sí:** mantener el campo de nombre en la UI para mostrar feedback, pero dejar de usarlo como fuente de verdad del `player_name` enviado a Supabase para usuarios autenticados.
- **No:** implementar rate limiting real en `/api/contacto` en esta spec — requiere decidir infraestructura (Upstash, Vercel KV, etc.), se documenta como riesgo pendiente, no se bloquea esta spec por eso.
- **No:** correr `npm audit fix --force` — el fix disponible salta a `next@16.3.3`, fuera del rango declarado; requiere spec de upgrade propia con su propio plan de pruebas.
- **Sí:** dejar como pendiente manual (no como tarea de código) la activación de leaked password protection — ya se intentó documentar como resuelto en SPEC 25 y no lo está; repetir el mismo patrón de "asumir que está hecho" sin re-verificar sería el mismo error.

---

## Riesgos identificados

| Riesgo                                                                                                     | Mitigación                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Cambiar la política de INSERT puede romper el guardado de puntajes si `game-player.tsx` no envía `user_id` | Actualizar `lib/scores.ts::insertScore` y su único caller (`game-player.tsx:249`) en el mismo cambio; probar los 5 juegos tras la migración. |
| Los 2 registros existentes en `scores` quedan con `user_id null` tras el `ALTER TABLE`                     | Volumen mínimo (2 filas de prueba); no hay backfill posible sin inventar datos; se documenta y se acepta.                                    |
| Validar email con regex simple en `/api/contacto` puede rechazar direcciones válidas poco comunes          | Usar una regex permisiva (RFC-lite), no una validación estricta que genere falsos negativos.                                                 |
| Quitar el campo de nombre libre en el modal de fin de partida cambia UX existente                          | Mantener el input visible pero de solo lectura (mostrando el alias real) en vez de eliminarlo, para no romper el layout.                     |

---

## Qué **no** está en esta spec

- Content-Security-Policy granular.
- Rate limiting / control de abuso real para `/api/contacto`.
- Actualización de dependencias con vulnerabilidades (`next`, `postcss`, `sharp`, `nanoid`) — requiere spec de upgrade.
- Tabla `games` real en Supabase / foreign key para `game_id`.
- Activación de "leaked password protection" en el Dashboard — acción manual pendiente del usuario, no código.
