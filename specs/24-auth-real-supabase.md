# SPEC 24 — Autenticación real con Supabase Auth

> **Estado:** Aprobado
> **Depende de:** SPEC 04 (config Supabase)
> **Fecha:** 2026-08-27
> **Objetivo:** Reemplazar la sesión mock (`localStorage`) por autenticación real con Supabase Auth (email/password, Google, GitHub) en la pantalla `/acceso`, manteniendo el modo invitado y sin bloquear ninguna ruta todavía.

---

## Alcance

**Dentro:**

1. **Reemplazo total del mock de sesión** en `lib/session.tsx`: la sesión real se maneja con Supabase Auth (`@supabase/ssr`), no con `localStorage` de usuario. El modo invitado se conserva aparte (ver punto 6).
2. **Tres métodos de auth** en `components/auth-form.tsx` (mismo lugar, dos tabs "INICIAR SESIÓN" / "CREAR CUENTA", ya existentes):
   - Email/password vía `supabase.auth.signInWithPassword` (login) y `supabase.auth.signUp` (registro, guardando el alias en `options.data.username`).
   - Google y GitHub vía `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })` — los botones "GOOGLE"/"GITHUB" ya existen en la UI, solo se les da comportamiento real.
3. **Callback de OAuth**: `app/auth/callback/route.ts`, route handler `GET` que recibe `code`, ejecuta `exchangeCodeForSession` y redirige a `/biblioteca`.
4. **`middleware.ts`** en la raíz + helper `lib/supabase/middleware.ts`: en cada request llama `supabase.auth.getUser()` para refrescar las cookies de sesión (patrón estándar de `@supabase/ssr`). **No redirige ni bloquea ninguna ruta** — solo mantiene la sesión viva.
5. **Alias derivado automáticamente** (sin pantalla extra) para usuarios OAuth, vía helper puro `lib/auth-alias.ts` (`deriveAlias(user)`):
   - Email/password: el `username` capturado en el formulario de registro (mismo campo "Usuario" que hoy).
   - GitHub: `user_metadata.user_name` (handle de GitHub).
   - Google: `user_metadata.full_name` o `name`.
   - Fallback si falta lo anterior: parte local del email (antes de `@`).
   - En todos los casos: mayúsculas, sin espacios, máximo 10 caracteres — mismo criterio que el alias mock actual.
6. **Modo invitado se conserva igual que hoy**: botón "JUGAR COMO INVITADO" sigue usando un alias local (sin Supabase Auth, sin fila en `scores` ligada a un usuario real más allá del `player_name` de texto libre que ya existe).
7. **Consumidores existentes sin cambio estructural**: `components/game-player.tsx` y `components/hall-of-fame.tsx` siguen leyendo `user.name` desde `useSession()` — solo cambia de dónde sale ese valor internamente.
8. Manejo de estados de error visibles en el propio formulario (credenciales inválidas, email ya registrado, error de OAuth).

**Fuera de alcance (para specs futuras):**

- Recuperación de contraseña ("olvidé mi contraseña").
- Rutas protegidas por el middleware (redirección a `/acceso` si no hay sesión) — el middleware de esta spec solo refresca cookies.
- Configuración de las apps OAuth en Google Cloud Console / GitHub Developer Settings y su carga en el dashboard de Supabase — se asume ya hecha.
- Verificación obligatoria de correo electrónico.
- Sincronizar `game.best`/`game.plays` con datos reales (deuda ya documentada, spec aparte).
- Perfil de usuario editable (cambiar alias después del primer login).
- Unicidad de alias entre usuarios — mismo criterio que el mock actual, no se valida.

---

## Modelo de datos

No hay cambios de schema en Supabase: la tabla `public.scores` sigue usando `player_name` como texto libre (SPEC 06). Lo que cambia es el origen del valor que se le pasa.

```ts
// lib/session.tsx
export type SessionUser = {
  name: string; // alias derivado, mayúsculas, máx 10 chars
  email: string | null; // null en modo invitado
  isGuest: boolean;
};
```

```ts
// lib/auth-alias.ts
export function deriveAlias(user: {
  user_metadata?: Record<string, unknown>;
  email?: string | null;
}): string;
```

---

## Plan de implementación

1. **`lib/supabase/middleware.ts`**: helper `updateSession(request)` que crea el server client con las cookies del request/response y llama `supabase.auth.getUser()` para refrescar tokens.
2. **`middleware.ts`** en la raíz del proyecto: invoca `updateSession` en cada request (matcher que excluye `_next` y estáticos), sin redirecciones.
3. **`app/auth/callback/route.ts`**: `GET` handler, `exchangeCodeForSession(code)`, redirige a `/biblioteca`.
4. **`lib/auth-alias.ts`**: función pura `deriveAlias`, sin dependencias de React.
5. **Reescribir `lib/session.tsx`**: al montar, `supabase.auth.getSession()` + `onAuthStateChange` para poblar `user` real; `signOut` llama `supabase.auth.signOut()` si no es invitado, o limpia `localStorage` si lo es; se mantiene `saveScore` sin cambios.
6. **Reescribir `components/auth-form.tsx`**: tabs login/registro con `signInWithPassword`/`signUp` reales (incluyendo `username` en el registro), botones Google/GitHub con `signInWithOAuth`, botón invitado igual que hoy, mensajes de error inline.
7. **Verificación funcional manual** de los 3 métodos + invitado + persistencia tras recargar + logout, y verificación de compilación (`tsc`, `lint`, `build`).

---

## Criterios de aceptación

- [ ] Registro con email/password crea usuario en Supabase Auth y permite jugar sin verificar el correo.
- [ ] Login con email/password de un usuario existente funciona y persiste tras recargar la página.
- [ ] Login con Google redirige, vuelve autenticado a `/biblioteca`, alias derivado correctamente.
- [ ] Login con GitHub redirige, vuelve autenticado a `/biblioteca`, alias derivado del handle de GitHub.
- [ ] "Jugar como invitado" sigue funcionando igual que hoy, sin tocar Supabase Auth.
- [ ] Logout cierra la sesión correspondiente (real o invitado) y vuelve a `/biblioteca` sin sesión.
- [ ] `middleware.ts` refresca cookies en cada request sin redirigir ni bloquear ninguna ruta.
- [ ] El puntaje guardado tras una partida usa el alias derivado (o el de invitado), sin cambios en el schema de `scores`.
- [ ] `tsc`, `lint` y `build` pasan sin errores nuevos.

---

## Decisiones tomadas y descartadas

- **Reemplazo total del mock**, no incremental — evita mantener dos lógicas de sesión en paralelo.
- **Invitado se mantiene** como modo separado sin Supabase Auth — el usuario lo pidió explícitamente para no perder fricción-cero de hoy.
- **Alias OAuth derivado automático**, sin pantalla extra — coherente con "sin verificación obligatoria", prioriza UX sobre control de unicidad.
- **Sin verificación de email obligatoria** — decisión explícita del usuario, MVP prioriza UX.
- **Middleware solo refresca cookies, no protege rutas** — decisión explícita; proteger rutas queda para spec futura.
- **Reset de contraseña descartado** de esta spec — spec futura.
- **Configuración de OAuth apps en Supabase Dashboard asumida ya hecha** — fuera del control de esta spec.

---

## Riesgos identificados

- Si Google/GitHub no están realmente configurados en el dashboard de Supabase (pese a la respuesta "ya configurada"), esos botones fallarán en runtime — mitigar probando cada proveedor manualmente antes de cerrar la spec.
- Alias derivado automático puede colisionar entre usuarios distintos (dos "PX_KAI") — mismo riesgo que ya existía con el mock, se acepta igual.
- Sin verificación de correo, cualquiera puede registrarse con un email ajeno — riesgo aceptado de MVP.
