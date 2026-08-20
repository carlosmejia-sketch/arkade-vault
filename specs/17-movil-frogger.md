# SPEC 17 — Porte a móvil de Frogger

> **Estado:** Implementado
> **Depende de:** SPEC 14 (controles táctiles), SPEC 15 (responsivo móvil 360–428px), specs/game-jam/frogger/01-frogger-core.md (motor), SPEC 16 (skins de Frogger)
> **Fecha:** 2026-08-20
> **Objetivo:** Aplicar a Frogger el patrón ya validado de controles táctiles (SPEC 14) y ausencia de desbordamiento en 360–428px (SPEC 15), completando el diseño táctil fino que la entrada mínima de `TOUCH_CONFIG.frogger` dejó pendiente, sin tocar `lib/games/frogger/engine.ts`.

---

## Alcance

**Dentro:**

1. **`lib/games/touch-config.ts`**: corregir la entrada `frogger` (hoy con `repeatCodes: []`, marcada explícitamente en el propio archivo como "config mínima... el diseño táctil fino se cubre en el spec de mobile-porter"). El diagnóstico de este spec (Paso 2 abajo) determina que Frogger necesita `repeatCodes` en las 4 direcciones.
2. **Auditoría estática de desborde 360–428px** de las clases propias de Frogger (`.cover-frogger`, `.frogger-canvas`) y de los elementos genéricos del reproductor cuando el juego activo es Frogger (HUD con 3 botones de skin + pausa/fin/salir, panel táctil sin botones de acción).
3. Ajustes de CSS en `app/globals.css` si la auditoría encuentra desbordes reales atribuibles a Frogger — no genéricos ya cubiertos por SPEC 15.
4. Verificación manual en celular real: Frogger jugado de punta a punta con el panel táctil.

**Fuera de alcance (para specs futuros):**

- Cualquier cambio a `lib/games/frogger/engine.ts` — el input táctil se resuelve solo con eventos sintéticos de teclado (`ArrowUp/Down/Left/Right`, ya escuchados por el motor).
- Rediseño de `components/touch-controls.tsx` o del bloque CSS `.touch-controls`/`.dpad`/`.action-btn` — se reutilizan tal cual (SPEC 14).
- El canvas y el bloque `.crt` (incluyendo el letterboxing de `.frogger-canvas`, aspect ratio 8/7 dentro de un `.crt-screen` 4/3) — comportamiento ya compartido con Tetris, no se toca.
- El HUD superior genérico (`.player-hud`/`.hud-actions`) — ya lo cubrió SPEC 15 de forma genérica para los 4 juegos existentes; Frogger lo hereda sin cambios propios.
- Otros juegos u otras pantallas — un objetivo por invocación.
- Skins de Frogger (SPEC 16) — ya implementadas, no se tocan.

---

## Modelo de datos

Esta feature no introduce datos nuevos. Modifica un valor dentro de un objeto de configuración estático ya existente (`TOUCH_CONFIG.frogger` en `lib/games/touch-config.ts`), sin cambiar su forma (`TouchControlConfig` no se extiende).

---

## Paso 2 — inventario de input táctil (motor real)

`lib/games/frogger/engine.ts` (`onKeyDown`, líneas 238–263): escucha `ArrowUp/Down/Left/Right` (y `KeyW/A/S/D`, sin equivalente táctil necesario) por `e.code`. Cada `keydown` válido asigna `pendingDir` una única vez; **no hay estado booleano continuo** (`keys[code]`) leído por frame como en Asteroides/Arkanoid. `update()` consume `pendingDir` en `tryStartJump()` y lo limpia a `null` de inmediato tras iniciar el salto (líneas 265–294); mientras `frog.animating` es `true` (120 ms, `JUMP_MS`), cualquier `keydown` entrante se descarta por completo (`if (state !== "playing" || frog.animating) return;`, línea 261) — el motor nunca "recuerda" una tecla sostenida entre saltos, exactamente el mismo patrón de paso discreto por evento que Tetris (SPEC 14, decisión "repetición manual solo para código marcados en `repeatCodes`").

No hay `keyup` escuchado ni acción alguna de botón (disparo, caída rápida, etc.) — Frogger no tiene botones de acción.

| Tecla que escucha el engine | `code` a sintetizar | Slot del panel | ¿Necesita `repeatCodes`? |
| --------------------------- | ------------------- | -------------- | ------------------------ |
| `ArrowUp` / `KeyW`          | `ArrowUp`           | `up`           | Sí                       |
| `ArrowDown` / `KeyS`        | `ArrowDown`         | `down`         | Sí                       |
| `ArrowLeft` / `KeyA`        | `ArrowLeft`         | `left`         | Sí                       |
| `ArrowRight` / `KeyD`       | `ArrowRight`        | `right`        | Sí                       |
| — (sin acción)              | —                   | `buttonA`      | n/a (slot `null`)        |
| — (sin acción)              | —                   | `buttonB`      | n/a (slot `null`)        |

**Corrección respecto a la entrada mínima actual:** `TOUCH_CONFIG.frogger` hoy declara `repeatCodes: []`. Con esa configuración, mantener presionada una flecha del panel táctil produce **un solo salto** (el `keydown` inicial) y luego nada, porque el evento sintético no dispara auto-repeat del sistema operativo — la misma razón documentada en SPEC 14 para Tetris. Un jugador táctil tendría que tocar la flecha una vez por cada una de las 14 filas del tablero, lo cual es jugable pero incómodo comparado con sostener. La corrección es agregar las 4 direcciones a `repeatCodes`, igual que Tetris.

El intervalo de repetición (`REPEAT_MS = 120` en `components/touch-controls.tsx`, no configurable por juego y **no se modifica** en este spec) coincide con `JUMP_MS = 120` del motor. Esto significa que un `keydown` repetido puede llegar en el instante exacto en que `frog.animating` sigue en `true` desde el salto anterior y ser descartado, retrasando el siguiente salto hasta el próximo tick de 120 ms — comportamiento equivalente a mantener una tecla física con un auto-repeat del SO ligeramente más lento que el salto; no es una regresión, es el mismo trade-off ya aceptado para Tetris. No se toca `REPEAT_MS` porque es compartido por los 4 juegos con panel táctil y cambiarlo está fuera de alcance de un solo objetivo.

Sin `buttonA`/`buttonB`: Frogger no tiene ninguna acción de botón (no dispara, no tiene caída rápida ni equivalente). Se mantienen ambos en `null`, igual que hoy — no se renderiza ningún botón de acción, solo el D-pad de 4 direcciones.

---

## Paso 3 — auditoría estática de desborde 360–428px

Hallazgos, con archivo y línea:

1. **`app/globals.css:1131-1141` (`.frogger-canvas`)** — ya sigue el patrón validado de `.tetris-canvas` (`app/globals.css:1119-1129`): `height: 100%; width: auto; left: 50%; transform: translateX(-50%)`, dentro de `.crt-screen` con `aspect-ratio: 4/3` fijo (`app/globals.css:1041-1043`). El canvas nunca fuerza un ancho en `px` sobre el contenedor — se ajusta al alto del CRT, que a su vez es fluido (`.crt` no tiene `width` fijo). No hay desborde horizontal atribuible al canvas. **Sin hallazgo.**
2. **`app/globals.css:808-831` (`.cover-frogger`, `.cover-frogger::after/::before`)** — usadas solo en tarjetas de catálogo/detalle (`background`/`position: absolute` dentro de un contenedor con `aspect-ratio` ya fijado por el componente padre, ver `.detail-cover` en `app/globals.css:847-852` y equivalentes en `library.tsx`); no declara `width`/`min-width` en `px` propios. **Sin hallazgo.**
3. **HUD del reproductor con Frogger activo (`hasSkins = true` en `components/game-player.tsx:29`)** — renderiza 3 botones de skin (CLÁSICO/NEÓN/RETRO) + PAUSA/FIN/SALIR = 6 botones en `.hud-actions` (`app/globals.css:1013-1017`, `display: flex; flex-wrap: wrap`). Mismo conteo de botones que Asteroides/Tetris/Snake con skins (SPEC 11/12), ya ejercitado y corregido por SPEC 15 de forma genérica (no por juego). **Sin hallazgo nuevo — Frogger hereda el fix existente sin requerir una regla propia.**
4. **`.touch-controls` con Frogger** (`app/globals.css:2829-2906`, bloque `pointer: coarse`) — `hasButtons` es `false` (sin `buttonA`/`buttonB`), por lo que solo se renderiza `.dpad` (132×132px fijo) dentro de `.touch-controls` (`display: flex; justify-content: space-between`). Ancho total del panel con un solo hijo: `132px` (dpad) + `28px` (padding 14px × 2) = `160px`, muy por debajo de 360px. `justify-content: space-between` con un único hijo lo alinea al inicio del contenedor sin generar hueco vacío problemático (no hay overflow, solo espacio en blanco a la derecha — cosmético, no funcional). **Sin hallazgo que bloquee jugabilidad**; se documenta como posible mejora cosmética futura (centrar el D-pad cuando no hay botones de acción), fuera de alcance de este spec porque no es un desborde.
5. **Suma de anchos**: `.av-player` (`max-width: 1100px`, `padding: 0 24px 64px` en desktop, `0 16px 32px` bajo `max-width: 720px`, `app/globals.css:971-974` y `1645-1647`) envuelve todo — ya validado por SPEC 15 para los 4 juegos existentes; Frogger no agrega ningún contenedor propio con ancho fijo adicional.
6. **No existe hoy ningún `@media (max-width: 480px)` dedicado** (confirmado, mismo hueco que dejó abierto SPEC 15) — para Frogger no se necesita cerrar ese hueco porque ningún hallazgo de este paso lo requiere; todas las clases propias del juego (`.cover-frogger`, `.frogger-canvas`) ya son fluidas por diseño.

**Conclusión del Paso 3:** no se encontraron desbordes de layout atribuibles a Frogger en 360–428px. El único trabajo real de este spec es la corrección de `repeatCodes` en `TOUCH_CONFIG.frogger` (Paso 2).

---

## Plan de implementación

### Paso 1 — `lib/games/touch-config.ts`

Reemplazar la entrada `frogger` (actualmente `repeatCodes: []`) por:

```ts
frogger: {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  buttonA: null,
  buttonB: null,
  repeatCodes: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"],
},
```

Eliminar el comentario "config mínima... se cubre en el spec de mobile-porter" (ya no aplica) y, si se desea, dejar una nota breve explicando por qué las 4 direcciones están en `repeatCodes` (motor de paso discreto, mismo caso que Tetris).

### Paso 2 — `app/globals.css`

Sin cambios de CSS: el Paso 3 de este spec no encontró desbordes atribuibles a Frogger. No se agrega ningún `@media` nuevo ni se toca `.touch-controls`, `.frogger-canvas` ni `.cover-frogger`.

### Paso 3 — JSX de `components/game-player.tsx`

Sin cambios: el caso especial `isFrogger` ya existe y es correcto (canvas 640×560, clase `frogger-canvas`); el HUD y el montaje de `<TouchControls>` son genéricos y ya funcionan para Frogger sin modificación.

### Paso 4 — Verificación manual

Frogger jugado de punta a punta en un celular real (360–428px, `pointer: coarse`):

- El panel táctil aparece debajo del `.crt`, muestra las 4 flechas del D-pad y ningún botón de acción.
- Sostener una flecha hace saltar a la rana repetidamente en esa dirección (no un solo salto por toque), con una cadencia similar a sostener la tecla física equivalente.
- Las 4 direcciones (arriba/abajo/izquierda/derecha) mueven a la rana correctamente, incluyendo subirse a troncos/tortugas en el río y esquivar autos en la carretera.
- El HUD superior (jugador/puntuación/vidas/nivel/3 botones de skin/pausa/fin/salir) no se corta ni desborda horizontalmente.
- Sin scroll horizontal en ninguna pantalla del reproductor con Frogger activo.
- El teclado físico (flechas y WASD) sigue funcionando exactamente igual que antes de este spec.

### Paso 5 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

- [ ] `TOUCH_CONFIG.frogger` en `lib/games/touch-config.ts` tiene `repeatCodes: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]`, sin cambiar `up`/`down`/`left`/`right`/`buttonA`/`buttonB`.
- [ ] En Frogger táctil: sostener cualquier flecha del D-pad hace saltar a la rana repetidamente en esa dirección, no un único salto por toque.
- [ ] En Frogger táctil: no se renderiza ningún botón de acción (`buttonA`/`buttonB` permanecen `null`).
- [ ] Ningún archivo `lib/games/frogger/engine.ts` se modifica.
- [ ] `components/touch-controls.tsx` y el bloque CSS `.touch-controls`/`.dpad`/`.action-btn` no se modifican.
- [ ] El canvas de Frogger (`.frogger-canvas`), el bloque `.crt` y `.cover-frogger` no cambian de comportamiento ni de posición.
- [ ] Sin scroll horizontal en `/juegos/frogger/jugar` en 360–428px, con y sin panel táctil visible.
- [ ] El teclado físico (flechas y WASD) sigue funcionando exactamente igual que antes de este spec.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Decisiones tomadas y descartadas

### Agregar las 4 direcciones a `repeatCodes` en vez de dejar `[]`

- **Sí:** el motor de Frogger avanza por salto discreto en cada `keydown` y descarta cualquier evento que llegue mientras `frog.animating` es `true` — exactamente el mismo patrón que Tetris, para el cual SPEC 14 ya estableció que los eventos sintéticos necesitan repetición manual porque no disparan el auto-repeat del sistema operativo. Dejar `repeatCodes: []` (como Asteroides/Arkanoid/Snake) es correcto solo cuando el motor lee un booleano continuo por frame, que no es el caso aquí.
- **No:** dejar la config mínima como está (`repeatCodes: []`) — jugable pero degrada la experiencia táctil a "un toque = un salto", inconsistente con el resto del panel y con lo que un jugador esperaría al sostener una flecha.

### No agregar `buttonA`/`buttonB` ni ningún control adicional

- **Sí:** Frogger no tiene ninguna acción de botón (no dispara, no tiene caída rápida, no hay equivalente) — agregar un botón sin función confundiría al jugador, mismo criterio que Arkanoid/Snake en SPEC 14.
- **No:** inventar una acción de conveniencia (ej. "saltar más rápido") — cambiaría el balance del juego, fuera del alcance de un spec de portabilidad móvil que no debe tocar el motor.

### No agregar ningún `@media` nuevo para Frogger

- **Sí:** la auditoría del Paso 3 no encontró ningún desborde atribuible a las clases propias de Frogger (`.cover-frogger`, `.frogger-canvas`); el HUD y el panel táctil son genéricos y ya fueron corregidos por SPEC 15/14 para los 4 juegos existentes, y Frogger los hereda sin necesitar reglas propias.
- **No:** agregar un `@media (max-width: 480px)` "por si acaso" cerrando el hueco general que dejó SPEC 15 — se descarta agregar CSS especulativo sin un hallazgo real que lo justifique; si aparece un desborde real en verificación manual, se documenta y corrige en una iteración de este mismo spec, no se anticipa aquí.

### No tocar `REPEAT_MS` (120ms, compartido por los 4 juegos con panel táctil)

- **Sí:** `REPEAT_MS` en `components/touch-controls.tsx` no es configurable por juego; coincide numéricamente con `JUMP_MS` de Frogger (120ms) pero ese acoplamiento es aceptable (ver Paso 2) y cambiarlo afectaría también a Tetris, fuera del alcance de un objetivo (Frogger) por invocación.
- **No:** parametrizar `REPEAT_MS` por juego para afinar la cadencia de Frogger — requiere modificar `components/touch-controls.tsx`, prohibido por las reglas duras de este agente salvo necesidad demostrada; no hay evidencia de que 120ms sea insuficiente sin verificación manual en dispositivo real.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                                                                                                           | Mitigación                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REPEAT_MS` (120ms) coincide con `JUMP_MS` (120ms) del motor: un `keydown` repetido puede llegar justo cuando `frog.animating` sigue `true` y ser descartado, retrasando el siguiente salto hasta el próximo tick.                                                                                                                               | Aceptado como comportamiento equivalente a un auto-repeat de teclado físico ligeramente desincronizado; verificación manual del Paso 4 confirma que sigue siendo jugable. Si resulta notoriamente lento en dispositivo real, es motivo de una iteración futura sobre `REPEAT_MS` (fuera de este spec por afectar a los 4 juegos). |
| `.dpad` sin `.action-buttons` dentro de `.touch-controls` (`justify-content: space-between`) deja espacio vacío a la derecha del panel — cosmético, no funcional.                                                                                                                                                                                | No se corrige en este spec (no es un desborde); queda documentado como posible mejora visual futura (centrar el D-pad cuando `hasButtons` es `false`), que tocaría `.touch-controls` y por tanto excede el alcance de "no modificar SPEC 14 tal cual".                                                                            |
| Deuda conocida heredada (no se arregla en este spec): `game.best`/`game.plays` no sincronizados con Supabase; sin `preventDefault()` en teclado físico (Frogger sí llama `preventDefault()` en su propio `onKeyDown`, ver `lib/games/frogger/engine.ts:260`, así que esto no aplica a Frogger específicamente); `insertScore` falla en silencio. | Aceptado como riesgo conocido, igual que en specs anteriores.                                                                                                                                                                                                                                                                     |

---

## Qué **no** está en esta spec

- Cambios a `lib/games/frogger/engine.ts`.
- Cambios a `components/touch-controls.tsx` o al bloque CSS `.touch-controls`/`.dpad`/`.action-btn`.
- Cambios al canvas, `.crt`, `.frogger-canvas` o `.cover-frogger`.
- Cambios al HUD genérico del reproductor (`.player-hud`/`.hud-actions`) — ya cubierto por SPEC 15.
- Parametrizar `REPEAT_MS` por juego.
- Cualquier otro juego o pantalla — un objetivo por invocación.
- Skins de Frogger (SPEC 16).
