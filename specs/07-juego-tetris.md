# SPEC 07 — Juego Tetris (motor real + leaderboard Supabase)

> **Estado:** Aprobado
> **Depende de:** SPEC 05 (motor real de Asteroides), SPEC 06 (leaderboard Supabase de Asteroides), Paso 0 de esta misma spec (refactor de generalización, primer uso)
> **Fecha:** 2026-08-05
> **Objetivo:** Portar el motor de `references/started-games/03-tetris/game.js` a TypeScript como una nueva entrada `"tetris"` en el catálogo, con canvas jugable real 300×600, HUD sin columna de vidas, leaderboard real en Supabase, y generalizar por primera vez la integración condicional (`isAsteroides` → registry por `engine`) sin tocar el comportamiento de Asteroides ni de los 8 mocks restantes.

---

## Alcance

**Dentro:**

0. **Refactor de generalización de la plataforma de juegos** (primera vez, ver `references/mapa-integracion.md`):
   - Extraer `EngineCallbacks` y el tipo de motor genérico a `lib/games/types.ts`.
   - Crear `lib/games/registry.ts` con un registry `id -> factory`: entradas `asteroides: createAsteroidesEngine`, `tetris: createTetrisEngine`.
   - Agregar campo opcional `engine?: string` al tipo `Game` (`lib/games.ts`): si está presente, es la key en el registry Y la señal de "tiene motor real + leaderboard real". Se asigna `engine: "asteroides"` a la entrada existente y `engine: "tetris"` a la nueva.
   - Reemplazar los 3 `isAsteroides`/literales `"asteroides"` hardcodeados (`game-player.tsx`, `app/juegos/[id]/page.tsx`, `hall-of-fame.tsx`) por una consulta al registry/flag `game.engine`, y los literales `"asteroides"` pasados a `fetchTopScores`/`insertScore` por `game.id`.
   - Sin cambio de comportamiento observable para Asteroides ni para los 8 mocks.
1. **Nueva entrada en el catálogo** (`lib/games.ts`): `id: "tetris"`, `title: "TETRIS"`, `short: "Encaja piezas y limpia líneas antes de que se acumulen."`, `long` a definir en el paso de implementación (párrafo coherente con el resto del catálogo), `cat: "PUZZLE"`, `cover: "cover-tetris"`, `color: "yellow"`, `engine: "tetris"`, `best`/`plays` placeholder.
2. **Clase CSS `.cover-tetris`** en `app/globals.css`, patrón `::after`/`::before` como las demás `.cover-*`.
3. **Clase CSS `.tetris-canvas`** nueva en `app/globals.css` (300×600), sin tocar `.asteroides-canvas` existente.
4. **Motor portado a TypeScript** en `lib/games/tetris/engine.ts`: tablero `10×20`, 8 piezas (7 estándar + "N"), rotación con wall-kicks, soft/hard drop, ghost piece, sistema de puntaje y nivel por líneas, tal como en `game.js`. Expone `createTetrisEngine(canvas, callbacks)` con `{ start, pause, resume, restart, destroy }` y callbacks `onScore`/`onLives`/`onLevel`/`onGameOver`, con este mapeo explícito (Tetris no tiene vidas múltiples):
   - `onLives(1)` al iniciar/reiniciar, `onLives(0)` al entrar en game over.
   - `onLevel(level)` = nivel real de velocidad de Tetris (sube cada 10 líneas), no una traducción artificial.
   - Sin callback ni HUD para "líneas" — queda como dato interno del motor que solo afecta el cálculo de nivel/velocidad.
5. **`components/game-player.tsx`** condicional puntual `game.id === "tetris"` (mismo patrón que Asteroides, sin abstraer aún un array de stats): monta el canvas real 300×600, oculta la columna "VIDAS" del HUD para este juego, sincroniza Puntuación/Nivel vía callbacks.
6. **Pausa real, fin de partida sin doble camino** (se remueve el reinicio interno por tecla `P`/overlay del original; el único reinicio es el modal de React vía `restart()`), **canvas fijo 300×600** — mismas decisiones que Asteroides.
7. **Guardado de puntaje real**: `saveScore` (localStorage) + `insertScore` (Supabase, `game_id: "tetris"`) sin migración nueva.
8. **Leaderboard real en ficha de detalle** (`app/juegos/[id]/page.tsx`) y **Salón de la Fama** (`components/hall-of-fame.tsx`) para `tetris`, mismo tratamiento de estado vacío/parcial que Asteroides (podio oculto con <3 filas, mensaje "AÚN NO HAY PUNTAJES" con 0 filas), vía el registry/flag del Paso 0 en vez de un nuevo `if` hardcodeado.
9. **"TU MEJOR MARCA" real** para `tetris` en el Salón de la Fama, buscando por `player_name === user.name`.

**Fuera de alcance (para specs futuras):**

- Controles táctiles (el original solo soporta teclado).
- Autenticación real / rate limiting / CAPTCHA.
- Supabase Realtime.
- Sonido/efectos de audio (el original no tiene).
- HUD de "líneas" como dato visible (queda interno al motor).
- Theme toggle claro/oscuro del `style.css` original (Arcade Vault usa tema único fijo).
- Borrado o edición de puntajes guardados.
- Generalizar `.asteroides-canvas` a una clase de canvas parametrizable (se agrega `.tetris-canvas` como clase hermana, no se toca la existente).
- Abstraer el layout de HUD en un array de stats por juego (se mantiene el condicional puntual `game.id === "tetris"`, igual que Asteroides).

---

## Modelo de datos

Sin nuevas estructuras de persistencia — reutiliza `Game` (`lib/games.ts`, con el campo `engine?: string` agregado en el Paso 0), `scores` (Supabase, ya existente, `game_id` libre) y `fetchTopScores`/`insertScore` de `lib/scores.ts` tal cual.

Tipo genérico nuevo en `lib/games/types.ts` (Paso 0, primera vez que se extrae):

```ts
export type EngineCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type Engine = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  destroy: () => void;
};
```

`lib/games/registry.ts` (Paso 0):

```ts
import type { Engine, EngineCallbacks } from "./types";

export type EngineFactory = (
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
) => Engine;

export const ENGINE_REGISTRY: Record<string, EngineFactory> = {
  asteroides: createAsteroidesEngine,
  tetris: createTetrisEngine,
};
```

`lib/games/tetris/engine.ts` (Paso 2):

```ts
export function createTetrisEngine(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
): Engine;
```

Las estructuras internas del tablero (`board`, `current`, `next`, tipos de pieza `PIECES`/`COLORS`) no se exportan — detalle de implementación del módulo, igual que en el `game.js` original. `lib/games/asteroides/engine.ts` se ajusta para importar `EngineCallbacks`/`Engine` desde `lib/games/types.ts` en vez de declararlos localmente (sin cambio de comportamiento).

---

## Plan de implementación

Cada paso deja el proyecto compilando y navegable.

### Paso 0 — Refactor de generalización

Crear `lib/games/types.ts` con `EngineCallbacks`/`Engine` (ver Modelo de datos). Actualizar `lib/games/asteroides/engine.ts` para importar esos tipos en vez de declararlos localmente — sin cambiar su lógica interna. Crear `lib/games/registry.ts` con `ENGINE_REGISTRY` (por ahora solo `asteroides`, `tetris` se agrega en el Paso 2). Agregar `engine?: string` al tipo `Game` en `lib/games.ts` y asignar `engine: "asteroides"` a esa entrada. Reemplazar en `game-player.tsx` (L17), `app/juegos/[id]/page.tsx` (L26-35) y `hall-of-fame.tsx` (L12, L22-31) los `isAsteroides`/literales `"asteroides"` por `game.engine`/`ENGINE_REGISTRY[game.engine]`/`game.id`. Verificar que Asteroides y los 8 mocks siguen funcionando exactamente igual (`npm run dev`, smoke test de `/juegos/asteroides/jugar` y de un mock cualquiera).

### Paso 1 — Catálogo y portada

Agregar la entrada `tetris` a `GAMES` en `lib/games.ts` (con `engine: "tetris"`) y las clases `.cover-tetris`/`.tetris-canvas` en `app/globals.css`. Sin motor todavía: `/juegos/tetris` ya muestra la ficha de detalle con el mock genérico funcionando.

### Paso 2 — Motor portado a TypeScript

Crear `lib/games/tetris/engine.ts` portando `game.js`: constantes (`COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES`), utilidades (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`), acciones (`hardDrop`, `softDrop`, `lockPiece`, `spawn`), dibujo (`draw`, `drawBlock`, `drawGrid`; se omite `drawNext`/`next-canvas` — no hay panel de "siguiente pieza" en el HUD de `GamePlayer`, queda fuera de esta spec), loop y `createTetrisEngine(canvas, callbacks)`. Cambios respecto al original:

- El canvas se recibe por parámetro (no `document.getElementById`).
- Los listeners de teclado se agregan en `start()`/quitan en `destroy()`.
- `update()`/`lockPiece()` invocan `onScore(score)` y `onLevel(level)` cuando cambian; `onLives(1)` se emite en `start()`/`restart()`, `onLives(0)` y `onGameOver(score)` al entrar en game over.
- Se remueve el toggle de pausa por tecla `P` en favor del botón PAUSA de React (mismo patrón que Asteroides: el motor expone `pause()`/`resume()`, no maneja su propio overlay ni atajo de teclado para pausar).
- `preventDefault()` se mantiene en `Espacio` (hard drop) para no scrollear la página.
- `restart()` re-ejecuta `init()` y `resume()`.

Registrar `tetris: createTetrisEngine` en `ENGINE_REGISTRY` (`lib/games/registry.ts`). Módulo sin consumidores en UI todavía — no cambia ninguna pantalla existente.

### Paso 3 — Integración condicional en `GamePlayer`

En `components/game-player.tsx`, extender la rama ya generalizada en el Paso 0 (`ENGINE_REGISTRY[game.engine]`) para que funcione con cualquier motor registrado: montar canvas real (dimensiones del motor: 800×600 para Asteroides, 300×600 para Tetris), instanciar la factory correspondiente en un `useEffect` (con `destroy()` en el cleanup), conectar callbacks a los mismos `useState` de `score`/`lives`/`level`/`over`. Agregar el condicional puntual `game.id === "tetris"` que oculta la columna "VIDAS" del HUD (Puntuación/Nivel visibles, Vidas no). Para cualquier `game.id` sin entrada en el registry, cae al mock actual sin cambios.

### Paso 4 — Leaderboard real (ficha de detalle + Salón de la Fama)

En `app/juegos/[id]/page.tsx` y `components/hall-of-fame.tsx`, extender la condición generalizada en el Paso 0 (antes solo `asteroides`) para que cualquier juego con `engine` definido use `fetchTopScores`/`insertScore` con `game.id`/`gameId` real en vez de `seededScores`. Mismo tratamiento de estado vacío/parcial (podio oculto <3 filas, mensaje "AÚN NO HAY PUNTAJES" con 0 filas) y de "TU MEJOR MARCA" ya implementado para Asteroides, ahora aplicado también a Tetris sin código duplicado.

### Paso 5 — Verificación manual

`npm run dev`, jugar una partida completa de Tetris en `/juegos/tetris/jugar`: piezas controlables, rotación con wall-kicks, ghost piece visible, soft/hard drop, nivel sube cada 10 líneas, HUD sin columna "VIDAS", pausa detiene el loop, game over al bloquear una pieza en la fila de spawn, guardar puntaje. Confirmar con `mcp__supabase__execute_sql` que la fila aparece con `game_id: "tetris"`. Confirmar que Asteroides y los 8 mocks siguen sin cambios de comportamiento.

### Paso 6 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

### Refactor de generalización

- [ ] `lib/games/types.ts` exporta `EngineCallbacks`/`Engine`; `lib/games/asteroides/engine.ts` los importa desde ahí en vez de declararlos localmente, sin cambio de comportamiento.
- [ ] `lib/games/registry.ts` exporta `ENGINE_REGISTRY` con entradas `asteroides` y `tetris`.
- [ ] `Game` (`lib/games.ts`) tiene el campo opcional `engine?: string`; la entrada `asteroides` lo tiene seteado a `"asteroides"`.
- [ ] `game-player.tsx`, `app/juegos/[id]/page.tsx` y `hall-of-fame.tsx` consultan `game.engine`/`ENGINE_REGISTRY` en vez de `isAsteroides`/literales `"asteroides"` hardcodeados.
- [ ] Asteroides (`/juegos/asteroides/jugar`, ficha de detalle, Salón de la Fama) sigue funcionando exactamente igual que antes del refactor.
- [ ] Los 8 mocks siguen mostrando su HUD simulado y `seededScores` sin cambios.

### Catálogo

- [ ] `GAMES` en `lib/games.ts` incluye la entrada `id: "tetris"` con los campos definidos en el Alcance, incluyendo `engine: "tetris"`.
- [ ] `.cover-tetris` y `.tetris-canvas` existen en `app/globals.css` y se ven en la tarjeta de biblioteca, portada de detalle y reproductor.
- [ ] `/juegos/tetris` renderiza la ficha de detalle con título, descripción y leaderboard, igual que cualquier otro juego.

### Motor

- [ ] `lib/games/tetris/engine.ts` exporta `createTetrisEngine(canvas, callbacks)` sin exportar las estructuras internas (`board`, piezas, colores).
- [ ] El motor no agrega listeners de teclado a nivel de módulo — solo entre `start()` y `destroy()`.
- [ ] `onScore`/`onLevel` se disparan cuando el valor correspondiente cambia; `onLives(1)` se emite en `start()`/`restart()`, `onLives(0)` y `onGameOver(finalScore)` al entrar en game over.
- [ ] Rotación con wall-kicks, ghost piece, soft drop y hard drop funcionan igual que en `game.js`.
- [ ] El nivel sube cada 10 líneas y acelera `dropInterval` igual que el original.
- [ ] No existe ningún camino de reinicio por tecla — solo `restart()` desde el modal de React.

### Integración en el reproductor

- [ ] En `/juegos/tetris/jugar`, las piezas se controlan con `←`/`→`/`↑`/`↓`, hard drop con `Espacio` (con `preventDefault`); el canvas 300×600 se ve dentro de `.crt-screen`.
- [ ] El HUD muestra Puntuación y Nivel reales; la columna "VIDAS" no se muestra para `tetris`.
- [ ] El botón PAUSA detiene el juego; REANUDAR lo continúa.
- [ ] Al bloquear una pieza que colisiona en el spawn, aparece el modal "FIN DEL JUEGO" con el puntaje real; "GUARDAR PUNTUACIÓN" llama a `saveScore` e `insertScore` (`game_id: "tetris"`).
- [ ] "JUGAR DE NUEVO" reinicia el motor sin recargar la página; "SALIR" navega a `/juegos/tetris` y desmonta el canvas sin listeners colgados.
- [ ] Asteroides y los 8 mocks siguen mostrando su HUD (real o simulado) sin cambios de comportamiento.

### Leaderboard (ficha de detalle + Salón de la Fama)

- [ ] `/juegos/tetris` con tabla vacía muestra "AÚN NO HAY PUNTAJES"; con datos reales, muestra hasta 10 filas ordenadas por puntaje descendente.
- [ ] Salón de la Fama, pestaña Tetris: con 0 filas no se renderiza podio ni tabla (mensaje vacío); con 1-2 filas, tabla sin podio; con 3+, podio y tabla con datos reales.
- [ ] "TU MEJOR MARCA EN TETRIS" aparece solo si el usuario en sesión tiene al menos una fila propia.
- [ ] Guardar un puntaje en Tetris no afecta el leaderboard de Asteroides ni de los mocks, y viceversa.

### Compilación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npm run lint` pasa sin advertencias nuevas.
- [ ] `npm run build` termina sin errores.

---

## Decisiones tomadas y descartadas

### Nueva entrada `"tetris"` en vez de reemplazar `caida`

- **Sí:** aunque `caida` describe temáticamente el mismo juego, reemplazarla habría descartado una entrada mock ya curada (con su propio `best`/`plays`/seed) sin necesidad. Decisión explícita del usuario, mismo criterio que "asteroides" vs "rocas" en spec 05.
- **No:** reutilizar `caida` — habría acoplado el juego real a datos pensados para el mock y afectado el seed de `seededScores` (depende de `id.length`).

### Refactor de generalización con flag único `engine?: string` (no dos flags separados)

- **Sí:** un solo campo cubre ambos propósitos (key del registry + señal de "tiene motor y leaderboard reales") sin redundancia; hoy no hay caso real de un juego con motor pero sin leaderboard real, o viceversa. Decisión explícita del usuario sobre las opciones presentadas en `mapa-integracion.md`.
- **No:** `engine?: string` + `hasRealLeaderboard: boolean` — dos campos que hoy siempre viajarían juntos, especulando sobre una separación que no se necesita todavía.

### Canvas propio 300×600, sin generalizar `.asteroides-canvas`

- **Sí:** fiel al tablero original de Tetris (10×20 celdas de 30px); se agrega `.tetris-canvas` como clase hermana en vez de tocar código ya implementado y verificado de Asteroides. Decisión explícita del usuario.
- **No:** estandarizar a 800×600 — no es fiel al diseño original y dejaría mucho espacio vacío alrededor del tablero.

### HUD sin columna "VIDAS" para Tetris, con condicional puntual `game.id === "tetris"`

- **Sí:** Tetris no tiene vidas múltiples (game over es un solo golpe); ocultar la columna es más honesto que mostrar un `1`/`0` fijo sin sentido de "vida". Se resuelve con el mismo patrón de condicional puntual que ya usa Asteroides, sin abstraer un array de stats configurable por juego todavía (se decide con un tercer caso real). Decisión explícita del usuario.
- **No:** mantener "Vidas" con `onLives(1)`→`onLives(0)` fijo, o abstraer ya el layout de HUD — ambas opciones se descartaron por el usuario a favor de ocultar la columna con el condicional existente.

### Sin HUD de "líneas" visible

- **Sí:** mantiene el layout de `GamePlayer` sin ampliarlo con una columna nueva; "líneas" sigue siendo relevante solo como dato interno que alimenta el cálculo de nivel/velocidad, igual que en el original. Decisión explícita del usuario.
- **No:** agregar una cuarta columna al HUD — más alcance no pedido, afecta el layout compartido con los demás juegos.

### Reinicio solo vía modal, se remueve la pausa/overlay por tecla `P`

- **Sí:** mismo criterio que Asteroides (spec 05) — un solo camino de reinicio evita estados inconsistentes con el flujo de guardado de puntaje; la pausa pasa a ser controlada por el botón PAUSA de React, no por un atajo de teclado propio del motor.
- **No:** conservar el overlay/atajo `P` original — hubiera duplicado la UI de pausa (overlay propio del motor + modal de React) sin necesidad.

### Sin panel "siguiente pieza" (`next-canvas`) en esta spec

- **Sí:** el HUD actual de `GamePlayer` no tiene un espacio para preview de pieza; agregarlo es una ampliación de UI no pedida, fuera del patrón ya establecido por Asteroides. El motor puede calcular `next` igual, solo no se expone su render.
- **No:** portar `drawNext`/`next-canvas` ya — se deja para una spec futura si se decide agregar esa función al reproductor.

### Sin assets adicionales

- **Sí:** el original es 100% canvas + colores planos; no hay nada que declarar como alcance de `public/tetris/...`. Decisión explícita del usuario.
- **No:** aplica — no hay opción descartada, el original no trae sprites ni audio.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                           | Mitigación                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Refactor de generalización toca 3 archivos que ya funcionan con Asteroides.** Reemplazar los `isAsteroides` hardcodeados por `game.engine`/registry podría introducir una regresión sutil en Asteroides si el mapeo queda mal. | Paso 0 se verifica de forma aislada (smoke test de Asteroides) antes de escribir una sola línea del motor de Tetris; los criterios de aceptación exigen explícitamente que Asteroides y los mocks no cambien. |
| **Doble montaje en desarrollo (React `StrictMode`).** Igual que en Asteroides, el `useEffect` que crea el motor corre dos veces en dev.                                                                                          | `destroy()` cancela el `requestAnimationFrame` pendiente y remueve los listeners `keydown` agregados en `start()`, mismo patrón ya probado en `lib/games/asteroides/engine.ts`.                               |
| **Canvas fijo 300×600 en pantallas pequeñas/táctiles.** Sin escalado responsivo, puede desbordar o verse diminuto en móvil.                                                                                                      | Aceptado como fuera de alcance (decisión explícita); se resuelve en una spec futura si se prioriza soporte móvil.                                                                                             |
| **`game.best`/`game.plays` no sincronizados con datos reales (deuda conocida, ver `mapa-integracion.md`).** Ya afecta a Asteroides desde spec 05/06; se hereda para Tetris.                                                      | Riesgo aceptado, sin plan de mitigación en esta spec — se resuelve junto con Asteroides si se prioriza.                                                                                                       |
| **`insertScore` falla en silencio (deuda conocida).** Sin feedback en UI si el insert a Supabase falla; el jugador puede creer que su puntaje quedó guardado cuando solo se guardó en localStorage.                              | Riesgo aceptado, mismo comportamiento heredado de spec 06 — se resuelve junto con Asteroides si se prioriza.                                                                                                  |
| **Ningún handler hace `preventDefault()` salvo `Espacio` (deuda conocida).** Flechas/`↓` también hacen scroll de la página mientras se juega.                                                                                    | Riesgo aceptado, mismo comportamiento heredado de Asteroides; se documenta, no se corrige de oficio en esta spec.                                                                                             |

---

## Qué **no** está en esta spec

- Controles táctiles.
- Autenticación real / rate limiting / CAPTCHA.
- Supabase Realtime.
- Sonido/efectos de audio.
- HUD de "líneas" como dato visible en el reproductor.
- Panel de "siguiente pieza" (`next-canvas`) en el reproductor.
- Theme toggle claro/oscuro (Arcade Vault usa tema único fijo).
- Borrado o edición de puntajes guardados.
- Generalización de `.asteroides-canvas` a una clase parametrizable.
- Abstracción de layout de HUD en un array de stats configurable por juego.
- Leaderboard real para los 7 mocks restantes (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`).
- Migración de `caida` a motor real (sigue como mock independiente).

Cada uno de estos, si se necesita, va en su propia spec.
