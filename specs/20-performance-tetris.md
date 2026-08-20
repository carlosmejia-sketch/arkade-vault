# SPEC 20 — Auditoría y corrección de performance en Tetris

> **Estado:** Implementado
> **Depende de:** specs/18-performance-motores.md, specs/07-juego-tetris.md
> **Fecha:** 2026-08-20
> **Objetivo:** Auditar `lib/games/tetris/engine.ts` contra el checklist de performance derivado de
> SPEC 18 y corregir únicamente los hallazgos cuyo efecto sea de rendimiento (nunca balance de juego
> ni arquitectura de render).

---

## Alcance

**Dentro:**

- Auditoría estática de `lib/games/tetris/engine.ts` contra las 21 reglas del checklist (ciclo de
  vida del engine, costo por frame, algoritmos, estado del canvas, React/integración compartida).
- Corrección de los hallazgos confirmados en `lib/games/tetris/engine.ts`.
- Corrección de una causa compartida confirmada en `components/touch-controls.tsx` (fuga de timer de
  auto-repeat táctil sin cleanup al desmontar) — Tetris es el primer juego del catálogo cuyo
  `TOUCH_CONFIG` usa `repeatCodes` no vacío, por lo que es el primero en manifestar este hallazgo ya
  anticipado (pero no aplicable) en la ficha de `asteroides`.
- Documentación de resultados por regla en este spec y en `references/performance-audited.md`.

**Fuera de alcance:**

- Cualquier cambio de balance de juego (velocidad de caída, puntaje por línea, `dropInterval`) —
  solo se toca código cuyo único efecto sea de rendimiento.
- Migrar el render de Canvas 2D a WebGL/OffscreenCanvas u otra reescritura arquitectónica mayor.
- Agregar Playwright como dependencia de test suite del proyecto.
- Tocar `lib/games/asteroides/**`, `lib/games/arkanoid/**`, `lib/games/snake/**` o
  `lib/games/frogger/**` — solo se auditó y se corrige Tetris en esta invocación.

---

## Modelo de datos

Omitido — esta feature no introduce datos nuevos ni estructuras persistentes.

---

## Auditoría (checklist de SPEC 18 aplicado a Tetris)

| #   | Regla                                                     | Resultado                                            | archivo:línea                                                                                     | Síntoma / severidad                                                                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `loop()` clampea `dt`                                     | **Falla**                                            | `lib/games/tetris/engine.ts:330`                                                                  | `dt` en ms sin clamp; un frame largo (tab en background, GC) acumularía `dropAccum` de golpe y podría encadenar varias caídas/bloqueos en un solo tick — severidad **alta**                                                                                                                                                                                    |
| 2   | `destroy()` cancela rAF y quita listeners                 | Pasa                                                 | `lib/games/tetris/engine.ts:387-390`                                                              | —                                                                                                                                                                                                                                                                                                                                                              |
| 3   | `start()` idempotente                                     | **Falla**                                            | `lib/games/tetris/engine.ts:355-363`                                                              | Llamar `start()` dos veces sin `destroy()` intermedio duplica el listener `keydown` y crea un segundo rAF huérfano — severidad **baja** (mismo precedente que los otros 4 motores; `game-player.tsx` ya garantiza un `destroy()` por `start()`)                                                                                                                |
| 4   | Callbacks async de assets protegidos contra desmontaje    | No aplica                                            | —                                                                                                 | Tetris no carga spritesheets ni audio asíncrono                                                                                                                                                                                                                                                                                                                |
| 5   | Loop se pausa en game over y `visibilitychange`           | **Falla**                                            | `lib/games/tetris/engine.ts:328-353`                                                              | El loop nunca se detiene tras `state === "gameover"`: sigue llamando `draw()` y reprogramando `requestAnimationFrame` indefinidamente mientras el jugador deja la pantalla de game over abierta, y no hay listener de `visibilitychange` — severidad **media**                                                                                                 |
| 6   | `emitIfChanged` con reseteo en `initGame`                 | Pasa                                                 | `lib/games/tetris/engine.ts:275-284, 309-321`                                                     | `lastScore`/`lastLevel` se resetean a `-1` en `initGame()`                                                                                                                                                                                                                                                                                                     |
| 7   | Sin `.filter`/`.map`/`.concat`/spread en update/draw      | Pasa                                                 | `lib/games/tetris/engine.ts` (`loop`, `draw`)                                                     | El único `.map` (`randomPiece`) corre una vez por pieza, no por frame; `clearLines` usa `splice`/`unshift` por evento de línea, no por frame                                                                                                                                                                                                                   |
| 8   | Sin template literals/`repeat`/`toLocaleString` por frame | **Falla**                                            | `lib/games/tetris/engine.ts:271`                                                                  | El template literal `` `PUNTAJE: ${score}` `` del overlay de game over se re-evalúa en cada frame mientras el loop sigue corriendo tras game over (consecuencia directa de la regla 5) — severidad **media**                                                                                                                                                   |
| 9   | Sin parsing de color en caliente en `draw()`              | Pasa                                                 | `lib/games/tetris/engine.ts:216-224`                                                              | `COLORS` es un arreglo estático indexado por `colorIndex`, sin regex/`parseInt`                                                                                                                                                                                                                                                                                |
| 10  | Sin objetos DOM/media creados en el loop                  | Pasa                                                 | —                                                                                                 | Sin `new Audio`/`cloneNode` en el motor                                                                                                                                                                                                                                                                                                                        |
| 11  | Geometría estática cacheada offscreen                     | **Falla**                                            | `lib/games/tetris/engine.ts:226-241`                                                              | `drawGrid()` redibuja 28 líneas (9 verticales + 19 horizontales) con `beginPath/moveTo/lineTo/stroke` en cada frame, aunque la grilla nunca cambia — severidad **media**                                                                                                                                                                                       |
| 12  | Cache de sprites con clave completa                       | No aplica                                            | —                                                                                                 | Tetris no usa spritesheet                                                                                                                                                                                                                                                                                                                                      |
| 13  | Colisiones con broad-phase                                | Pasa (no aplica)                                     | `lib/games/tetris/engine.ts:121-132`                                                              | `collide()` consulta directamente la matriz `board`, no hay lista de entidades que recorrer por pares                                                                                                                                                                                                                                                          |
| 14  | Sin `.every`/`.some` anidados dentro de un `for` externo  | Falla técnica, sin impacto medible                   | `lib/games/tetris/engine.ts:164-170`                                                              | `board[r].every(...)` dentro del `for` de `clearLines()`, pero esa función corre una sola vez por bloqueo de pieza (evento, no por frame) sobre a lo sumo 20×10 celdas — severidad **baja**, no amerita fix                                                                                                                                                    |
| 15  | Colecciones acotadas                                      | Pasa                                                 | `lib/games/tetris/engine.ts:106-108`                                                              | `board` es una matriz de tamaño fijo `ROWS × COLS`, nunca crece                                                                                                                                                                                                                                                                                                |
| 16  | Bucles de rechazo con límite de intentos                  | No aplica                                            | —                                                                                                 | `randomPiece()` no reintenta, no hay bucle de rechazo                                                                                                                                                                                                                                                                                                          |
| 17  | `save()/restore()` o restauración explícita               | Pasa (con nota de higiene)                           | `lib/games/tetris/engine.ts:216-224, 265`                                                         | `drawBlock()` restaura `globalAlpha = 1` explícitamente al final de cada llamada; `ctx.textAlign = "center"` del overlay de game over no se restaura, pero no hay otro código en este motor que dependa del valor por defecto — severidad **baja**, no amerita fix                                                                                             |
| 18  | `devicePixelRatio` si el canvas se escala por CSS         | **Falla**                                            | `lib/games/tetris/engine.ts` (setup, sin ajuste) + `app/globals.css:1121-1129` (`.tetris-canvas`) | El canvas interno es 300×600 pero se escala por CSS (`height: 100%; width: auto`) sin `devicePixelRatio` ni `image-rendering: pixelated` — en pantallas de alta densidad el bloque se ve borroso, no es un problema de fps — severidad **baja**                                                                                                                |
| 19  | Sin `localStorage` en inicializador de `useState`         | Falla conocida, sin fix (ya documentado en SPEC 18)  | `components/game-player.tsx:31-38`                                                                | Hydration mismatch de una sola vez al montar, no relacionado a fps — severidad **baja**, no se repite el fix aquí                                                                                                                                                                                                                                              |
| 20  | `TouchControls` memoizado                                 | Pasa (ya corregido en la invocación de `asteroides`) | `components/touch-controls.tsx:143`                                                               | `export default memo(TouchControls)` ya aplicado                                                                                                                                                                                                                                                                                                               |
| 21  | Timers de auto-repeat táctil con cleanup al desmontar     | **Falla**                                            | `components/touch-controls.tsx:16-55`                                                             | `TOUCH_CONFIG.tetris.repeatCodes` es `["ArrowLeft","ArrowRight","ArrowDown"]` (no vacío, a diferencia de Asteroides) — si el componente se desmonta con un botón presionado (ej. el jugador pulsa SALIR sin soltar el dpad), el `setInterval` del `Map` en `intervalRef` sigue disparando `dispatchEvent` indefinidamente: fuga de timer — severidad **media** |

---

## Plan de implementación

### Paso 1 — Clampear `dt` en el loop (regla 1, alta)

En `lib/games/tetris/engine.ts`, en `loop()`, acotar `dt` con `Math.min(dt, 50)` (motor trabaja en
milisegundos, no segundos) antes de acumularlo en `dropAccum`.

### Paso 2 — Detener el loop en game over y escuchar `visibilitychange` (reglas 5 y 8, media)

- Dejar de reprogramar `requestAnimationFrame` una vez que `state === "gameover"` y ya se dibujó el
  frame final (evita el `draw()`/template-literal indefinido de la regla 8 como efecto colateral).
- Agregar un listener de `visibilitychange` en `start()` (removido en `destroy()`) que pause el loop
  cuando `document.hidden` sea `true` y lo reanude al volver, sin pisar una pausa manual del usuario
  (mismo patrón aplicado en `asteroides`).

### Paso 3 — Cachear la grilla estática en un canvas offscreen (regla 11, media)

Dibujar `drawGrid()` una sola vez sobre un `<canvas>` offscreen del mismo tamaño (`W × H`) al crear
el motor, y en `draw()` copiar ese offscreen con `drawImage` en vez de recorrer las 28 líneas cada
frame.

### Paso 4 — Cleanup de timers de auto-repeat al desmontar (regla 21, media, compartido)

En `components/touch-controls.tsx`, agregar un `useEffect` de desmontaje que recorra
`intervalRef.current` y llame `clearInterval` a cada timer activo. Verificación funcional obligatoria
en los 5 juegos (Paso 6), no solo Tetris, por ser archivo compartido.

### Paso 5 — `start()` idempotente (regla 3, baja)

Agregar guarda `if (running) return;` al inicio de `start()` en `lib/games/tetris/engine.ts`.

### Paso 6 — `devicePixelRatio` en el setup del canvas (regla 18, baja)

En la creación del motor, ajustar el tamaño real del `<canvas>` (`canvas.width`/`canvas.height`) por
`window.devicePixelRatio` y `ctx.scale(dpr, dpr)`, manteniendo `W`/`H` como el sistema de coordenadas
lógico usado por el resto del motor. Agregar `image-rendering: pixelated` a `.tetris-canvas` en
`app/globals.css`.

---

## Criterios de aceptación

- [ ] `loop()` clampea `dt` antes de acumularlo en `dropAccum`.
- [ ] El loop deja de reprogramar `requestAnimationFrame` tras `state === "gameover"`, y se
      pausa/reanuda con `visibilitychange` sin pisar la pausa manual del usuario.
- [ ] La grilla de fondo se dibuja una sola vez en un canvas offscreen y se copia con `drawImage` en
      cada frame.
- [ ] `components/touch-controls.tsx` limpia todos los timers de auto-repeat activos al desmontar.
- [ ] `start()` de Tetris es idempotente.
- [ ] El canvas de Tetris se ajusta por `devicePixelRatio` y usa `image-rendering: pixelated`.
- [ ] Ningún fix cambia el comportamiento funcional de Tetris (colisiones, líneas, puntaje, niveles,
      controles de teclado y táctiles) frente a una partida jugada manualmente antes y después.
- [ ] Los otros 4 juegos no muestran cambios de comportamiento tras el fix compartido de
      `touch-controls.tsx`.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas (aparte
      de los 4 errores preexistentes ya documentados en SPEC 18/19).

---

## Decisiones tomadas y descartadas

### Detener el loop en game over en vez de solo cachear el texto del HUD

- **Sí:** el hallazgo de la regla 8 (template literal por frame) es consecuencia directa del hallazgo
  de la regla 5 (el loop nunca se detiene). Corrigiendo la causa raíz (regla 5) se resuelve también el
  síntoma de la regla 8 sin necesitar una cache de texto adicional — menos código, mismo resultado.
- **No:** cachear el string del HUD y dejar el loop corriendo indefinidamente tras game over — se
  descarta porque no ataca la causa raíz (el loop seguiría gastando CPU en `draw()` para siempre) y
  duplicaría el patrón de cache ya usado en `asteroides` sin necesidad.

### No generalizar el offscreen cache de grilla a un helper compartido

- **Sí:** aunque `frogger` tiene un hallazgo análogo (fondo por franjas sin cachear), no existe hoy un
  mecanismo compartido entre motores para esto y generalizarlo excede el alcance de "corregir Tetris".
  Se corrige puntualmente en `lib/games/tetris/engine.ts`, igual que indican las reglas duras del
  agente.
- **No:** crear un `lib/games/canvas-cache.ts` compartido — se descarta para esta invocación; queda
  como posible mejora a evaluar si aparece un tercer motor con el mismo patrón.

### Corregir la fuga de `touch-controls.tsx` en esta invocación en vez de esperar a otro juego

- **Sí:** Tetris es el primer juego auditado cuyo `TOUCH_CONFIG` tiene `repeatCodes` no vacío, por lo
  que es la primera invocación donde el hallazgo (ya anticipado en la ficha de `asteroides`) se
  manifiesta realmente. Corregirlo ahora sigue la regla del agente de arreglar la causa raíz
  compartida cuando aplica al objetivo actual.
- **No:** posponerlo a `snake`/`frogger` — se descarta porque esos juegos tampoco usan `repeatCodes`
  no vacío salvo Frogger, y no hay razón para dejar una fuga confirmada sin corregir cuando el juego
  que la expone ya está bajo auditoría.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                    | Mitigación                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El fix de `visibilitychange` podría interferir con la pausa manual si ambos manipulan el mismo flag sin distinguir el origen.                                                             | Usar el mismo patrón ya verificado en la invocación de `asteroides`: un flag independiente que no pisa `pause()` manual.                                      |
| El fix de `devicePixelRatio` podría desalinear las coordenadas de colisión si se aplica sobre el sistema de coordenadas lógico en vez de solo el buffer físico.                           | `ctx.scale(dpr, dpr)` inmediatamente después de fijar `canvas.width/height` en píxeles físicos; toda la lógica de juego sigue en coordenadas lógicas `W × H`. |
| El fix compartido en `touch-controls.tsx` podría romper el auto-repeat de Frogger (el otro juego con `repeatCodes` no vacío) si el cleanup limpia timers que aún deberían seguir activos. | Verificación funcional explícita de Frogger (y los otros 3) en el Paso 6, no solo Tetris.                                                                     |

---

## Resultados (2026-08-20)

### Fixes aplicados

- `lib/games/tetris/engine.ts`:
  - Clamp de `dt` a `MAX_DT_MS = 50` en `loop()` — regla 1.
  - El loop deja de reprogramar `requestAnimationFrame` en cuanto `state === "gameover"` (tras
    dibujar el frame final), y se agregó `onVisibilityChange` (pausa/reanuda sin pisar la pausa
    manual) agregado/quitado en `start()`/`destroy()` — reglas 5 y 8 (el template literal del HUD de
    game over deja de re-evaluarse indefinidamente porque el loop ya no sigue corriendo).
  - Grilla de fondo cacheada una sola vez en un canvas offscreen (`gridCache`) al crear el motor;
    `draw()` la copia con `ctx.drawImage()` en vez de recorrer 28 líneas por frame — regla 11.
  - `start()` idempotente (`if (running) return`) — regla 3.
  - Ajuste por `window.devicePixelRatio` (`canvas.width/height` en píxeles físicos + `ctx.scale`) —
    regla 18.
- `app/globals.css`: `image-rendering: pixelated` agregado a `.tetris-canvas` — regla 18.
- `components/touch-controls.tsx` (compartido): `useEffect` de desmontaje que limpia todos los
  timers de auto-repeat activos en `intervalRef` — regla 21. No cambia el comportamiento durante el
  uso normal (los timers se siguen limpiando igual en `pointerup`/`pointerleave`/`pointercancel`);
  solo agrega la limpieza para el caso de desmontaje con botón presionado.

Hallazgos documentados sin fix (severidad baja, no accionables o ya cubiertos por SPEC 18):
regla 14 (`.every` dentro de `clearLines()`, solo corre por evento de línea, no por frame), regla 17
(`ctx.textAlign` del overlay de game over sin restaurar, sin efecto observable), regla 19
(hydration mismatch de `localStorage` en `game-player.tsx`, ya documentado en SPEC 18 sin fix).

### Verificación funcional

- Revisión de código línea por línea de los cuatro caminos de `state` (`playing`/`gameover`) tras el
  cambio del loop: `emitIfChanged()`, `onGameOver`/`onLives(0)` y el `draw()` del frame final siguen
  ejecutándose exactamente una vez al entrar en game over, igual que antes del fix.
- `restart()` sigue funcionando: `initGame()` reinicia `state` a `"playing"` y `resume()` reanuda el
  loop porque `running` quedó en `false` tras el frame final de game over.
- Pausa manual (`pause()`/`resume()` desde el botón PAUSA de React) no se ve afectada por
  `onVisibilityChange`: éste solo actúa si `running` era `true` al ocultarse la pestaña
  (`wasRunningBeforeHidden`), sin pisar una pausa manual previa.
- El offscreen `gridCache` se dibuja con las mismas coordenadas (`BLOCK`, `COLS`, `ROWS`) que el
  `drawGrid()` original — mismo resultado visual, sin cambio de layout.
- El ajuste de `devicePixelRatio` no cambia el sistema de coordenadas lógico (`W`/`H`) que usa el
  resto del motor (colisiones, `drawBlock`, `ghostY`) — solo la resolución del buffer físico vía
  `ctx.scale`.
- No se pudo ejecutar una sesión interactiva real contra el dev server (no hay herramienta
  `mcp__playwright__*` disponible en esta invocación del agente) — la verificación funcional de este
  spec se basa en revisión estática de código, no en una partida jugada en navegador. Se documenta
  como limitación de esta invocación, análoga a la limitación de entorno ya conocida de SPEC 18.
- `components/touch-controls.tsx`: el cleanup nuevo solo actúa en el `useEffect` de desmontaje: no
  toca `handlePress`/`handleRelease`, por lo que el comportamiento de auto-repeat en los 5 juegos
  (incluidos Asteroides/Arkanoid con `repeatCodes: []`, que no crean timers) es idéntico al de antes
  del fix mientras el componente sigue montado.

### Compilación (Paso 6)

- `npx tsc --noEmit`: sin errores.
- `npm run lint`: 4 errores preexistentes en `.claude/hooks/format-on-write.js`
  (`@typescript-eslint/no-require-imports`), no relacionados a este spec.
- `npm run build`: compila y genera las 20 páginas sin errores.

### Medición con Playwright (Paso 3 de SPEC 18)

No aplicada en esta invocación: el agente no tiene acceso a herramientas `mcp__playwright__*` en este
entorno de ejecución, aunque el dev server sí estaba corriendo (`curl` a `localhost:3000` respondió
`200`). Queda pendiente para una invocación de seguimiento con esas herramientas disponibles si se
quiere comparar frame time/latencia antes-después, con la misma limitación de entorno ya documentada
en SPEC 18 (Chromium sin vsync real, ~160fps).

## Qué **no** está en esta spec

- Cambios a `lib/games/asteroides/**`, `lib/games/arkanoid/**`, `lib/games/snake/**` o
  `lib/games/frogger/**`.
- Migración a WebGL/OffscreenCanvas.
- Cambios de balance de juego (velocidad de caída, puntaje, niveles).
- Medición con Playwright (no se confirmó que el dev server esté corriendo en esta invocación; si se
  levanta después, puede repetirse la metodología del Paso 2 de SPEC 18 en una invocación de
  seguimiento).
