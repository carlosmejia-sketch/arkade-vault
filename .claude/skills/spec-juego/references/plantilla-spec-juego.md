# Plantilla — spec de juego real con leaderboard

Calcada de la estructura real de `specs/05-juego-asteroides.md` + `specs/06-leaderboard-asteroides-supabase.md`
fusionadas en un solo spec. Reemplaza `<slug>`, `<Slug>`, `<TÍTULO>` y los corchetes `[...]`.

```markdown
# SPEC NN — Juego <Título> (motor real + leaderboard Supabase)

> **Estado:** Borrador
> **Depende de:** SPEC 05 (motor real de Asteroides), SPEC 06 (leaderboard Supabase de Asteroides)[, refactor de generalización de esta spec si aplica]
> **Fecha:** [fecha]
> **Objetivo:** [una frase — portar/crear <Título>, motor jugable real con leaderboard Supabase, sin tocar el comportamiento de los juegos existentes]

---

## Alcance

**Dentro:**

0. **[Solo si aplica] Refactor de generalización de la plataforma de juegos:** extraer `EngineCallbacks`/tipo de motor a `lib/games/types.ts`, registry `id -> factory` en `lib/games/registry.ts`, flag en `Game` (`lib/games.ts`) que reemplaza los `isAsteroides` hardcodeados en `game-player.tsx`, `app/juegos/[id]/page.tsx` y `hall-of-fame.tsx`. Sin cambio de comportamiento observable para Asteroides ni los mocks.
1. **Nueva entrada en el catálogo** (`lib/games.ts`): `id: "<slug>"`, `title`, `short`, `long`, `cat`, `cover: "cover-<slug>"`, `color`, `best`/`plays` placeholder.
2. **Clase CSS `.cover-<slug>`** en `app/globals.css`, patrón `::after`/`::before` como `.cover-asteroides`.
3. **Motor portado/creado en TypeScript** en `lib/games/<slug>/engine.ts`: [clases/estado internos]. Expone `create<Slug>Engine(canvas, callbacks)` con `{ start, pause, resume, restart, destroy }` y callbacks `onScore`/`onLives`/`onLevel`/`onGameOver` (o el mapeo que corresponda si el juego no tiene vidas/niveles literales — documentarlo aquí).
4. **`components/game-player.tsx`** condicional por el juego: monta canvas real y sincroniza HUD vía callbacks en vez del mock `setInterval`. Otros juegos sin cambio.
5. **Pausa real**, **fin de partida sin doble camino** (reinicio solo vía modal), **canvas fijo [WxH]** — mismas decisiones que Asteroides salvo justificación explícita de cambiarlas.
6. **Guardado de puntaje real**: `saveScore` (localStorage) + `insertScore` (Supabase, `game_id: "<slug>"`) sin migración nueva — la tabla `scores` ya admite cualquier `game_id`.
7. **Leaderboard real en ficha de detalle** (`app/juegos/[id]/page.tsx`) y **Salón de la Fama** (`components/hall-of-fame.tsx`) para `<slug>`, con estado vacío/parcial igual que Asteroides (podio oculto con <3 filas, mensaje "AÚN NO HAY PUNTAJES" con 0 filas).
8. **"TU MEJOR MARCA" real** para `<slug>` en el Salón de la Fama, buscando por `player_name === user.name`.

**Fuera de alcance (para specs futuras):**

- Controles táctiles (salvo que el juego los requiera de origen).
- Autenticación real / rate limiting / CAPTCHA.
- Supabase Realtime.
- Sonido/efectos de audio [salvo que el juego de referencia los traiga — declararlo explícito].
- Borrado o edición de puntajes guardados.
- [cualquier feature del juego original que se decida no portar todavía]

---

## Modelo de datos

Sin nuevas estructuras de persistencia — reutiliza `Game` (`lib/games.ts`), `scores`
(Supabase, ya existente, `game_id` libre) y `fetchTopScores`/`insertScore` de `lib/scores.ts`
tal cual.

Tipos nuevos acotados al motor, en `lib/games/<slug>/engine.ts` (o `lib/games/types.ts` si
es el primer juego que generaliza):

\`\`\`ts
export type EngineCallbacks = { /* ... */ };
export type <Slug>Engine = { start, pause, resume, restart, destroy };
export function create<Slug>Engine(canvas: HTMLCanvasElement, callbacks: EngineCallbacks): <Slug>Engine;
\`\`\`

---

## Plan de implementación

Cada paso deja el proyecto compilando y navegable.

### Paso 0 — Refactor de generalización [solo si aplica]

[...]

### Paso 1 — Catálogo y portada

[...]

### Paso 2 — Motor portado/creado a TypeScript

[...]

### Paso 3 — Integración condicional en `GamePlayer`

[...]

### Paso 4 — Leaderboard real (ficha de detalle + Salón de la Fama)

[...]

### Paso 5 — Verificación manual

`npm run dev`, jugar una partida completa, guardar puntaje, confirmar con
`mcp__supabase__execute_sql` que la fila aparece, confirmar que otros juegos no cambian.

### Paso 6 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

### Catálogo

- [ ] ...

### Motor

- [ ] ...

### Integración en el reproductor

- [ ] ...

### Leaderboard (ficha de detalle + Salón de la Fama)

- [ ] ...

### Compilación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npm run lint` pasa sin advertencias nuevas.
- [ ] `npm run build` termina sin errores.

---

## Decisiones tomadas y descartadas

### [Decisión 1]

- **Sí:** ...
- **No:** ...

---

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| ...    | ...        |

---

## Qué **no** está en esta spec

- ...
```
