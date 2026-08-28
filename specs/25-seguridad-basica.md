# SPEC 25 — Endurecimiento de seguridad básico (headers HTTP + revocación RPC pública)

> **Estado:** Implementado
> **Depende de:** SPEC 04 (config Supabase), SPEC 06 (leaderboard/RLS scores)
> **Fecha:** 2026-08-28
> **Objetivo:** Cerrar los hallazgos de seguridad pendientes del checklist de auditoría — agregar headers HTTP de seguridad en Next.js y revocar la ejecución pública de la función interna `rls_auto_enable()` — dejando documentado como riesgo aceptado lo que no se corrige.

---

## Scope

**Dentro:**

1. Migración SQL que revoca `EXECUTE` sobre `public.rls_auto_enable()` a los roles `anon` y `authenticated` (la función sigue existiendo y disparándose por el event trigger del sistema; solo se cierra el acceso vía RPC pública `/rest/v1/rpc/rls_auto_enable`).
2. Headers de seguridad HTTP en `next.config.ts`, aplicados a todas las rutas (`/(.*)`):
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` (deshabilita `camera`, `microphone`, `geolocation`)
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
3. Documentar en esta spec que **minimum password length (8)** y **leaked password protection** ya fueron ajustados manualmente por el usuario en el Dashboard de Supabase (Authentication → Policies) — sin cambio de código.
4. Documentar como **riesgo aceptado** la política `scores_public_insert` (`WITH CHECK (true)`) — diseño intencional del leaderboard con modo invitado.
5. Verificación con `mcp__supabase__get_advisors(security)` de que los 2 WARN de `rls_auto_enable` desaparecen tras la migración.
6. Validación client-side por expresión regular en `components/auth-form.tsx` (tab "CREAR CUENTA"), reflejando el requisito ya configurado en el Dashboard de Supabase (Authentication → Policies → Password Requirements: "Lowercase, uppercase letters, digits and symbols"): mínimo 8 caracteres, al menos una minúscula, una mayúscula, un dígito y un símbolo. Muestra error inline antes de llamar a `supabase.auth.signUp` si no cumple, evitando el roundtrip al servidor para un error previsible.

**Fuera de alcance (para specs futuras):**

- Content-Security-Policy (CSP) granular — no estaba en el checklist original, requiere auditar todos los scripts/estilos inline antes de aplicarse sin romper nada.
- Max signup rate por IP — ya resuelto manualmente por el usuario en el Dashboard, no requiere cambios de código en este repo.
- Tabla `games` en Supabase — no existe (el catálogo vive en `lib/games.ts`), no aplica RLS.
- Cualquier restricción nueva sobre la política de `INSERT` en `scores` (rate limiting, CAPTCHA, autenticación obligatoria para puntuar) — deferred, hoy es riesgo aceptado.
- **Protección de rutas con `proxy.ts` (bloquear acceso sin sesión) y eliminación del modo invitado** — implementado en **SPEC 26** (ver https://nextjs.org/docs/app/getting-started/proxy). `proxy.ts` ahora redirige a `/acceso` sin sesión en `/juegos/[id]/jugar`; el modo invitado ya no existe.

---

## Modelo de datos

No hay estructuras de datos persistentes nuevas. Se agrega una constante pura de validación:

```ts
// lib/password-policy.ts
export const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_POLICY_MESSAGE =
  "Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.";
```

El resto de la feature solo modifica permisos (`REVOKE EXECUTE`) sobre una función existente y agrega configuración de headers en Next.js.

---

## Plan de implementación

1. **Migración SQL** vía `mcp__supabase__apply_migration`: `REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;`. Verificar con `get_advisors(security)` que los 2 WARN relacionados desaparecen.
2. **`next.config.ts`**: agregar el array `securityHeaders` (los 5 headers listados en el Scope) y la función `headers()` que los aplica a `/(.*)`.
3. **Verificación**: `tsc`, `lint`, `build` sin errores nuevos; confirmar con `curl -I` (o Network tab del navegador) contra `/` en local que los 5 headers están presentes; probar manualmente los 5 juegos para descartar que `Permissions-Policy` rompa alguna feature de teclado/canvas.
4. **`lib/password-policy.ts`**: crear con `PASSWORD_POLICY_REGEX` y `PASSWORD_POLICY_MESSAGE` (ver Modelo de datos).
5. **`components/auth-form.tsx`**: en el submit del tab "CREAR CUENTA", validar el password contra `PASSWORD_POLICY_REGEX` antes de llamar a `supabase.auth.signUp`; si falla, mostrar `PASSWORD_POLICY_MESSAGE` en el mismo lugar donde hoy se muestran los errores de Supabase, sin disparar el request.

---

## Criterios de aceptación

- [ ] `get_advisors(security)` ya no muestra `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable` para `rls_auto_enable`.
- [ ] `next.config.ts` expone los 5 headers en todas las rutas.
- [ ] `curl -I` (o Network tab) contra `/` en local muestra los 5 headers con los valores exactos listados en el Scope.
- [ ] Los 5 juegos siguen jugables sin regresión tras aplicar `Permissions-Policy`.
- [ ] `tsc`, `lint` y `build` pasan sin errores nuevos.
- [ ] La spec deja documentado que password length/leaked protection ya se ajustaron manualmente (sin checkbox de código, es nota informativa).
- [ ] En el tab "CREAR CUENTA", una contraseña sin mayúscula, sin minúscula, sin dígito, sin símbolo o de menos de 8 caracteres muestra `PASSWORD_POLICY_MESSAGE` inline y no llama a `supabase.auth.signUp`.
- [ ] Una contraseña que cumple las 4 condiciones (ej. `Arcade9!`) pasa la validación client-side y llega a `supabase.auth.signUp` normalmente.

---

## Decisiones tomadas y descartadas

- **Sí:** revocar `EXECUTE` de `rls_auto_enable` en vez de eliminar la función — mantiene el event trigger interno funcionando, solo cierra el acceso público vía RPC.
- **No:** tocar la política `scores_public_insert` — diseño intencional del modo invitado (spec 06); riesgo aceptado.
- **Sí:** agregar `Permissions-Policy` y `Strict-Transport-Security` además de los 3 headers del checklist original — pedido explícito del usuario.
- **No:** Content-Security-Policy — fuera de alcance, requiere auditoría previa de scripts inline.
- **No:** crear tabla `games` en Supabase — no existe hoy, fuera de alcance.
- **No:** cambios de código para leaked protection/signup rate — ya resueltos manualmente en el Dashboard por el usuario.
- **Sí:** agregar validación client-side por regex del requisito de complejidad de password (mayúscula/minúscula/dígito/símbolo/8+ caracteres) — ya configurado server-side en el Dashboard; el regex solo evita el roundtrip fallido, no reemplaza la validación real de Supabase Auth.

---

## Riesgos identificados

| Riesgo                                                                                 | Mitigación                                                                                                                 |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Revocar `EXECUTE` en `rls_auto_enable` rompe algo que dependa de llamarla directamente | Es un event trigger interno disparado por el sistema al crear tablas, no una función que el cliente invoca vía API.        |
| `Permissions-Policy` bloquea alguna feature del navegador usada por los juegos         | Solo se restringen `camera`/`microphone`/`geolocation` (no usadas por ningún juego); se prueban los 5 juegos tras aplicar. |
| `Strict-Transport-Security` en `next dev` (HTTP local)                                 | El navegador ignora HSTS en HTTP; el efecto real solo aplica en producción/preview con HTTPS.                              |

---

## Lo que **no** está en esta spec

- Content-Security-Policy granular.
- Restricciones nuevas sobre la política de INSERT de `scores`.
- Tabla `games` en Supabase.
- Cambios de código para password policy / leaked password protection / signup rate (ya resueltos manualmente).
- Protección de rutas y eliminación del modo invitado — ya implementado en SPEC 26.
