# SPEC 22 — Auditoría y corrección de performance en Snake

> **Estado:** Implementado
> **Depende de:** specs/18-performance-motores.md, specs/09-juego-snake.md, specs/12-skins-snake.md
> **Fecha:** 2026-08-20
> **Objetivo:** Auditar `lib/games/snake/engine.ts` contra el checklist derivado de SPEC 18 y aplicar
> los fixes cuyo único efecto sea de rendimiento, sin tocar balance de juego ni arquitectura de
> render.

---

## Alcance

**Dentro:**

- Auditoría estática del checklist de 21 reglas (ciclo de vida, costo por frame, algoritmos, estado
  del canvas, React/integración compartida) sobre `lib/games/snake/engine.ts`.
- Corrección de los hallazgos confirmados dentro de `lib/games/snake/**`.
- Actualización de `references/performance-audited.md`.

**Fuera:**

- Cualquier cambio de balance de juego (velocidad de tick, puntaje, tamaño de grilla).
- Migrar el render de Canvas 2D a WebGL/OffscreenCanvas.
- Agregar Playwright como dependencia de test suite del proyecto.
- Tocar `lib/games/<otro-id>/**`.

---

## Modelo de datos

Omitido — esta feature no introduce datos nuevos ni estructuras persistentes.

---

## Plan de implementación

### Paso 1 — `start()` idempotente (regla 3)

`start()` no comprobaba `if (running) return`; una segunda invocación sin `destroy()` intermedio
duplicaría el listener de `keydown` y perdería la referencia al timer anterior por sobreescritura.
Se agrega el guard, igual que en `asteroides`/`tetris`/`arkanoid`.

### Paso 2 — Detener el timer en game over y agregar `visibilitychange` (regla 5)

`tick()` seguía llamando a `step()`/`draw()` en cada intervalo (`tickMs`, 60-140 ms) para siempre
tras `state === "gameover"`, ya que `step()` retorna temprano pero el `setInterval` nunca se
cancelaba. Se agrega `stopTimer()` que se invoca desde `tick()` en cuanto se detecta `"gameover"`, y
un listener de `visibilitychange` (con bandera `pausedByVisibility` para no pisar una pausa manual
del jugador) que detiene/reanuda el timer al ocultar/mostrar la pestaña.

### Paso 3 — Cache de texto de HUD (regla 8)

`drawHUD()` construía `` `SCORE  ${score}` `` y `` `NIVEL ${level}` `` en cada tick aunque el valor
no hubiera cambiado. Se cachea el texto y solo se reconstruye cuando `score`/`level` cambian.

### Paso 4 — Límite de intentos en `randomFreeCell` (regla 16)

El `do/while` de rechazo para ubicar una fruta libre no tenía límite de intentos: si la serpiente
llegara a ocupar casi toda la grilla, podía girar indefinidamente. Se agrega `MAX_ATTEMPTS = COLS *
ROWS` y un fallback determinista que recorre la grilla en orden si se agotan los intentos al azar.

### Paso 5 — `devicePixelRatio` (regla 18)

El canvas de Snake se escala por CSS (`.asteroides-canvas`, `width:100%; height:100%`) sin ajustar el
backing store por `devicePixelRatio`, difuminando bordes de celda en pantallas de alta densidad. Se
agrega el mismo patrón usado en `asteroides`/`tetris`/`arkanoid`: agrandar `canvas.width/height` por
el DPR una sola vez y `ctx.scale(dpr, dpr)`, sin tocar `app/globals.css` (clase compartida con
Asteroides).

---

## Criterios de aceptación

- [x] Los 21 puntos del checklist fueron auditados contra `lib/games/snake/engine.ts` con
      archivo:línea, síntoma y severidad.
- [x] Cada hallazgo de severidad media o alta tiene un fix aplicado.
- [x] Los hallazgos de severidad baja sin fix quedan documentados con su razón (igual que precedentes
      de `asteroides`/`tetris`/`arkanoid`).
- [x] Ningún fix cambia el comportamiento funcional (colisiones contra la cola, wrap en bordes,
      puntaje, niveles, controles de teclado/táctiles).
- [x] Ningún fix cambia balance de juego ni arquitectura de render.
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Decisiones tomadas y descartadas

### No optimizar el `.map()` de `randomFreeCell` manteniendo un Set incremental

- **Sí (descartado):** se podría evitar reconstruir el `Set` de celdas ocupadas en cada spawn de
  fruta manteniendo un Set incremental (agregar cabeza, quitar cola en cada `step()`).
- **No (elegido):** el costo real es insignificante — la grilla tiene 300 celdas como máximo, y
  `spawnFruit()` solo se llama al comer una fruta (a lo sumo una vez por tick, con tick de 60-140 ms),
  no en cada frame de render. Agregar un Set incremental introduciría una segunda fuente de verdad
  que sincronizar con `snake` en cada mutación (`unshift`/`pop`), con riesgo de desincronizarla en
  algún camino futuro, por un ahorro no medible hoy. Se documenta como hallazgo de higiene (regla 7)
  sin fix, igual que el criterio usado en `tetris` para su regla 14.

### No tocar `components/game-player.tsx` por el `toLocaleString`/`repeat` del HUD de React

- **Sí (descartado):** el precedente de SPEC 18 señala `game-player.tsx:123,128`
  (`score.toLocaleString`, `"♥ ".repeat(lives)`) como patrón costoso de regla 8.
- **No (elegido):** en Snake el `score`/`lives` de React solo cambian por evento (comer fruta, perder
  la partida), no por frame — el mismo razonamiento que llevó a que ninguna de las tres invocaciones
  previas (`asteroides`, `tetris`, `arkanoid`) tocara ese archivo por esta regla. Se documenta el
  hallazgo (severidad baja) sin fix, consistente con el tratamiento ya dado a la regla 19
  (`localStorage` en el inicializador de `useState`) en las fichas anteriores.

### No modificar el reprogramado de `tickMs` al subir de nivel

- **Sí (descartado):** se notó que `step()` reduce `tickMs` en cada level-up pero `scheduleTimer()`
  nunca se vuelve a llamar con el nuevo valor, por lo que el intervalo real del timer no cambia en
  caliente.
- **No (elegido):** esto es un comportamiento preexistente de **balance/velocidad de juego**, no un
  problema de rendimiento — cambiarlo alteraría cuán rápido se siente el juego al subir de nivel, lo
  cual está expresamente fuera de alcance de esta auditoría. Se documenta como hallazgo incidental,
  no se toca.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                | Mitigación                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El fix de la regla 5 (detener el timer en game over) cambia el comportamiento observable: antes el motor seguía "vivo" (aunque inerte) tras game over; ahora `running` pasa a `false` inmediatamente. | `finish()`/`restart()` en `game-player.tsx` no dependen de que el engine siga "corriendo" tras game over — se verificó que `restart()` reconstruye el estado desde cero y vuelve a llamar `scheduleTimer()` sin importar el valor previo de `running`. |
| No se pudo medir con Playwright en esta invocación (herramientas `mcp__playwright__*` no disponibles) — la verificación de mejora es solo por revisión de código, no por medición antes/después.      | Documentado explícitamente como limitación, igual que en `specs/20-performance-tetris.md` y `specs/21-performance-arkanoid.md`.                                                                                                                        |

---

## Qué **no** está en esta spec

- Optimizar `randomFreeCell` con un Set incremental (ver Decisiones).
- Tocar `components/game-player.tsx` por el `toLocaleString`/`repeat` del HUD (ver Decisiones).
- Cambiar el reprogramado de `tickMs` en caliente al subir de nivel (ver Decisiones).
- Auditar `frogger` ni ningún otro juego del catálogo — queda `pendiente` para su propia invocación.

---

## Resultados (2026-08-20)

### Checklist aplicado a `lib/games/snake/engine.ts`

| #   | Regla                                                            | Resultado                                                                                                  | archivo:línea                                                                 | Severidad    |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------ |
| 1   | `loop()` clampea `dt`                                            | No aplica — timer de paso fijo (`setInterval`), no rAF con `dt` variable                                   | `lib/games/snake/engine.ts` (`scheduleTimer`)                                 | —            |
| 2   | `destroy()` cancela timer/listeners                              | Pasa                                                                                                       | `lib/games/snake/engine.ts` (`destroy`)                                       | —            |
| 3   | `start()` idempotente                                            | Fallaba → corregido                                                                                        | `lib/games/snake/engine.ts` (`start`)                                         | baja         |
| 4   | Callbacks async de assets guardados contra desmontaje            | No aplica — `fruitSheet` no tiene callback `onload`, se lee `.complete` en `draw()`                        | `lib/games/snake/engine.ts` (`drawFruit`)                                     | —            |
| 5   | Timer se detiene en game over y con `visibilitychange`           | Fallaba → corregido                                                                                        | `lib/games/snake/engine.ts` (`tick`, `start`, `onVisibilityChange`)           | media        |
| 6   | `emitIfChanged` con reseteo en `initGame`                        | Pasa                                                                                                       | `lib/games/snake/engine.ts` (`initGame`)                                      | —            |
| 7   | Sin `.filter`/`.map`/`.concat`/spread en update/draw             | Falla técnica sin impacto (evento raro, no por frame) — sin fix                                            | `lib/games/snake/engine.ts:104-105` (`randomFreeCell`)                        | baja         |
| 8   | Sin template literals/`repeat`/`toLocaleString` por frame/render | Fallaba → corregido en el motor; hallazgo sin fix en HUD de React                                          | `lib/games/snake/engine.ts` (`drawHUD`); `components/game-player.tsx:123,128` | media / baja |
| 9   | Sin parsing de color en caliente en `draw()`                     | Pasa — la paleta se usa directo como `fillStyle`                                                           | `lib/games/snake/engine.ts`                                                   | —            |
| 10  | Sin objetos DOM/media creados en el loop                         | Pasa                                                                                                       | —                                                                             | —            |
| 11  | Geometría estática cacheada offscreen                            | No aplica — fondo sólido, sin grilla dibujada                                                              | `lib/games/snake/engine.ts` (`draw`)                                          | —            |
| 12  | Cache de sprites con clave completa                              | No aplica — `drawImage` directo desde `fruitSheet`, sin capa de cache                                      | `lib/games/snake/engine.ts` (`drawFruit`)                                     | —            |
| 13  | Colisiones con broad-phase                                       | Pasa (no aplica) — colisión solo contra la propia cola, O(n) acotado por el tamaño de la grilla (máx. 300) | `lib/games/snake/engine.ts` (`step`)                                          | —            |
| 14  | Sin `.every`/`.some` anidados en un `for` externo                | Pasa — `snake.some()` se llama una vez por tick, sin anidar                                                | `lib/games/snake/engine.ts` (`step`)                                          | —            |
| 15  | Colecciones acotadas                                             | Pasa — `snake` acotado por `COLS*ROWS`                                                                     | `lib/games/snake/engine.ts`                                                   | —            |
| 16  | Bucles de rechazo con límite de intentos                         | Fallaba → corregido                                                                                        | `lib/games/snake/engine.ts` (`randomFreeCell`)                                | baja         |
| 17  | `save()/restore()` o restauración explícita                      | Pasa — cada función fija `fillStyle`/`font`/`textAlign` antes de usarlos, sin dejar estado colgante        | `lib/games/snake/engine.ts`                                                   | —            |
| 18  | `devicePixelRatio` si el canvas se escala por CSS                | Fallaba → corregido                                                                                        | `lib/games/snake/engine.ts` (setup)                                           | baja         |
| 19  | Sin `localStorage` en inicializador de `useState`                | Falla conocida, sin fix (SPEC 18)                                                                          | `components/game-player.tsx:31-38`                                            | baja         |
| 20  | `TouchControls` memoizado                                        | Pasa (ya corregido en la invocación de `asteroides`)                                                       | `components/touch-controls.tsx`                                               | —            |
| 21  | Timers de auto-repeat táctil con cleanup                         | No se manifiesta en Snake (`repeatCodes: []`); cleanup ya existe (compartido)                              | `components/touch-controls.tsx`                                               | —            |

**Fixes aplicados:**

- `start()` idempotente (`if (running) return`) — regla 3.
- `tick()` detiene el timer (`stopTimer()`) en cuanto `state === "gameover"`, y se agregó
  `visibilitychange` con bandera `pausedByVisibility` que pausa/reanuda sin pisar la pausa manual —
  regla 5.
- Cache de texto de HUD (`hudScoreText`/`hudLevelText`, recalculados solo si `score`/`level`
  cambian) — regla 8.
- `MAX_ATTEMPTS = COLS * ROWS` en `randomFreeCell` con fallback determinista de recorrido de grilla —
  regla 16.
- `devicePixelRatio` + `ctx.scale` al crear el motor — regla 18.

**Hallazgos documentados sin fix:** regla 7 (`.map()` en `randomFreeCell`, costo insignificante por
ser evento raro no por frame), regla 8 en `game-player.tsx` (HUD de React, evento no por frame),
regla 19 (`localStorage` en `useState`, ya documentado en SPEC 18) — ver Decisiones tomadas y
descartadas.

**Compilación:** `tsc --noEmit` sin errores · `lint` con los 4 errores preexistentes de
`.claude/hooks/format-on-write.js` (no relacionados) · `build` sin errores, 20 páginas generadas.

**Nota de verificación:** no se contó con herramientas `mcp__playwright__*` en esta invocación —
verificación funcional por revisión exhaustiva de código (colisión con la cola, wrap en bordes,
spawn de fruta, subida de nivel, pausa/reanudación, game over) en vez de partida jugada en navegador,
misma limitación documentada en `specs/20-performance-tetris.md` y `specs/21-performance-arkanoid.md`.
El servidor de desarrollo (`npm run dev`) estaba corriendo en `http://localhost:3000` durante esta
invocación, pero sin las herramientas `mcp__playwright__*` no fue posible ejecutar la metodología de
medición del Paso 2 de SPEC 18.
