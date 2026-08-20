# SPEC 23 — Auditoría y corrección de performance en Frogger

> **Estado:** Implementado
> **Depende de:** specs/18-performance-motores.md, specs/game-jam/frogger/01-frogger-core.md, specs/16-skins-frogger.md, specs/17-movil-frogger.md
> **Fecha:** 2026-08-20
> **Objetivo:** Auditar `lib/games/frogger/engine.ts` contra el checklist de performance derivado de SPEC 18 y corregir únicamente los hallazgos cuyo efecto sea de rendimiento, sin tocar balance de juego ni arquitectura de render.

---

## Alcance

**Dentro:**

- Auditoría estática de `lib/games/frogger/engine.ts` contra el checklist de 21 reglas de SPEC 18
  (ciclo de vida del engine, costo por frame, algoritmos, estado del canvas, integración React
  compartida).
- Corrección de cada hallazgo confirmado, uno a la vez, en el archivo donde vive la causa raíz
  (`lib/games/frogger/engine.ts` y, de forma puntual, `app/globals.css` solo en la clase
  `.frogger-canvas`, exclusiva de este juego).
- Verificación de compilación (`tsc`, `lint`, `build`) y verificación funcional del motor
  (colisiones con tráfico/río, saltos, metas, temporizador, niveles, controles de teclado y táctil).

**Fuera de alcance:**

- Cualquier cambio de balance de juego: velocidad de carriles, tiempo de ronda, puntaje, vidas.
- Migrar el render de Canvas 2D a WebGL/OffscreenCanvas.
- Agregar Playwright como dependencia de test suite del proyecto.
- Tocar cualquier otro motor (`asteroides`, `tetris`, `arkanoid`, `snake`) — ya auditados en sus
  propias invocaciones (specs 19-22).
- El hallazgo ya documentado en SPEC 18/specs 19-22 de `localStorage` leído en el inicializador de
  `useState` de `skin` en `components/game-player.tsx` (regla 19) — deuda compartida, sin fix, mismo
  criterio ya aplicado a los 4 motores anteriores.

---

## Modelo de datos

Omitido — esta feature no introduce datos nuevos ni estructuras persistentes.

---

## Plan de implementación

### Paso 1 — Corregir HUD con costo por frame (regla 8, severidad media)

`drawHUD()` reconstruía tres strings (`SCORE ${score}`, `NIVEL ${level}`, `"♥".repeat(lives)`) en
cada frame aunque el valor no hubiera cambiado desde el frame anterior. Se agregan tres cachés
(`hudScoreCache`/`hudLevelCache`/`hudLivesCache`) que solo recalculan el texto cuando el valor de
origen cambia, mismo patrón ya usado en `asteroides`/`arkanoid`/`snake`.

### Paso 2 — Cachear el fondo estático en un canvas offscreen (regla 11, severidad media)

`drawBackground()` recorría las 14 filas de la grilla (`fillRect` por fila) y las 5 casillas meta
(`fillRect` + `strokeRect` por meta) en cada frame, aunque esa geometría solo depende de la paleta
activa (no cambia entre frames de una misma partida). Se agrega `backgroundCache` (canvas offscreen
640×560) construido una vez en `buildBackgroundCache()` — invocado al crear el motor y de nuevo en
`setPalette()` para no quedar con colores viejos al cambiar de skin — y `drawBackground()` pasa a
copiarlo con `drawImage()` y dibujar aparte solo el marcador de "meta ocupada" (que sí cambia por
evento de juego).

### Paso 3 — Pausar el loop en game over y con `visibilitychange` (regla 5, severidad media)

El loop reprogramaba `requestAnimationFrame` indefinidamente incluso tras `state === "gameover"`,
gastando CPU en `update()`/`draw()` (incluida la reconstrucción del overlay) mientras el jugador deja
la pantalla de game over abierta. Tampoco existía ningún listener de `visibilitychange`, así que el
loop seguía corriendo con la pestaña oculta. Se agrega: el loop deja de reprogramar rAF en cuanto
`state === "gameover"`, y un listener de `visibilitychange` que pausa/reanuda respetando la bandera
`wasRunningBeforeHidden` sin pisar una pausa manual del jugador (mismo patrón que `tetris`/`snake`).

### Paso 4 — `start()` idempotente (regla 3, severidad baja)

`start()` no comprobaba si el motor ya estaba corriendo, así que una segunda invocación sin
`destroy()` intermedio duplicaría el listener de teclado y dejaría un rAF huérfano. Se agrega
`if (running) return;` al inicio de `start()`.

### Paso 5 — `save()/restore()` en vez de resetear `globalAlpha` a mano (regla 17, severidad baja)

El dibujo de tortugas sumergidas fijaba `ctx.globalAlpha = entity.submerged ? 0.3 : 1` y lo
reseteaba a `1` al final del bucle manualmente; si algo lanzara una excepción a mitad del dibujo, el
`globalAlpha` quedaría en un valor incorrecto para el resto del frame. Se envuelve el bucle en
`ctx.save()`/`ctx.restore()`.

### Paso 6 — `devicePixelRatio` en el canvas (regla 18, severidad baja)

El canvas se escala por CSS (`.frogger-canvas`, `height: 100%; width: auto`) sin ajustar por
`devicePixelRatio`, difuminando bordes en pantallas de alta densidad. Se agrega el mismo bloque ya
usado en `asteroides`/`tetris`/`snake`: agrandar el backing store por el DPR y `ctx.scale(dpr, dpr)`.
Se agrega también `image-rendering: pixelated` a `.frogger-canvas` en `app/globals.css` (clase
exclusiva de Frogger, sin riesgo de afectar a otro juego).

---

## Criterios de aceptación

- [x] Los 21 puntos del checklist de SPEC 18 fueron evaluados contra `lib/games/frogger/engine.ts`
      con resultado documentado (pasa/falla, archivo:línea, severidad).
- [x] Cada hallazgo con severidad media o alta tiene un fix aplicado.
- [x] Ningún fix cambia velocidad de carriles, tiempo de ronda, puntaje o vidas.
- [x] No se tocó ningún otro motor ni ningún archivo fuera de `lib/games/frogger/engine.ts` y la
      clase `.frogger-canvas` en `app/globals.css`.
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.
- [x] Verificación funcional del motor: colisiones de tráfico/río, saltos, metas, temporizador,
      niveles y cambio de skin (paleta) se comportan igual que antes del fix.

---

## Decisiones tomadas y descartadas

### Cachear el fondo por paleta en vez de por frame, invalidando en `setPalette`

- **Sí:** el fondo (colores de zona + casillas meta) solo depende de la paleta activa, no del estado
  de la partida — reconstruirlo en cada `setPalette()` es barato (una vez por cambio de skin, no por
  frame) y evita el desajuste de color que tendría dejar el cache fijo desde el arranque.
- **No:** invalidar también por nivel — descartado porque `GOAL_COLS`/zonas no dependen del nivel,
  solo la velocidad de los carriles (que se dibuja aparte, por entidad, no en el fondo).

### No aplicar broad-phase a las colisiones (regla 13)

- **Sí:** Frogger solo tiene una entidad jugable (la rana) contra un puñado de entidades por carril
  (2-6), nunca un producto cartesiano de dos colecciones grandes como en Asteroides — no hay
  ganancia medible de una rejilla espacial aquí.
- **No:** replicar la rejilla de colisión de `asteroides` — se descarta por no tener el mismo patrón
  de crecimiento (balas × asteroides) que justificó el fix ahí.

### No tocar el HUD de React en `components/game-player.tsx` (regla 8, hallazgo compartido)

- **Sí:** ya documentado en SPEC 18 y en las fichas de `asteroides`/`snake`: `toLocaleString`/
  `repeat` ahí se ejecutan por evento de juego (cambio de score/vidas), no por frame — mismo criterio
  aplicado consistentemente en las 4 invocaciones anteriores.
- **No:** aplicar el mismo fix de cache ahí — descartado por no ser causa raíz de ningún síntoma por
  frame, y por no ser exclusivo de Frogger (afectaría a los 5 juegos, fuera del alcance de "un juego
  por invocación").

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                            | Mitigación                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El listener de `visibilitychange` podría interferir con la pausa manual (botón PAUSA de `game-player.tsx`) si el jugador oculta la pestaña estando en pausa manual.                                                               | Se replica exactamente el patrón ya verificado en `tetris`/`snake`: `wasRunningBeforeHidden` solo se activa si `running` era `true` al ocultarse, así que una pausa manual (`running = false` ya puesto por `pause()`) no se ve afectada. |
| Cachear el fondo en un canvas offscreen agrega una dependencia entre `setPalette()` y `buildBackgroundCache()` — si se agrega un campo de paleta nuevo que afecte el fondo sin pasar por `setPalette()`, quedaría desactualizado. | Documentado en el comentario de `buildBackgroundCache()`; el único punto de entrada de cambio de paleta en el motor es `setPalette()`, ya cubierto.                                                                                       |
| No se pudo re-medir con Playwright (no había herramientas `mcp__playwright__*` disponibles en esta invocación, aunque el dev server sí estaba corriendo).                                                                         | Verificación funcional por revisión de código y por la misma limitación de entorno ya documentada en SPEC 18 (rAF sin vsync real ~160fps) — no bloquea el resto del checklist estático.                                                   |

---

## Checklist aplicado (resultado)

| #   | Regla                                                     | Resultado                                                                                                                                                          | archivo:línea                                                               | Severidad |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | --------- |
| 1   | `loop()` clampea `dt`                                     | Pasa                                                                                                                                                               | `lib/games/frogger/engine.ts:643`                                           | —         |
| 2   | `destroy()` cancela rAF y listeners                       | Pasa (ampliado con visibilitychange)                                                                                                                               | `lib/games/frogger/engine.ts:711-715`                                       | —         |
| 3   | `start()` idempotente                                     | Fallaba → corregido                                                                                                                                                | `lib/games/frogger/engine.ts:676-688`                                       | baja      |
| 4   | Callbacks async de assets guardados contra desmontaje     | No aplica (sin carga async)                                                                                                                                        | —                                                                           | —         |
| 5   | Loop se pausa en game over y `visibilitychange`           | Fallaba → corregido                                                                                                                                                | `lib/games/frogger/engine.ts:641-674`                                       | media     |
| 6   | `emitIfChanged` con reseteo en `initGame`                 | Pasa                                                                                                                                                               | `lib/games/frogger/engine.ts:258-273`                                       | —         |
| 7   | Sin `.filter`/`.map`/`.concat`/spread en update/draw      | Pasa (solo `forEach` sobre 5 metas, sin allocación)                                                                                                                | `lib/games/frogger/engine.ts:486`                                           | —         |
| 8   | Sin template literals/`repeat`/`toLocaleString` por frame | Fallaba → corregido                                                                                                                                                | `lib/games/frogger/engine.ts:584-604` (antes 579,581,583)                   | media     |
| 9   | Sin parsing de color en caliente en `draw()`              | Pasa                                                                                                                                                               | `lib/games/frogger/engine.ts:475-482`                                       | —         |
| 10  | Sin objetos DOM/media creados en el loop                  | Pasa                                                                                                                                                               | —                                                                           | —         |
| 11  | Geometría estática cacheada offscreen                     | Fallaba → corregido                                                                                                                                                | `lib/games/frogger/engine.ts:484-493` (antes fondo por franjas)             | media     |
| 12  | Cache de sprites con clave completa                       | No aplica (sin spritesheet)                                                                                                                                        | —                                                                           | —         |
| 13  | Colisiones con broad-phase                                | Pasa (no aplica — una sola entidad jugable)                                                                                                                        | `lib/games/frogger/engine.ts:359-382`                                       | —         |
| 14  | Sin `.every`/`.some` anidados en un `for` externo         | Pasa (`goalsOccupied.every` es una llamada única por evento de meta, no anidada en un for de frame)                                                                | `lib/games/frogger/engine.ts:404`                                           | —         |
| 15  | Colecciones acotadas                                      | Pasa                                                                                                                                                               | `lib/games/frogger/engine.ts` (`lanes`/`goalsOccupied` de tamaño fijo)      | —         |
| 16  | Bucles de rechazo con límite de intentos                  | No aplica (spawn determinista por avance de columna, no por rechazo)                                                                                               | `lib/games/frogger/engine.ts:167-220`                                       | —         |
| 17  | `save()/restore()` o restauración explícita               | Fallaba → corregido                                                                                                                                                | `lib/games/frogger/engine.ts:525-541`                                       | baja      |
| 18  | `devicePixelRatio` si el canvas se escala por CSS         | Fallaba → corregido                                                                                                                                                | `lib/games/frogger/engine.ts:92-103`, `app/globals.css` (`.frogger-canvas`) | baja      |
| 19  | Sin `localStorage` en inicializador de `useState`         | Falla conocida, sin fix (SPEC 18)                                                                                                                                  | `components/game-player.tsx:31-38`                                          | baja      |
| 20  | `TouchControls` memoizado                                 | Pasa (ya corregido en la invocación de `asteroides`)                                                                                                               | `components/touch-controls.tsx`                                             | —         |
| 21  | Timers de auto-repeat táctil con cleanup                  | Pasa — Frogger es el segundo juego con `repeatCodes` no vacío (las 4 direcciones), pero el cleanup ya se corrigió de forma compartida en la invocación de `tetris` | `components/touch-controls.tsx`                                             | —         |

---

## Resultados

### Fixes aplicados

- Cache de texto de HUD (`hudScoreCache`/`hudLevelCache`/`hudLivesCache`) — regla 8.
- Fondo estático (14 filas + 5 casillas meta) cacheado en un canvas offscreen (`backgroundCache`),
  reconstruido en `setPalette()` — regla 11.
- El loop deja de reprogramar rAF tras `state === "gameover"` y se agregó `visibilitychange`
  (pausa/reanuda sin pisar pausa manual, con bandera `wasRunningBeforeHidden`) — regla 5.
- `start()` idempotente (`if (running) return`) — regla 3.
- `ctx.save()`/`ctx.restore()` alrededor del dibujo de tortugas en vez de resetear `globalAlpha` a
  mano — regla 17.
- `devicePixelRatio` + `ctx.scale` al crear el motor, `image-rendering: pixelated` en
  `.frogger-canvas` (`app/globals.css`) — regla 18.

### Compilación

- `npx tsc --noEmit`: sin errores.
- `npm run lint`: 4 errores preexistentes en `.claude/hooks/format-on-write.js`
  (`@typescript-eslint/no-require-imports`), no relacionados a este spec — no se tocó ese archivo.
- `npm run build`: sin errores, 20 páginas generadas.

### Verificación funcional

No se contó con herramientas `mcp__playwright__*` en esta invocación (el dev server sí estaba
corriendo en `http://localhost:3000`), así que la verificación funcional fue por revisión exhaustiva
de código: los fixes de regla 8/11/17/18 no cambian ninguna condición de colisión/puntaje/nivel (solo
la forma de dibujar); el fix de regla 5 solo detiene el rAF cuando `state === "gameover"`, estado que
ya bloqueaba `update()` (línea `if (state !== "playing") return;`), así que no hay diferencia de
comportamiento antes de llegar ahí; el fix de regla 3 (`start()` idempotente) no cambia el flujo
normal de montaje único de `game-player.tsx`. Documentado como limitación, igual que en
`specs/20-performance-tetris.md` y `specs/21-performance-arkanoid.md`.
