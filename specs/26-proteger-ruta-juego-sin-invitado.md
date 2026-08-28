# SPEC 26 — Ruta de juego protegida por sesión y eliminación del modo invitado

> **Estado:** Aprobado
> **Depende de:** SPEC 24 (auth real Supabase), SPEC 06 (leaderboard/scores)
> **Fecha:** 2026-08-28
> **Objetivo:** Exigir sesión real vía `proxy.ts` para acceder a `/juegos/[id]/jugar` y eliminar por completo el modo invitado del sitio.

---

## Scope

**Dentro:**

1. **`proxy.ts`** (SPEC 24) extendido: además de refrescar cookies, si la ruta matchea `/juegos/:id/jugar` y `supabase.auth.getUser()` no devuelve usuario, redirige a `/acceso` (`NextResponse.redirect`).
2. **Eliminación completa del modo invitado**:
   - `lib/session.tsx`: se quita `isGuest`, el alias local de invitado y toda su lógica de `localStorage` (`av_user` deja de representar invitados, solo cachea la sesión real).
   - `components/auth-form.tsx`: se quita el botón "JUGAR COMO INVITADO" y su handler.
   - `components/game-player.tsx`, `components/hall-of-fame.tsx`, `components/nav.tsx`: se limpia cualquier rama condicional que dependía de `isGuest`.
3. **Reset del leaderboard**: `TRUNCATE TABLE public.scores RESTART IDENTITY;` vía `mcp__supabase__apply_migration` — acción **destructiva e irreversible**, borra todos los puntajes (no se puede distinguir invitado de usuario real en el schema actual). Requiere confirmación explícita del usuario antes de ejecutarse en `/spec-impl`.
4. Verificación manual: sin sesión, `/juegos/[id]/jugar` redirige a `/acceso`; con sesión real, se puede jugar y el puntaje se guarda con el alias del usuario.

**Fuera de alcance (para specs futuras):**

- Proteger otras rutas (`/`, `/biblioteca`, `/juegos/[id]` detalle, `/salon`, `/acerca-de`) — siguen públicas.
- Parámetro de retorno post-login (`?redirect=`) — el redirect es fijo a `/acceso`.
- Reemplazar el invitado por sesión anónima de Supabase Auth — no se pidió, el concepto se elimina sin reemplazo.
- Comunicación en UI avisando la baja del modo invitado — proyecto en MVP interno.

---

## Modelo de datos

```ts
// lib/session.tsx
export type SessionUser = {
  name: string;
  email: string; // ya no puede ser null: siempre hay sesión real
};
```

`public.scores` no cambia de schema — solo se vacía su contenido (`TRUNCATE`).

---

## Plan de implementación

1. **Migración SQL destructiva**: `TRUNCATE TABLE public.scores RESTART IDENTITY;` — confirmar explícitamente con el usuario antes de ejecutar.
2. **`proxy.ts`**: agregar matcher para `/juegos/:id/jugar`; si `getUser()` no devuelve usuario, `NextResponse.redirect(new URL('/acceso', request.url))`.
3. **`lib/session.tsx`**: quitar `isGuest` y toda la lógica de invitado; `email` deja de aceptar `null`.
4. **`components/auth-form.tsx`**: quitar botón "JUGAR COMO INVITADO" y su handler.
5. **`components/game-player.tsx`, `components/hall-of-fame.tsx`, `components/nav.tsx`**: quitar referencias a `isGuest`.
6. **Verificación**: `tsc`, `lint`, `build`; prueba manual de acceso sin sesión a `/juegos/[id]/jugar` (redirige) y con sesión (juega y guarda puntaje).

---

## Criterios de aceptación

- [ ] Visitar `/juegos/[id]/jugar` sin sesión redirige a `/acceso`.
- [ ] Visitar `/juegos/[id]/jugar` con sesión real permite jugar y guardar puntaje con el alias del usuario.
- [ ] El botón "JUGAR COMO INVITADO" ya no existe en `/acceso`.
- [ ] `lib/session.tsx` no contiene `isGuest` ni lógica de invitado.
- [ ] La tabla `scores` queda vacía inmediatamente después de la migración.
- [ ] `/`, `/biblioteca`, `/juegos/[id]`, `/salon`, `/acerca-de` siguen accesibles sin sesión.
- [ ] `tsc`, `lint` y `build` pasan sin errores nuevos.

---

## Decisiones tomadas y descartadas

- **Sí:** truncar toda la tabla `scores` — no hay columna que distinga invitado de usuario real; decisión explícita del usuario, acepta perder también puntajes de usuarios reales.
- **Sí:** proteger solo `/juegos/[id]/jugar` — el resto del sitio (catálogo, detalle, hall of fame, landing) sigue público.
- **No:** parámetro de retorno tras login — redirect fijo simplifica; se puede agregar en spec futura.
- **No:** sesión anónima de Supabase Auth como reemplazo del invitado — se elimina el concepto por completo, sin sustituto.

---

## Riesgos identificados

| Riesgo                                                                    | Mitigación                                                                                            |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `TRUNCATE` de `scores` es irreversible, sin backup previo                 | Confirmar explícitamente con el usuario antes de ejecutar la migración en `/spec-impl`.               |
| Usuarios acostumbrados al modo invitado pierden esa opción sin aviso      | Fuera de alcance (MVP interno); se puede agregar mensaje en spec futura si hace falta.                |
| Redirect en `proxy.ts` corre en Edge runtime, `getUser()` agrega latencia | Ya se paga hoy en SPEC 24 (`updateSession` llama `getUser()` en cada request); no es costo adicional. |

---

## Lo que **no** está en esta spec

- Protección de rutas distintas a `/juegos/[id]/jugar`.
- Parámetro `?redirect=` post-login.
- Sesión anónima como reemplazo del invitado.
- Migración o backup de los puntajes borrados.
