# SPEC 19 — Auditoría y corrección de performance en Asteroides

> **Estado:** Implementado
> **Depende de:** specs/18-performance-motores.md (metodología, limitación de entorno, checklist),
> specs/05-juego-asteroides.md (motor original), specs/11-skins-asteroides.md (paleta usada por
> `withAlpha()`)
> **Fecha:** 2026-08-20
> **Objetivo:** Auditar `lib/games/asteroides/engine.ts` contra el checklist de performance derivado
> de SPEC 18 y corregir los hallazgos confirmados, sin tocar balance de juego ni arquitectura de
> render.

---

## Alcance

**Dentro:**

- Auditoría estática de `lib/games/asteroides/engine.ts` contra las 21 reglas del checklist de
  `game-performance-booster` (ciclo de vida, costo por frame, algoritmos, estado del canvas, React
  compartido).
- Corrección de cada hallazgo confirmado, uno a la vez, en `lib/games/asteroides/engine.ts`, y en
  `components/touch-controls.tsx` para el único hallazgo cuya causa raíz vive ahí (memoización,
  compartida por los 5 juegos).
- Verificación de compilación (`tsc`, `lint`, `build`) y funcional (colisiones, puntaje, niveles,
  vidas, power-up 3x, teclado y overlay táctil) sin cambios de comportamiento.

**Fuera de alcance:**

- Cualquier cambio de balance de juego (velocidad de nave/asteroides, puntaje por tamaño, drop rate
  del power-up) — se auditó y quedó explícitamente fuera de todos los fixes.
- Migrar el render de Canvas 2D a WebGL/OffscreenCanvas — no se identificó como necesario para
  ningún hallazgo de este spec.
- Agregar Playwright como dependencia de test suite del proyecto.
- Auditar o tocar `lib/games/tetris/**`, `lib/games/arkanoid/**`, `lib/games/snake/**`,
  `lib/games/frogger/**` — quedan pendientes para invocaciones futuras del agente, uno por vez.
- El hallazgo de hydration mismatch por `localStorage` en el `useState` inicial de `skin`
  (`components/game-player.tsx:31-38`) — ya documentado y explícitamente descartado de fix en
  SPEC 18 por no tener métrica que mejore; no se reabre aquí.
- El bug de cleanup de timers en `components/touch-controls.tsx` para `repeatCodes` no vacíos
  (regla 21) — no se manifiesta en Asteroides (su `TOUCH_CONFIG` tiene `repeatCodes: []`, nunca crea
  un `setInterval`); queda documentado para cuando se audite Tetris/Frogger, que sí lo usan.

---

## Modelo de datos

Omitido — esta feature no introduce datos nuevos ni estructuras persistentes.

---

## Auditoría (checklist de SPEC 18 aplicado a `lib/games/asteroides/engine.ts`)

| #   | Regla                                                               | Resultado                                                                                                                                                                                      | archivo:línea                                                       | Severidad                 |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------- |
| 1   | `loop()` clampea `dt`                                               | Pasa — `Math.min((ts - lastTime) / 1000, 0.05)`                                                                                                                                                | `engine.ts:720` (antes del fix; línea se desplazó tras los cambios) | —                         |
| 2   | `destroy()` cancela rAF y listeners                                 | Pasa — cancela rAF vía `pause()`/`stopLoop()` y remueve `keydown`/`keyup`                                                                                                                      | `engine.ts` (`destroy`)                                             | —                         |
| 3   | `start()` idempotente                                               | Fallaba — sin guarda, una segunda llamada sin `destroy()` intermedio duplicaba listeners y dejaba un rAF huérfano                                                                              | `engine.ts` (`start`, antes del fix)                                | baja                      |
| 4   | Callbacks async de assets guardados                                 | No aplica — Asteroides no carga spritesheets/audio async                                                                                                                                       | —                                                                   | —                         |
| 5   | Loop se pausa en game over y `visibilitychange`                     | Fallaba — el rAF seguía para siempre tras `gameover` (redibujando el overlay cada frame) y nadie escuchaba `visibilitychange`                                                                  | `engine.ts` (`loop`, `start`, antes del fix)                        | media                     |
| 6   | `emitIfChanged` con reseteo en `initGame`                           | Pasa — `lastScore`/`lastLives`/`lastLevel` se resetean a `-1` en `initGame()`                                                                                                                  | `engine.ts` (`initGame`, `emitIfChanged`)                           | —                         |
| 7   | Sin `.filter`/`.map`/`.concat`/spread en update/draw                | Fallaba — `particles.filter`, `bullets.filter`, `powerUps.filter`, `asteroids.filter(...).concat(...)` cada frame, más `push(...spread)`                                                       | `engine.ts` (`update`, antes del fix)                               | alta                      |
| 8   | Sin template literals/`repeat`/`toLocaleString` por frame           | Fallaba — `drawHUD()` reconstruía `` `SCORE  ${score}` `` y `` `NIVEL ${level}` `` en cada uno de los ~160 frames/s aunque no cambiaran                                                        | `engine.ts` (`drawHUD`, antes del fix)                              | media                     |
| 9   | Sin parsing de color en caliente en `draw()`                        | Fallaba — `withAlpha()` reparseaba el hex/rgba de `palette.particula` (regex + `parseInt`) por cada partícula, cada frame                                                                      | `engine.ts` (`withAlpha`, antes del fix)                            | alta                      |
| 10  | Sin objetos DOM/media creados en el loop                            | Pasa — no hay `new Audio`/`cloneNode` en el motor                                                                                                                                              | —                                                                   | —                         |
| 11  | Geometría estática cacheada offscreen                               | No aplica — el motor es vectorial, no dibuja grilla/fondo por franjas                                                                                                                          | —                                                                   | —                         |
| 12  | Cache de sprites con clave completa                                 | No aplica — no hay cache de sprites (sin spritesheet)                                                                                                                                          | —                                                                   | —                         |
| 13  | Colisiones con broad-phase                                          | Fallaba — bala vs asteroide era un producto cartesiano completo cada frame                                                                                                                     | `engine.ts` (`update`, antes del fix)                               | alta                      |
| 14  | Sin `.every`/`.some` anidados en un `for` externo                   | Pasa — no hay ese patrón en Asteroides                                                                                                                                                         | —                                                                   | —                         |
| 15  | Colecciones acotadas                                                | Pasa — partículas/balas/power-ups se limpian por `dead`/`ttl`; `keys`/`justPressed` acotados por el teclado físico                                                                             | `engine.ts`                                                         | —                         |
| 16  | Bucles de rechazo con límite de intentos                            | Fallaba — `spawnAsteroids` usaba `do/while` sin cota (seguro hoy por geometría, frágil a futuro)                                                                                               | `engine.ts` (`spawnAsteroids`, antes del fix)                       | baja                      |
| 17  | `save()/restore()` o restauración explícita en todos los caminos    | Pasa — `Ship`/`Asteroid` usan `save/restore`; el resto (`Bullet`, `PowerUp`, `drawHUD`, `drawOverlay`) siempre fija `fillStyle`/`textAlign` antes de usarlos, sin depender de un estado previo | `engine.ts`                                                         | —                         |
| 18  | `devicePixelRatio` si el canvas se escala por CSS                   | Fallaba — `.asteroides-canvas` se estira a `100%`/`100%` del contenedor sin ajustar backing store por DPR                                                                                      | `app/globals.css:1111-1117`, `engine.ts` (antes del fix)            | baja                      |
| 19  | Sin `localStorage` en inicializador de `useState`                   | Falla conocida y ya dispositionada en SPEC 18 (no se reabre) — afecta a Asteroides por tener skins                                                                                             | `components/game-player.tsx:31-38`                                  | baja (no se toca)         |
| 20  | `TouchControls` memoizado frente a `setScore`/`setLives`/`setLevel` | Fallaba — sin `memo`, se reconciliaba en cada cambio de score/lives/level pese a recibir siempre la misma referencia de `config`                                                               | `components/touch-controls.tsx` (antes del fix)                     | media                     |
| 21  | Timers de auto-repeat táctil con cleanup en desmontaje              | No se manifiesta en Asteroides — `TOUCH_CONFIG.asteroides.repeatCodes` está vacío, nunca se crea un `setInterval`. Bug real pendiente para juegos con `repeatCodes` no vacíos                  | `components/touch-controls.tsx`                                     | — (fuera de alcance aquí) |

---

## Plan de implementación

### Paso 1 — Cache del parseo de color (`withAlpha`, regla 9, alta)

Cachear el resultado de parsear cada string de color de paleta (regex/`parseInt`) en un `Map`,
recalculando solo el `rgba(...)` final con el alpha variable por partícula. Sin cambio de output.

### Paso 2 — Compactar arreglos en `update()` en vez de `.filter()`/`.concat()` (regla 7, alta)

Reemplazar `arr = arr.filter(e => !e.dead)` y `.concat(newAsteroids)` por una función `compact()`
que remueve en el propio arreglo, sin allocar uno nuevo cada frame. Reemplazar los `push(...spread)`
de `ship.tryShoot()`/`a.split()` por bucles `for...of` con `push` individual.

### Paso 3 — Broad-phase para colisión bala↔asteroide (regla 13, alta)

Sustituir el producto cartesiano bullets×asteroids por una rejilla uniforme (`COLLISION_CELL = 128`,
≥ 2× el mayor radio de colisión) reconstruida una vez por frame; cada bala solo compara contra los
asteroides de su celda y las 8 vecinas. Resultado idéntico al recorrido completo (la celda es lo
bastante grande para no perder ningún par), solo cambia el costo.

### Paso 4 — Pausar el loop en game over y en `visibilitychange` (regla 5, media)

El loop deja de pedir `requestAnimationFrame` cuando `state === "gameover"` y ya no quedan
partículas de la explosión final animándose (la pantalla de fin de partida queda estática con el
último frame dibujado, en vez de seguir redibujando para siempre). Se agrega un listener de
`visibilitychange` que detiene el loop al ocultar la pestaña y lo reanuda solo si fue él quien lo
detuvo (no pisa una pausa explícita del usuario ni un game over ya terminado).

### Paso 5 — Cache de texto de HUD (regla 8, media)

`drawHUD()` cachea el texto de `SCORE`/`NIVEL` y solo lo recalcula cuando el valor subyacente
cambia, en vez de reconstruir el template literal en cada uno de los ~160 frames/s del entorno.

### Paso 6 — Memoizar `TouchControls` (regla 20, media, archivo compartido)

`components/touch-controls.tsx` exporta el componente envuelto en `React.memo`. `config` es siempre
la misma referencia (`TOUCH_CONFIG[gameId]`, constante de módulo), así que memo evita reconciliar el
panel táctil en cada cambio de score/lives/level de cualquiera de los 5 juegos.

### Paso 7 — Límite de intentos en `spawnAsteroids` (regla 16, baja)

Se agrega `MAX_ATTEMPTS = 50` al `do/while` de posicionamiento seguro, sin cambiar el resultado
observable hoy (la condición geométrica sigue siendo la que decide en la práctica).

### Paso 8 — `devicePixelRatio` en el canvas (regla 18, baja)

Al crear el motor, si `devicePixelRatio !== 1` se agranda el backing store (`canvas.width/height`)
por ese factor y se escala el contexto (`ctx.scale(dpr, dpr)`) una sola vez, para que las líneas
vectoriales no se vean borrosas en pantallas de alta densidad. El resto del código sigue dibujando
en coordenadas lógicas 800×600 sin cambios.

### Paso 9 — `start()` idempotente (regla 3, baja)

Se agrega `if (running) return;` al inicio de `start()` para no duplicar listeners ni dejar un rAF
huérfano si se llamara dos veces sin `destroy()` intermedio.

---

## Criterios de aceptación

- [x] Los 21 renglones del checklist de SPEC 18 fueron evaluados contra `engine.ts` con
      archivo:línea y severidad.
- [x] Cada hallazgo con severidad alta o media tiene un fix aplicado.
- [x] Los hallazgos de baja severidad también se corrigieron (bajo riesgo, sin tocar balance).
- [x] Ningún fix cambia velocidad, dificultad, puntaje ni arquitectura de render.
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores/advertencias nuevas.
- [x] Verificación funcional: colisiones bala↔asteroide, power-up 3x, vidas, niveles, game over,
      pausa manual y controles táctiles se comportan igual que antes (revisión de código: la rejilla
      de colisión es exacta, no aproximada; `compact()` preserva el mismo conjunto de sobrevivientes
      que `.filter()`; el cache de HUD/color no cambia ningún output visible).
- [x] Registro `references/performance-audited.md` actualizado con la ficha de Asteroides.

---

## Decisiones tomadas y descartadas

### Corregir los 3 hallazgos de severidad baja en la misma pasada, no diferirlos

- **Sí:** los tres (idempotencia de `start()`, límite de intentos de `spawnAsteroids`,
  `devicePixelRatio`) son cambios acotados y de bajo riesgo, contenidos en `engine.ts`, sin tocar
  balance ni arquitectura — no había razón para abrir un spec de seguimiento solo para estos.
- **No:** dejarlos documentados sin fix (como hizo SPEC 18 con el hallazgo de hydration) — se
  descarta porque, a diferencia de ese caso, sí tienen un fix simple y sin riesgo disponible.

### Broad-phase por rejilla en vez de solo un `break` tras la primera colisión

- **Sí:** un `break` tras la primera colisión de cada bala solo evita iteraciones redundantes
  después de un impacto, pero no reduce el costo del recorrido completo cuando no hay colisión (el
  caso más frecuente). La rejilla ataca la causa real de la regla 13 (producto cartesiano) sin
  requerir reescribir el render ni el modelo de entidades.
- **No:** una rejilla que además considere el wraparound de los bordes (`wrap()`) para detectar
  colisiones "a través" del borde del mapa — se descarta porque `dist()` ya no considera wraparound
  hoy (comportamiento preexistente, no un bug introducido por este spec); replicar exactamente ese
  comportamiento (sin wraparound) mantiene el resultado idéntico al de antes del fix.

### No tocar `components/touch-controls.tsx` más allá de la memoización

- **Sí:** el bug de cleanup de timers (regla 21) no se manifiesta en Asteroides (`repeatCodes: []`),
  así que corregirlo aquí sería tocar código no relacionado al objetivo de esta invocación, violando
  la regla de "un juego por invocación" salvo causa compartida confirmada.
- **No:** corregirlo de una vez ya que se detectó — se descarta; queda documentado para cuando se
  audite Tetris o Frogger (que sí usan `repeatCodes` no vacíos).

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                    | Mitigación                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La rejilla de broad-phase (`COLLISION_CELL = 128`) deja de ser exacta si en el futuro se agregan asteroides con radio > 62px (128/2 − radio de bala) sin ajustar la constante.                                                            | Comentario en el código explicando la relación `cell size ≥ 2 × radio máximo de colisión`; cualquier cambio de `RADII` debe revisar `COLLISION_CELL`.                                                                                                                      |
| El fix de `visibilitychange` interactúa con `pause()`/`resume()` externos (llamados por `game-player.tsx`); un error de la bandera `pausedByVisibility` podría reanudar un juego que el usuario pausó manualmente al volver a la pestaña. | La bandera solo se activa cuando el propio listener detuvo el loop (`running` era `true` al ocultar la pestaña) y se limpia en `pause()`/`resume()`/`restart()` explícitos, para no pisar un estado pedido por el usuario.                                                 |
| Memoizar `TouchControls` es un cambio en un archivo compartido por los 5 juegos; un error ahí afectaría a todos, no solo a Asteroides.                                                                                                    | El cambio es mínimo (envolver en `memo`, sin tocar props ni lógica interna) y se verificó con `tsc`/`lint`/`build`; los otros 4 juegos siguen pendientes de auditoría propia donde se revisará su comportamiento táctil en detalle.                                        |
| No se pudo re-medir con Playwright (esta invocación del agente no tiene acceso a herramientas `mcp__playwright__*`), aunque el dev server estaba corriendo.                                                                               | Se documenta como limitación de esta invocación, no como hallazgo descartado; los fixes se justifican por lectura de código y por la metodología/limitación de entorno ya documentada en SPEC 18 (Chromium sin vsync real no distingue bien estos costos de todas formas). |

---

## Qué **no** está en esta spec

- Auditoría de Tetris, Arkanoid, Snake o Frogger — cada uno se audita en su propia invocación de
  `game-performance-booster`.
- Fix del bug de cleanup de timers en `touch-controls.tsx` para `repeatCodes` no vacíos (regla 21) —
  no aplica a Asteroides, queda para el juego donde se audite y confirme.
- Fix del hydration mismatch de `skin` en `game-player.tsx` — ya dispositionado sin fix en SPEC 18.
- Cualquier cambio de balance de juego o migración de arquitectura de render.

---

## Resultados (2026-08-20)

### Compilación

- `npx tsc --noEmit`: sin errores.
- `npm run lint`: 4 errores preexistentes en `.claude/hooks/format-on-write.js`
  (`@typescript-eslint/no-require-imports`), no relacionados a este spec — no se tocó ese archivo.
- `npm run build`: compila y genera las 20 páginas sin errores.

### Medición

No se ejecutó — el dev server estaba corriendo (`http://localhost:3000` responde `200`), pero esta
invocación del agente no tuvo acceso a herramientas `mcp__playwright__*` para repetir la metodología
de SPEC 18. Los fixes se validan por lectura de código (equivalencia funcional exacta de cada
reemplazo) y por compilación exitosa.

### Verificación funcional (revisión de código, sin Playwright)

- Colisión bala↔asteroide: la rejilla de 3×3 celdas de 128px cubre exactamente el mismo conjunto de
  pares que el recorrido completo anterior, dado que ningún radio de colisión supera 52px.
- `compact()` preserva el orden relativo y el conjunto exacto de elementos vivos que producían los
  `.filter()` reemplazados.
- Power-up 3x, vidas, niveles y game over: lógica de `update()` sin cambios de condición, solo de
  mecanismo de limpieza de arreglos.
- Pausa manual (botón PAUSA de `game-player.tsx`) y controles táctiles: `pause()`/`resume()` externos
  siguen con la misma firma; `pausedByVisibility` se limpia en ambos para no interferir.

---

**Fichas actualizadas:** ver `references/performance-audited.md`.
