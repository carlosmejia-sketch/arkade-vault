# SPEC 21 — Auditoría y corrección de performance en Arkanoid

> **Estado:** Implementado
> **Depende de:** specs/18-performance-motores.md, specs/08-juego-arkanoid.md, specs/13-skins-arkanoid.md, specs/14-controles-tactiles.md
> **Fecha:** 2026-08-20
> **Objetivo:** Auditar `lib/games/arkanoid/engine.ts` contra el checklist de performance derivado de SPEC 18 y corregir únicamente los hallazgos cuyo efecto sea de rendimiento (nunca balance de juego ni arquitectura de render).

---

## Alcance

**Dentro:**

- Auditoría estática de `lib/games/arkanoid/engine.ts` (y `sprites.ts`/`levels.ts` como soporte) contra
  las 21 reglas del checklist de performance (ciclo de vida del engine, costo por frame, algoritmos,
  estado del canvas, integración React).
- Corrección de cada hallazgo confirmado, en el archivo donde vive la causa raíz.
- Verificación de compilación (`tsc`, `lint`, `build`) y verificación funcional de Arkanoid (colisiones,
  puntaje, niveles, pausa con selector de nivel, sonido, controles de teclado/mouse/táctil).

**Fuera de alcance:**

- Cualquier cambio de balance de juego (velocidad de la pelota/paleta, puntaje por bloque, diseño de
  niveles).
- Migrar el render de Canvas 2D a WebGL/OffscreenCanvas u otra reescritura arquitectónica mayor.
- Agregar Playwright como dependencia de test suite del proyecto.
- Auditar o corregir cualquier otro juego del catálogo (`asteroides`, `tetris`, `snake`, `frogger`) —
  ya auditados o pendientes de su propia invocación.

---

## Modelo de datos

Omitido — esta feature no introduce datos nuevos ni estructuras persistentes.

---

## Auditoría (checklist de SPEC 18 aplicado a `lib/games/arkanoid/engine.ts`)

| #   | Regla                                                     | Resultado                                                                                          | archivo:línea                                                                                                                             | Severidad |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | `loop()` clampea `dt`                                     | Pasa                                                                                               | `lib/games/arkanoid/engine.ts:487`                                                                                                        | —         |
| 2   | `destroy()` cancela rAF y quita listeners                 | Pasa                                                                                               | `lib/games/arkanoid/engine.ts:540-549`                                                                                                    | —         |
| 3   | `start()` idempotente                                     | Falla                                                                                              | `lib/games/arkanoid/engine.ts:500-514`                                                                                                    | baja      |
| 4   | Callbacks async de assets guardados contra desmontaje     | Falla                                                                                              | `lib/games/arkanoid/engine.ts:510-513`, `sprites.ts:81-104`                                                                               | alta      |
| 5   | Loop se pausa en game over y `visibilitychange`           | Falla                                                                                              | `lib/games/arkanoid/engine.ts:485-498`                                                                                                    | media     |
| 6   | `emitIfChanged` con reseteo en `initGame`                 | Pasa                                                                                               | `lib/games/arkanoid/engine.ts:273-284`                                                                                                    | —         |
| 7   | Sin `.filter`/`.map`/`.concat`/spread en update/draw      | Falla                                                                                              | `lib/games/arkanoid/engine.ts:384`                                                                                                        | alta      |
| 8   | Sin template literals/`repeat`/`toLocaleString` por frame | Falla                                                                                              | `lib/games/arkanoid/engine.ts:464,466`                                                                                                    | media     |
| 9   | Sin parsing de color en caliente en `draw()`              | Pasa (tintCache evita reparseo)                                                                    | `lib/games/arkanoid/engine.ts:105-125`                                                                                                    | —         |
| 10  | Sin objetos DOM/media creados en el loop                  | Falla                                                                                              | `lib/games/arkanoid/engine.ts:190-193`                                                                                                    | media     |
| 11  | Geometría estática cacheada offscreen                     | Pasa (no aplica — fondo es `fillRect` sólido)                                                      | `lib/games/arkanoid/engine.ts:444-445`                                                                                                    | —         |
| 12  | Cache de sprites con clave completa                       | Falla                                                                                              | `lib/games/arkanoid/engine.ts:132,143`                                                                                                    | baja      |
| 13  | Colisiones con broad-phase                                | Pasa (barrido lineal ball×≤60 bloques con `break`, no producto cartesiano)                         | `lib/games/arkanoid/engine.ts:360-381`                                                                                                    | —         |
| 14  | Sin `.every()`/`.some()` anidados en un `for` externo     | Falla                                                                                              | `lib/games/arkanoid/engine.ts:375`                                                                                                        | media     |
| 15  | Colecciones acotadas                                      | Pasa                                                                                               | `lib/games/arkanoid/engine.ts`                                                                                                            | —         |
| 16  | Bucles de rechazo con límite de intentos                  | No aplica (sin spawn por rechazo)                                                                  | —                                                                                                                                         | —         |
| 17  | `save()/restore()` o restauración explícita               | Pasa (cada función fija su propio estado antes de dibujar; sin excepciones que dejen estado sucio) | `lib/games/arkanoid/engine.ts:397-441`                                                                                                    | —         |
| 18  | `devicePixelRatio` si el canvas se escala por CSS         | Falla                                                                                              | `lib/games/arkanoid/engine.ts:98` (setup), `app/globals.css:1111-1117` (`.asteroides-canvas`, clase compartida con el canvas de Arkanoid) | baja      |
| 19  | Sin `localStorage` en inicializador de `useState`         | Falla conocida, sin fix (ya documentado en SPEC 18/19/20)                                          | `components/game-player.tsx:31-38`                                                                                                        | baja      |
| 20  | `TouchControls` memoizado                                 | Pasa (ya corregido en la invocación de `asteroides`)                                               | `components/touch-controls.tsx`                                                                                                           | —         |
| 21  | Timers de auto-repeat táctil con cleanup                  | No se manifiesta en Arkanoid (`repeatCodes: []`); cleanup ya existe (compartido)                   | `lib/games/touch-config.ts:34-42`, `components/touch-controls.tsx`                                                                        | —         |

Notas de la auditoría:

- Regla 4 es un hallazgo propio de Arkanoid (único motor con carga asíncrona de assets): si
  `destroy()` se llama antes de que `loadSpritesheet` resuelva (montaje/desmontaje rápido, ej. el
  usuario navega a `SALIR` durante la carga inicial), el callback igual ejecuta `initGame()` y arranca
  un `requestAnimationFrame` huérfano que sigue llamando a `callbacks.onScore/onLives/onLevel` sobre un
  componente ya desmontado — coincide con el precedente documentado en el checklist del agente.
- Regla 18: la clase CSS `.asteroides-canvas` es compartida por Asteroides y Arkanoid (ver
  `components/game-player.tsx:180-186`, ambos motores caen al mismo `className` porque ninguno es
  Tetris ni Frogger). El fix de `asteroides` (SPEC 19) se contuvo enteramente en su `engine.ts` sin
  tocar `app/globals.css`; se replica el mismo patrón aquí para no reabrir una causa compartida por
  CSS que afectaría a Asteroides sin que el usuario lo haya pedido en esta invocación.
- Regla 13 se marca "Pasa": el barrido es ball×bloques (una sola pelota, ≤60 bloques), lineal y con
  `break` tras el primer impacto — no es el producto cartesiano O(n²) que sí aparece en Asteroides
  (balas×asteroides, ambos conjuntos variables).

---

## Plan de implementación

### Paso 1 — Guardar callback async de `loadSpritesheet` contra desmontaje (regla 4, alta)

Agregar una bandera `destroyed` seteada en `destroy()`; el callback de `loadSpritesheet` en `start()`
verifica la bandera antes de llamar `initGame()` y de programar el primer `requestAnimationFrame`.

### Paso 2 — Evitar `.filter()` por frame en `explosions` (regla 7, alta)

Reemplazar `explosions = explosions.filter(...)` dentro de `update()` por una compactación in-place
(mismo patrón que `asteroides` — swap-pop o reescritura del arreglo sin crear uno nuevo cada frame).

### Paso 3 — Pausar el loop en game over/win y agregar `visibilitychange` (regla 5, media)

El loop deja de reprogramar `requestAnimationFrame` una vez que `state !== "playing"` (salvo que la
lógica de pausa ya lo cubra) y se agrega un listener de `visibilitychange` en `start()`/`destroy()` que
pausa/reanuda sin pisar la pausa manual del usuario ni el estado de `paused` que controla el overlay
de selección de nivel.

### Paso 4 — Cachear el texto del HUD (regla 8, media)

Cachear las cadenas `Score: ${score}` / `Nivel: ${currentLevel}` (recalculadas solo cuando cambian,
mismo patrón `hudScoreCache`/`hudLevelCache` que `asteroides`), evitando el template literal en cada
frame de `draw()`.

### Paso 5 — Pool de `Audio` en vez de `cloneNode` por rebote (regla 10, media)

Reemplazar el `cloneNode(true)` por rebote/rotura con un pool pequeño y fijo de instancias de `Audio`
(creadas una sola vez al construir el motor) que se recorren en round-robin, preservando el
comportamiento de sonidos superpuestos sin crear un nodo DOM nuevo por evento.

### Paso 6 — Evitar `.every()` anidado dentro del `for` de bloques (regla 14, media)

Sustituir `blocks.every((b) => !b.alive)` por un contador `aliveBlocks` decrementado al destruir cada
bloque, comparado contra `0` — evita el recorrido adicional sobre `blocks` dentro del bucle principal.

### Paso 7 — `start()` idempotente (regla 3, baja)

Agregar `if (running) return;` al inicio de `start()`, mismo patrón que `asteroides`/`tetris`.

### Paso 8 — Clave de cache de sprite completa (regla 12, baja)

Incluir `w`/`h` en la clave de `tintCache` para `paddle`/`ball` (ej. `` `paddle:${w}x${h}` ``),
eliminando la fragilidad de una clave que hoy no varía pero que ignora dimensiones si cambiaran.

### Paso 9 — `devicePixelRatio` en el canvas (regla 18, baja)

Al crear el motor, si `devicePixelRatio !== 1`, agrandar el backing store (`canvas.width/height`) por
el DPR y hacer `ctx.scale(dpr, dpr)`, igual que en `asteroides`/`tetris` — sin tocar `app/globals.css`
(clase compartida con Asteroides, ver nota de auditoría).

### Paso 10 — Verificación

`npx tsc --noEmit`, `npm run lint`, `npm run build`; verificación funcional manual de Arkanoid
(colisiones bloque/pelota, rebotes en paredes y paleta, sonido, cambio de nivel, pausa con selector de
nivel por clic, controles de teclado/mouse/táctil, game over y win).

---

## Criterios de aceptación

- [ ] Los 9 hallazgos confirmados en la auditoría (reglas 3, 4, 5, 7, 8, 10, 12, 14, 18) tienen un fix
      aplicado en `lib/games/arkanoid/engine.ts`.
- [ ] Ningún fix cambia el comportamiento funcional de Arkanoid (colisiones, puntaje, niveles, pausa,
      sonido, controles) frente a una partida jugada antes y después.
- [ ] Ningún fix cambia balance de juego ni migra el render a WebGL/OffscreenCanvas.
- [ ] `app/globals.css` no se modifica (la clase `.asteroides-canvas` es compartida con Asteroides,
      fuera del alcance de esta invocación).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.
- [ ] `references/performance-audited.md` actualizado: fila de `arkanoid` a `auditado`, ficha con
      resultado por regla y fixes aplicados.

---

## Decisiones tomadas y descartadas

### No tocar `app/globals.css` para el fix de `devicePixelRatio`

- **Sí:** `.asteroides-canvas` es la misma clase que usa el canvas de Asteroides (`game-player.tsx`
  aplica esa clase a cualquier juego que no sea Tetris ni Frogger). Contener el fix en
  `engine.ts` (igual que hizo `asteroides` en SPEC 19) evita reabrir una causa compartida por CSS sin
  que el usuario haya pedido auditar Asteroides en esta invocación.
- **No:** agregar `image-rendering: pixelated` o una clase nueva `.arkanoid-canvas` — se descarta
  porque excede el alcance de "un juego por invocación" (tocaría CSS compartido o requeriría cambiar
  `game-player.tsx`, un archivo compartido, sin que la causa raíz esté ahí).

### Pool de `Audio` en vez de eliminar el clon

- **Sí:** el clon por rebote existe para permitir sonidos superpuestos (varios rebotes rápidos no se
  cortan entre sí); un pool fijo preserva esa experiencia sin crear un nodo DOM nuevo por evento.
- **No:** usar una sola instancia de `Audio` reseteando `currentTime` — se descarta porque corta el
  sonido anterior si dos rebotes ocurren muy seguido, cambiando la experiencia audible (fuera del
  alcance: "nunca balance ni arquitectura", pero el sonido es percepción del jugador y se prefiere no
  degradarlo).

### Contador `aliveBlocks` en vez de mantener `blocks.every()`

- **Sí:** evita el recorrido O(n) adicional sobre `blocks` en el evento (poco frecuente) de romper un
  bloque, sin cambiar la condición de victoria (nivel completo cuando no quedan bloques vivos).
- **No:** dejarlo sin fix como se hizo con el `.every()` de `clearLines` en Tetris (SPEC 20) — se
  descarta porque ahí el evento es "línea completada" (ya de por sí poco frecuente y ligero), mientras
  que aquí el fix es trivial (un contador) y no agrega riesgo, a diferencia de rediseñar la lógica de
  limpieza de líneas de Tetris.

---

## Riesgos identificados

| Riesgo                                                                                                          | Mitigación                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| El pool de `Audio` podría sonar distinto si el navegator limita instancias concurrentes de reproducción.        | Mantener el mismo número de voces superpuestas que el `cloneNode` permitía en la práctica (pool pequeño, 4).                      |
| El guard de `destroyed` en `loadSpritesheet` podría enmascarar un error real de carga si se agrega mal.         | Cubrir con verificación funcional manual: montar y desmontar Arkanoid rápido (antes de que cargue el spritesheet).                |
| No se dispone de herramientas `mcp__playwright__*` en esta invocación para re-medir frame time/memoria.         | Documentado como limitación (igual que SPEC 20); verificación exclusivamente por revisión de código y prueba manual en navegador. |
| El fix de `devicePixelRatio` en `engine.ts` interactúa con `drawImage` de sprites (no solo trazos vectoriales). | Verificar visualmente que paddle/pelota/bloques no aparecen recortados o desplazados tras el `ctx.scale`.                         |

---

## Resultados (2026-08-20)

### Fixes aplicados

- **Regla 4 (alta):** bandera `destroyed` seteada en `destroy()`; el callback de `loadSpritesheet` en
  `start()` verifica `destroyed` antes de llamar `initGame()`/programar el primer
  `requestAnimationFrame` — `lib/games/arkanoid/engine.ts` (`start`, `destroy`).
- **Regla 7 (alta):** `explosions.filter(...)` reemplazado por compactación in-place (índice de
  escritura sobre el mismo arreglo) — `lib/games/arkanoid/engine.ts` (`update`).
- **Regla 5 (media):** el loop deja de reprogramar `requestAnimationFrame` en cuanto `state` es
  `"gameover"`/`"win"`, y se agregó un listener de `visibilitychange` que pausa/reanuda sin pisar la
  pausa manual (`paused`) ni interferir con la carga asíncrona del spritesheet (bandera `assetsReady`)
  — `lib/games/arkanoid/engine.ts` (`loop`, `onVisibilityChange`, `start`, `destroy`).
- **Regla 8 (media):** cache de las cadenas `Score: ${score}` / `Nivel: ${currentLevel}`
  (`hudScoreText`/`hudLevelText`), recalculadas solo cuando el valor cambia —
  `lib/games/arkanoid/engine.ts` (`draw`).
- **Regla 10 (media):** pool fijo de 4 instancias de `Audio` por sonido (creadas una sola vez),
  recorridas en round-robin en vez de `cloneNode(true)` por rebote/rotura —
  `lib/games/arkanoid/engine.ts` (`playBounce`, `playBreak`).
- **Regla 14 (media):** contador `aliveBlocks` decrementado al destruir un bloque, en vez de
  `blocks.every((b) => !b.alive)` dentro del `for` de colisión — `lib/games/arkanoid/engine.ts`
  (`update`, `loadLevel`).
- **Regla 3 (baja):** `start()` idempotente (`if (running) return;`) —
  `lib/games/arkanoid/engine.ts` (`start`).
- **Regla 12 (baja):** clave de `tintCache` para paddle/pelota ahora incluye `w`/`h`
  (`` `paddle:${w}x${h}` ``, `` `ball:${w}x${h}` ``) — `lib/games/arkanoid/engine.ts`
  (`drawPaddleTinted`, `drawBallTinted`).
- **Regla 18 (baja):** `devicePixelRatio` + `ctx.scale` al crear el motor, contenido enteramente en
  `engine.ts` sin tocar `app/globals.css` (clase `.asteroides-canvas` compartida con Asteroides) —
  `lib/games/arkanoid/engine.ts` (setup).

No se tocó `app/globals.css`, `components/game-player.tsx` ni `components/touch-controls.tsx` — ningún
hallazgo de esta auditoría tuvo su causa raíz ahí.

### Compilación

- `npx tsc --noEmit`: sin errores.
- `npm run lint`: 4 errores preexistentes en `.claude/hooks/format-on-write.js`
  (`@typescript-eslint/no-require-imports`), no relacionados — no se tocó ese archivo.
- `npm run build`: compila y genera las 20 páginas sin errores nuevos.

### Verificación funcional

No se contó con herramientas `mcp__playwright__*` en esta invocación (mismo caso ya documentado en
`specs/20-performance-tetris.md`), así que la verificación fue por revisión exhaustiva del código
resultante, confirmando que:

- La lógica de colisión bola↔bloque, bola↔paleta y bola↔paredes es idéntica (mismos umbrales, mismo
  orden de checks).
- `aliveBlocks` refleja exactamente la misma condición que `blocks.every((b) => !b.alive)` (se
  inicializa a `blocks.length` en `loadLevel` y se decrementa 1:1 con cada `block.alive = false`).
- El pool de `Audio` preserva la posibilidad de sonidos superpuestos (4 voces) sin cambiar qué sonido
  se reproduce ni cuándo.
- El overlay de pausa con selector de nivel (`onClick`) sigue funcionando igual: `loadLevel()` +
  `draw()` directo, sin pasar por el loop.
- `restart()` sigue reseteando `state` a `"playing"` vía `initGame()` antes de llamar `resume()`, que
  ahora respeta el guard `if (running) return` sin cambiar el flujo (`running` es `false` tras un
  estado terminal).
- El servidor de desarrollo respondió `200` en `/juegos/arkanoid/jugar` tras los cambios (verificación
  mínima de que la ruta sigue montando).

Se documenta como limitación de esta invocación (no bloquea el criterio de aceptación, que exige
revisión de código y compilación) la falta de una partida jugada interactivamente en navegador.

## Qué **no** está en esta spec

- Auditoría o corrección de `asteroides`, `tetris`, `snake` o `frogger` — cada uno se audita en su
  propia invocación de este agente.
- Cambios a `app/globals.css`, `components/game-player.tsx` o `components/touch-controls.tsx` — ningún
  hallazgo de esta auditoría tiene su causa raíz ahí (las reglas 19-21 ya están resueltas o
  documentadas como sin-fix por invocaciones anteriores).
- Migración a WebGL/OffscreenCanvas, aunque el diagnóstico de fondo (Canvas 2D con muchos `drawImage`
  por frame) podría beneficiarse de ella a futuro — se dejaría, si acaso, para un spec independiente.
- Medición instrumentada con Playwright (frame time/latencia/memoria) — no disponible en esta
  invocación; ver Riesgos.
