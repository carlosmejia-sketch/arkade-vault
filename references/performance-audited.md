# Registro de auditoría de performance

Memoria del agente `game-performance-booster`. No se borra historia — solo cambia estado y se
agrega la razón.

## Estado

| Juego                                   | Auditado  | Fixes aplicados | Spec                               | Fecha      |
| --------------------------------------- | --------- | --------------- | ---------------------------------- | ---------- |
| asteroides                              | auditado  | 9 fixes         | specs/19-performance-asteroides.md | 2026-08-20 |
| tetris                                  | auditado  | 6 fixes         | specs/20-performance-tetris.md     | 2026-08-20 |
| arkanoid                                | auditado  | 9 fixes         | specs/21-performance-arkanoid.md   | 2026-08-20 |
| snake                                   | auditado  | 5 fixes         | specs/22-performance-snake.md      | 2026-08-20 |
| frogger                                 | auditado  | 6 fixes         | specs/23-performance-frogger.md    | 2026-08-20 |
| juegos futuros (aún no en lib/games.ts) | pendiente | —               | —                                  | —          |

Notas:

- Baseline de código: 2026-08-20, fecha de `specs/18-performance-motores.md`. Ese spec **no aplicó
  ningún fix** — midió los 5 motores con Playwright y no reprodujo ninguno de los síntomas reportados
  (FPS/stuttering, degradación progresiva, retraso de input, arranque lento), pero dejó un inventario
  de patrones costosos que sí es auditable por lectura de código (checklist embebido en el agente).
- Limitación de medición conocida: el Chromium headless usado por Playwright en este entorno no está
  sincronizado a un refresco de 60Hz real — `requestAnimationFrame` dispara a ~160fps (frame time
  ~6.25ms), un presupuesto mucho más laxo que una pantalla real. Un resultado "estable" en una
  medición con Playwright no descarta un hallazgo de la auditoría estática.

## Fichas

<!--
### `<id>` (`specs/NN-performance-<id>.md`, <fecha>)

| # | Regla | Resultado | archivo:línea | Severidad |
|---|-------|-----------|----------------|-----------|

**Fixes aplicados:**
- ...

**Compilación:** tsc / lint / build — resultado.
-->

### `asteroides` (`specs/19-performance-asteroides.md`, 2026-08-20)

| #   | Regla                                                     | Resultado                                          | archivo:línea                                       | Severidad                     |
| --- | --------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------- | ----------------------------- |
| 1   | `loop()` clampea `dt`                                     | Pasa                                               | `lib/games/asteroides/engine.ts` (`loop`)           | —                             |
| 2   | `destroy()` cancela rAF y listeners                       | Pasa                                               | `lib/games/asteroides/engine.ts` (`destroy`)        | —                             |
| 3   | `start()` idempotente                                     | Fallaba → corregido                                | `lib/games/asteroides/engine.ts` (`start`)          | baja                          |
| 4   | Callbacks async de assets guardados contra desmontaje     | No aplica                                          | —                                                   | —                             |
| 5   | Loop se pausa en game over y `visibilitychange`           | Fallaba → corregido                                | `lib/games/asteroides/engine.ts` (`loop`, `start`)  | media                         |
| 6   | `emitIfChanged` con reseteo en `initGame`                 | Pasa                                               | `lib/games/asteroides/engine.ts` (`initGame`)       | —                             |
| 7   | Sin `.filter`/`.map`/`.concat`/spread en update/draw      | Fallaba → corregido                                | `lib/games/asteroides/engine.ts` (`update`)         | alta                          |
| 8   | Sin template literals/`repeat`/`toLocaleString` por frame | Fallaba → corregido                                | `lib/games/asteroides/engine.ts` (`drawHUD`)        | media                         |
| 9   | Sin parsing de color en caliente en `draw()`              | Fallaba → corregido                                | `lib/games/asteroides/engine.ts` (`withAlpha`)      | alta                          |
| 10  | Sin objetos DOM/media creados en el loop                  | Pasa                                               | —                                                   | —                             |
| 11  | Geometría estática cacheada offscreen                     | No aplica (motor vectorial)                        | —                                                   | —                             |
| 12  | Cache de sprites con clave completa                       | No aplica (sin spritesheet)                        | —                                                   | —                             |
| 13  | Colisiones con broad-phase                                | Fallaba → corregido (rejilla)                      | `lib/games/asteroides/engine.ts` (`update`)         | alta                          |
| 14  | Sin `.every`/`.some` anidados en un `for` externo         | Pasa                                               | —                                                   | —                             |
| 15  | Colecciones acotadas                                      | Pasa                                               | `lib/games/asteroides/engine.ts`                    | —                             |
| 16  | Bucles de rechazo con límite de intentos                  | Fallaba → corregido                                | `lib/games/asteroides/engine.ts` (`spawnAsteroids`) | baja                          |
| 17  | `save()/restore()` o restauración explícita               | Pasa                                               | `lib/games/asteroides/engine.ts`                    | —                             |
| 18  | `devicePixelRatio` si el canvas se escala por CSS         | Fallaba → corregido                                | `lib/games/asteroides/engine.ts` (setup)            | baja                          |
| 19  | Sin `localStorage` en inicializador de `useState`         | Falla conocida, sin fix (SPEC 18)                  | `components/game-player.tsx:31-38`                  | baja                          |
| 20  | `TouchControls` memoizado                                 | Fallaba → corregido (compartido)                   | `components/touch-controls.tsx`                     | media                         |
| 21  | Timers de auto-repeat táctil con cleanup                  | No se manifiesta en Asteroides (`repeatCodes: []`) | `components/touch-controls.tsx`                     | — (pendiente para otro juego) |

**Fixes aplicados:**

- Cache de parseo de color (`withAlpha`/`parseColor`) — regla 9.
- `compact()` para remover elementos muertos en el propio arreglo en vez de `.filter()`/`.concat()`,
  y bucles `for...of` en vez de `push(...spread)` — regla 7.
- Broad-phase por rejilla uniforme (`COLLISION_CELL = 128`) para colisión bala↔asteroide — regla 13.
- El loop se detiene solo tras game over (cuando ya no quedan partículas de la explosión) y agrega
  listener de `visibilitychange` que pausa/reanuda sin pisar pausa manual — regla 5.
- Cache de texto de HUD (`hudScoreCache`/`hudLevelCache`) — regla 8.
- `React.memo` en `components/touch-controls.tsx` (compartido por los 5 juegos) — regla 20.
- Límite de intentos (`MAX_ATTEMPTS = 50`) en `spawnAsteroids` — regla 16.
- `devicePixelRatio` + `ctx.scale` al crear el motor — regla 18.
- `start()` idempotente (`if (running) return`) — regla 3.

**Compilación:** `tsc --noEmit` sin errores · `lint` con los 4 errores preexistentes de
`.claude/hooks/format-on-write.js` (no relacionados) · `build` sin errores, 20 páginas generadas.

### `tetris` (`specs/20-performance-tetris.md`, 2026-08-20)

| #   | Regla                                                     | Resultado                                                        | archivo:línea                                       | Severidad |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- | --------- |
| 1   | `loop()` clampea `dt`                                     | Fallaba → corregido                                              | `lib/games/tetris/engine.ts` (`loop`)               | alta      |
| 2   | `destroy()` cancela rAF y listeners                       | Pasa                                                             | `lib/games/tetris/engine.ts` (`destroy`)            | —         |
| 3   | `start()` idempotente                                     | Fallaba → corregido                                              | `lib/games/tetris/engine.ts` (`start`)              | baja      |
| 4   | Callbacks async de assets guardados contra desmontaje     | No aplica                                                        | —                                                   | —         |
| 5   | Loop se pausa en game over y `visibilitychange`           | Fallaba → corregido                                              | `lib/games/tetris/engine.ts` (`loop`, `start`)      | media     |
| 6   | `emitIfChanged` con reseteo en `initGame`                 | Pasa                                                             | `lib/games/tetris/engine.ts` (`initGame`)           | —         |
| 7   | Sin `.filter`/`.map`/`.concat`/spread en update/draw      | Pasa                                                             | —                                                   | —         |
| 8   | Sin template literals/`repeat`/`toLocaleString` por frame | Fallaba → corregido (consecuencia del fix de la regla 5)         | `lib/games/tetris/engine.ts:271` (overlay gameover) | media     |
| 9   | Sin parsing de color en caliente en `draw()`              | Pasa                                                             | —                                                   | —         |
| 10  | Sin objetos DOM/media creados en el loop                  | Pasa                                                             | —                                                   | —         |
| 11  | Geometría estática cacheada offscreen                     | Fallaba → corregido (`gridCache`)                                | `lib/games/tetris/engine.ts` (`draw`)               | media     |
| 12  | Cache de sprites con clave completa                       | No aplica (sin spritesheet)                                      | —                                                   | —         |
| 13  | Colisiones con broad-phase                                | Pasa (no aplica, colisión por matriz)                            | `lib/games/tetris/engine.ts` (`collide`)            | —         |
| 14  | Sin `.every`/`.some` anidados en un `for` externo         | Falla técnica sin impacto (evento, no por frame) — sin fix       | `lib/games/tetris/engine.ts` (`clearLines`)         | baja      |
| 15  | Colecciones acotadas                                      | Pasa                                                             | `lib/games/tetris/engine.ts`                        | —         |
| 16  | Bucles de rechazo con límite de intentos                  | No aplica                                                        | —                                                   | —         |
| 17  | `save()/restore()` o restauración explícita               | Pasa (con nota de higiene en `textAlign`, sin fix)               | `lib/games/tetris/engine.ts`                        | baja      |
| 18  | `devicePixelRatio` si el canvas se escala por CSS         | Fallaba → corregido (`ctx.scale` + `image-rendering: pixelated`) | `lib/games/tetris/engine.ts`, `app/globals.css`     | baja      |
| 19  | Sin `localStorage` en inicializador de `useState`         | Falla conocida, sin fix (SPEC 18)                                | `components/game-player.tsx:31-38`                  | baja      |
| 20  | `TouchControls` memoizado                                 | Pasa (ya corregido en la invocación de `asteroides`)             | `components/touch-controls.tsx`                     | —         |
| 21  | Timers de auto-repeat táctil con cleanup                  | Fallaba (primer juego con `repeatCodes` no vacío) → corregido    | `components/touch-controls.tsx`                     | media     |

**Fixes aplicados:**

- Clamp de `dt` (`MAX_DT_MS = 50`) en `loop()` — regla 1.
- El loop deja de reprogramar rAF tras `state === "gameover"` y se agregó `visibilitychange`
  (pausa/reanuda sin pisar la pausa manual) — reglas 5 y 8.
- Grilla de fondo cacheada en un canvas offscreen (`gridCache`), copiada con `drawImage` — regla 11.
- `start()` idempotente (`if (running) return`) — regla 3.
- `devicePixelRatio` + `ctx.scale` en el setup del canvas, `image-rendering: pixelated` en
  `.tetris-canvas` (`app/globals.css`) — regla 18.
- `useEffect` de desmontaje en `components/touch-controls.tsx` (compartido) que limpia todos los
  timers de auto-repeat activos — regla 21. Tetris es el primer juego auditado con `repeatCodes` no
  vacío, por eso el hallazgo (anticipado como "pendiente" en la ficha de `asteroides`) se manifiesta
  y se corrige aquí.

**Compilación:** `tsc --noEmit` sin errores · `lint` con los 4 errores preexistentes de
`.claude/hooks/format-on-write.js` (no relacionados) · `build` sin errores, 20 páginas generadas.

**Nota de verificación:** no se contó con herramientas `mcp__playwright__*` en esta invocación, así
que la verificación funcional fue por revisión de código, no por partida jugada en navegador —
documentado como limitación en `specs/20-performance-tetris.md`.

### `arkanoid` (`specs/21-performance-arkanoid.md`, 2026-08-20)

| #   | Regla                                                     | Resultado                                                                        | archivo:línea                                                         | Severidad |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------- |
| 1   | `loop()` clampea `dt`                                     | Pasa                                                                             | `lib/games/arkanoid/engine.ts` (`loop`)                               | —         |
| 2   | `destroy()` cancela rAF y listeners                       | Pasa                                                                             | `lib/games/arkanoid/engine.ts` (`destroy`)                            | —         |
| 3   | `start()` idempotente                                     | Fallaba → corregido                                                              | `lib/games/arkanoid/engine.ts` (`start`)                              | baja      |
| 4   | Callbacks async de assets guardados contra desmontaje     | Fallaba → corregido (único motor con carga async de assets)                      | `lib/games/arkanoid/engine.ts` (`start`, `loadSpritesheet`)           | alta      |
| 5   | Loop se pausa en game over y `visibilitychange`           | Fallaba → corregido                                                              | `lib/games/arkanoid/engine.ts` (`loop`, `onVisibilityChange`)         | media     |
| 6   | `emitIfChanged` con reseteo en `initGame`                 | Pasa                                                                             | `lib/games/arkanoid/engine.ts` (`initGame`)                           | —         |
| 7   | Sin `.filter`/`.map`/`.concat`/spread en update/draw      | Fallaba → corregido                                                              | `lib/games/arkanoid/engine.ts` (`update`, `explosions`)               | alta      |
| 8   | Sin template literals/`repeat`/`toLocaleString` por frame | Fallaba → corregido                                                              | `lib/games/arkanoid/engine.ts` (`draw`, HUD)                          | media     |
| 9   | Sin parsing de color en caliente en `draw()`              | Pasa (`tintCache` evita reparseo)                                                | `lib/games/arkanoid/engine.ts` (`getTinted`)                          | —         |
| 10  | Sin objetos DOM/media creados en el loop                  | Fallaba → corregido (pool de `Audio`)                                            | `lib/games/arkanoid/engine.ts` (`playBounce`, `playBreak`)            | media     |
| 11  | Geometría estática cacheada offscreen                     | Pasa (no aplica — fondo sólido)                                                  | `lib/games/arkanoid/engine.ts` (`draw`)                               | —         |
| 12  | Cache de sprites con clave completa                       | Fallaba → corregido (clave incluye `w`/`h`)                                      | `lib/games/arkanoid/engine.ts` (`drawPaddleTinted`, `drawBallTinted`) | baja      |
| 13  | Colisiones con broad-phase                                | Pasa (barrido lineal ball×≤60 bloques con `break`)                               | `lib/games/arkanoid/engine.ts` (`update`)                             | —         |
| 14  | Sin `.every`/`.some` anidados en un `for` externo         | Fallaba → corregido (contador `aliveBlocks`)                                     | `lib/games/arkanoid/engine.ts` (`update`)                             | media     |
| 15  | Colecciones acotadas                                      | Pasa                                                                             | `lib/games/arkanoid/engine.ts`                                        | —         |
| 16  | Bucles de rechazo con límite de intentos                  | No aplica (sin spawn por rechazo)                                                | —                                                                     | —         |
| 17  | `save()/restore()` o restauración explícita               | Pasa (cada función fija su propio estado antes de dibujar)                       | `lib/games/arkanoid/engine.ts`                                        | —         |
| 18  | `devicePixelRatio` si el canvas se escala por CSS         | Fallaba → corregido (contenido en `engine.ts`, sin tocar CSS compartido)         | `lib/games/arkanoid/engine.ts` (setup)                                | baja      |
| 19  | Sin `localStorage` en inicializador de `useState`         | Falla conocida, sin fix (SPEC 18)                                                | `components/game-player.tsx:31-38`                                    | baja      |
| 20  | `TouchControls` memoizado                                 | Pasa (ya corregido en la invocación de `asteroides`)                             | `components/touch-controls.tsx`                                       | —         |
| 21  | Timers de auto-repeat táctil con cleanup                  | No se manifiesta en Arkanoid (`repeatCodes: []`); cleanup ya existe (compartido) | `components/touch-controls.tsx`                                       | —         |

**Fixes aplicados:**

- Bandera `destroyed` que guarda el callback asíncrono de `loadSpritesheet` contra un desmontaje previo
  a que resuelva — regla 4.
- Compactación in-place de `explosions` en vez de `.filter()` por frame — regla 7.
- El loop deja de reprogramar rAF en estados terminales (`gameover`/`win`) y se agregó
  `visibilitychange` (con bandera `assetsReady` para no chocar con la carga asíncrona del spritesheet)
  — regla 5.
- Cache de texto de HUD (`hudScoreText`/`hudLevelText`) — regla 8.
- Pool fijo de 4 instancias de `Audio` por sonido en vez de `cloneNode` por rebote/rotura — regla 10.
- Contador `aliveBlocks` en vez de `blocks.every()` dentro del `for` de colisión — regla 14.
- `start()` idempotente (`if (running) return`) — regla 3.
- Clave de `tintCache` para paddle/pelota con `w`/`h` incluidos — regla 12.
- `devicePixelRatio` + `ctx.scale` al crear el motor, sin tocar `app/globals.css` (clase
  `.asteroides-canvas` compartida con Asteroides) — regla 18.

**Compilación:** `tsc --noEmit` sin errores · `lint` con los 4 errores preexistentes de
`.claude/hooks/format-on-write.js` (no relacionados) · `build` sin errores, 20 páginas generadas.

**Nota de verificación:** no se contó con herramientas `mcp__playwright__*` en esta invocación, así
que la verificación funcional fue por revisión exhaustiva de código (colisiones, condición de
victoria, pool de audio, overlay de pausa) — documentado como limitación en
`specs/21-performance-arkanoid.md`.

### `snake` (`specs/22-performance-snake.md`, 2026-08-20)

| #   | Regla                                                            | Resultado                                                                | archivo:línea                                                                 | Severidad    |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------ |
| 1   | `loop()` clampea `dt`                                            | No aplica — timer de paso fijo (`setInterval`), no rAF con `dt` variable | `lib/games/snake/engine.ts` (`scheduleTimer`)                                 | —            |
| 2   | `destroy()` cancela timer/listeners                              | Pasa                                                                     | `lib/games/snake/engine.ts` (`destroy`)                                       | —            |
| 3   | `start()` idempotente                                            | Fallaba → corregido                                                      | `lib/games/snake/engine.ts` (`start`)                                         | baja         |
| 4   | Callbacks async de assets guardados contra desmontaje            | No aplica — `fruitSheet` no tiene callback `onload`                      | `lib/games/snake/engine.ts` (`drawFruit`)                                     | —            |
| 5   | Timer se detiene en game over y con `visibilitychange`           | Fallaba → corregido                                                      | `lib/games/snake/engine.ts` (`tick`, `start`, `onVisibilityChange`)           | media        |
| 6   | `emitIfChanged` con reseteo en `initGame`                        | Pasa                                                                     | `lib/games/snake/engine.ts` (`initGame`)                                      | —            |
| 7   | Sin `.filter`/`.map`/`.concat`/spread en update/draw             | Falla técnica sin impacto (evento raro, no por frame) — sin fix          | `lib/games/snake/engine.ts:104-105` (`randomFreeCell`)                        | baja         |
| 8   | Sin template literals/`repeat`/`toLocaleString` por frame/render | Fallaba → corregido en el motor; hallazgo sin fix en HUD de React        | `lib/games/snake/engine.ts` (`drawHUD`); `components/game-player.tsx:123,128` | media / baja |
| 9   | Sin parsing de color en caliente en `draw()`                     | Pasa                                                                     | `lib/games/snake/engine.ts`                                                   | —            |
| 10  | Sin objetos DOM/media creados en el loop                         | Pasa                                                                     | —                                                                             | —            |
| 11  | Geometría estática cacheada offscreen                            | No aplica — fondo sólido                                                 | `lib/games/snake/engine.ts` (`draw`)                                          | —            |
| 12  | Cache de sprites con clave completa                              | No aplica — sin capa de cache, `drawImage` directo                       | `lib/games/snake/engine.ts` (`drawFruit`)                                     | —            |
| 13  | Colisiones con broad-phase                                       | Pasa (no aplica) — colisión solo contra la cola propia, O(n) acotado     | `lib/games/snake/engine.ts` (`step`)                                          | —            |
| 14  | Sin `.every`/`.some` anidados en un `for` externo                | Pasa                                                                     | `lib/games/snake/engine.ts` (`step`)                                          | —            |
| 15  | Colecciones acotadas                                             | Pasa                                                                     | `lib/games/snake/engine.ts`                                                   | —            |
| 16  | Bucles de rechazo con límite de intentos                         | Fallaba → corregido                                                      | `lib/games/snake/engine.ts` (`randomFreeCell`)                                | baja         |
| 17  | `save()/restore()` o restauración explícita                      | Pasa                                                                     | `lib/games/snake/engine.ts`                                                   | —            |
| 18  | `devicePixelRatio` si el canvas se escala por CSS                | Fallaba → corregido                                                      | `lib/games/snake/engine.ts` (setup)                                           | baja         |
| 19  | Sin `localStorage` en inicializador de `useState`                | Falla conocida, sin fix (SPEC 18)                                        | `components/game-player.tsx:31-38`                                            | baja         |
| 20  | `TouchControls` memoizado                                        | Pasa (ya corregido en la invocación de `asteroides`)                     | `components/touch-controls.tsx`                                               | —            |
| 21  | Timers de auto-repeat táctil con cleanup                         | No se manifiesta en Snake (`repeatCodes: []`); cleanup ya existe         | `components/touch-controls.tsx`                                               | —            |

**Fixes aplicados:**

- `start()` idempotente (`if (running) return`) — regla 3.
- `tick()` detiene el timer (`stopTimer()`) en cuanto `state === "gameover"`, y se agregó
  `visibilitychange` con bandera `pausedByVisibility` que pausa/reanuda sin pisar la pausa manual —
  regla 5.
- Cache de texto de HUD (`hudScoreText`/`hudLevelText`) — regla 8.
- `MAX_ATTEMPTS = COLS * ROWS` en `randomFreeCell` con fallback determinista de recorrido de grilla —
  regla 16.
- `devicePixelRatio` + `ctx.scale` al crear el motor — regla 18.

**Hallazgos sin fix (documentados en el spec):** `.map()` en `randomFreeCell` (regla 7, evento raro
no por frame), `toLocaleString`/`repeat` del HUD de React en `game-player.tsx` (regla 8, evento no
por frame — mismo criterio ya usado en `asteroides`/`tetris`/`arkanoid`), `localStorage` en
`useState` (regla 19, deuda ya documentada en SPEC 18).

**Compilación:** `tsc --noEmit` sin errores · `lint` con los 4 errores preexistentes de
`.claude/hooks/format-on-write.js` (no relacionados) · `build` sin errores, 20 páginas generadas.

**Nota de verificación:** no se contó con herramientas `mcp__playwright__*` en esta invocación
(el dev server sí estaba corriendo en `http://localhost:3000`), así que la verificación funcional
fue por revisión de código, no por partida jugada en navegador — documentado como limitación en
`specs/22-performance-snake.md`.

### `frogger` (`specs/23-performance-frogger.md`, 2026-08-20)

| #   | Regla                                                     | Resultado                                                                                                        | archivo:línea                                                               | Severidad |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------- |
| 1   | `loop()` clampea `dt`                                     | Pasa                                                                                                             | `lib/games/frogger/engine.ts:643`                                           | —         |
| 2   | `destroy()` cancela rAF y listeners                       | Pasa (ampliado con visibilitychange)                                                                             | `lib/games/frogger/engine.ts:711-715`                                       | —         |
| 3   | `start()` idempotente                                     | Fallaba → corregido                                                                                              | `lib/games/frogger/engine.ts:676-688`                                       | baja      |
| 4   | Callbacks async de assets guardados contra desmontaje     | No aplica (sin carga async)                                                                                      | —                                                                           | —         |
| 5   | Loop se pausa en game over y `visibilitychange`           | Fallaba → corregido                                                                                              | `lib/games/frogger/engine.ts:641-674`                                       | media     |
| 6   | `emitIfChanged` con reseteo en `initGame`                 | Pasa                                                                                                             | `lib/games/frogger/engine.ts:258-273`                                       | —         |
| 7   | Sin `.filter`/`.map`/`.concat`/spread en update/draw      | Pasa (solo `forEach` sobre 5 metas, sin allocación)                                                              | `lib/games/frogger/engine.ts:486`                                           | —         |
| 8   | Sin template literals/`repeat`/`toLocaleString` por frame | Fallaba → corregido                                                                                              | `lib/games/frogger/engine.ts:584-604`                                       | media     |
| 9   | Sin parsing de color en caliente en `draw()`              | Pasa                                                                                                             | `lib/games/frogger/engine.ts:475-482`                                       | —         |
| 10  | Sin objetos DOM/media creados en el loop                  | Pasa                                                                                                             | —                                                                           | —         |
| 11  | Geometría estática cacheada offscreen                     | Fallaba → corregido                                                                                              | `lib/games/frogger/engine.ts:484-493`                                       | media     |
| 12  | Cache de sprites con clave completa                       | No aplica (sin spritesheet)                                                                                      | —                                                                           | —         |
| 13  | Colisiones con broad-phase                                | Pasa (no aplica — una sola entidad jugable)                                                                      | `lib/games/frogger/engine.ts:359-382`                                       | —         |
| 14  | Sin `.every`/`.some` anidados en un `for` externo         | Pasa (`goalsOccupied.every` es una llamada única por evento de meta, no por frame)                               | `lib/games/frogger/engine.ts:404`                                           | —         |
| 15  | Colecciones acotadas                                      | Pasa                                                                                                             | `lib/games/frogger/engine.ts`                                               | —         |
| 16  | Bucles de rechazo con límite de intentos                  | No aplica (spawn determinista por avance de columna)                                                             | `lib/games/frogger/engine.ts:167-220`                                       | —         |
| 17  | `save()/restore()` o restauración explícita               | Fallaba → corregido                                                                                              | `lib/games/frogger/engine.ts:525-541`                                       | baja      |
| 18  | `devicePixelRatio` si el canvas se escala por CSS         | Fallaba → corregido                                                                                              | `lib/games/frogger/engine.ts:92-103`, `app/globals.css` (`.frogger-canvas`) | baja      |
| 19  | Sin `localStorage` en inicializador de `useState`         | Falla conocida, sin fix (SPEC 18)                                                                                | `components/game-player.tsx:31-38`                                          | baja      |
| 20  | `TouchControls` memoizado                                 | Pasa (ya corregido en la invocación de `asteroides`)                                                             | `components/touch-controls.tsx`                                             | —         |
| 21  | Timers de auto-repeat táctil con cleanup                  | Pasa — Frogger es el segundo juego con `repeatCodes` no vacío, cleanup ya corregido en la invocación de `tetris` | `components/touch-controls.tsx`                                             | —         |

**Fixes aplicados:**

- Cache de texto de HUD (`hudScoreCache`/`hudLevelCache`/`hudLivesCache`) — regla 8.
- Fondo estático (14 filas + 5 casillas meta) cacheado en un canvas offscreen (`backgroundCache`),
  reconstruido en `setPalette()` para no quedar con colores viejos al cambiar de skin — regla 11.
- El loop deja de reprogramar rAF tras `state === "gameover"` y se agregó `visibilitychange`
  (pausa/reanuda sin pisar pausa manual, bandera `wasRunningBeforeHidden`) — regla 5.
- `start()` idempotente (`if (running) return`) — regla 3.
- `ctx.save()`/`ctx.restore()` alrededor del dibujo de tortugas en vez de resetear `globalAlpha` a
  mano — regla 17.
- `devicePixelRatio` + `ctx.scale` al crear el motor, `image-rendering: pixelated` en
  `.frogger-canvas` (`app/globals.css`, clase exclusiva de Frogger) — regla 18.

**Compilación:** `tsc --noEmit` sin errores · `lint` con los 4 errores preexistentes de
`.claude/hooks/format-on-write.js` (no relacionados) · `build` sin errores, 20 páginas generadas.

**Nota de verificación:** no se contó con herramientas `mcp__playwright__*` en esta invocación
(el dev server sí estaba corriendo en `http://localhost:3000`), así que la verificación funcional
fue por revisión de código, no por partida jugada en navegador — documentado como limitación en
`specs/23-performance-frogger.md`.

_(próxima ficha se agrega aquí cuando game-performance-booster complete su Paso 7 sobre otro juego)_
