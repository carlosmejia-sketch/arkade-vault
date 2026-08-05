# SPEC 08 — Juego Arkanoid (motor real + leaderboard Supabase)

> **Estado:** Aprobado
> **Depende de:** SPEC 05 (motor real de Asteroides), SPEC 06 (leaderboard Supabase de Asteroides), SPEC 07 (refactor de generalización — registry `ENGINE_REGISTRY`, ya existente)
> **Fecha:** 2026-08-05
> **Objetivo:** Portar el motor de `references/started-games/04-arkanoid/game.js` a TypeScript como una nueva entrada `"arkanoid"` en el catálogo, con canvas jugable real 800×600 (sprites + sonido incluidos), mouse y teclado, leaderboard real en Supabase, integrado vía el registry ya generalizado, sin tocar el comportamiento de Asteroides, Tetris ni de los 7 mocks restantes.

---

## Alcance

**Dentro:**

1. **Nueva entrada en el catálogo** (`lib/games.ts`): `id: "arkanoid"`, `title` a definir en el paso de implementación (coherente con el resto del catálogo), `cat: "ARCADE"`, `cover: "cover-arkanoid"`, `color` a definir en el paso de implementación, `engine: "arkanoid"`, `best`/`plays` placeholder. `bloque-buster` se mantiene intacto como mock independiente.
2. **Clase CSS `.cover-arkanoid`** en `app/globals.css`, patrón `::after`/`::before` como las demás `.cover-*`.
3. **Assets**: `public/arkanoid/spritesheet-breakout.png`, `public/arkanoid/sounds/ball-bounce.mp3`, `public/arkanoid/sounds/break-sound.mp3` (copiados de `references/started-games/04-arkanoid/assets/`). El motor los carga client-side con `new Image()`/`new Audio()`, mismo mecanismo que el original, sin pipeline de build adicional.
4. **Motor portado a TypeScript** en `lib/games/arkanoid/engine.ts`: paddle, pelota, bloques (10×6, 5 niveles con patrones y velocidad creciente ×1.00–×1.46), colisiones AABB, animación de explosión (4 frames por color), sonidos de rebote/rotura, tal como en `game.js`/`levels.js`. Expone `createArkanoidEngine(canvas, callbacks)` con `{ start, pause, resume, restart, destroy }` (mismo tipo `Engine`/`EngineCallbacks` de `lib/games/types.ts`) y este mapeo explícito:
   - `onScore(score)` cuando cambia (+10 por bloque).
   - `onLives(lives)` cuando cambia (inicia en 3).
   - `onLevel(level)` = nivel real 1–5.
   - `onGameOver(finalScore)` se dispara tanto al perder las 3 vidas (`gameover`) como al completar el nivel 5 (`win`) — un solo modal de "FIN DEL JUEGO" para ambos casos, sin modal de victoria separado.
5. **Controles: mouse y teclado.** El paddle se mueve con `mousemove` sobre el canvas (posición horizontal) o con `←`/`→`. Ambos caminos coexisten, fiel al original.
6. **`components/game-player.tsx`**: sin condicional puntual nuevo — se extiende la rama ya generalizada por el registry (`ENGINE_REGISTRY[game.engine]`) del Paso 0 de SPEC 07. Canvas 800×600 reutilizando la clase `.asteroides-canvas` ya existente (mismas dimensiones, sin clase nueva). HUD con las tres columnas existentes (Puntuación/Vidas/Nivel) — Arkanoid las usa todas, a diferencia de Tetris.
7. **Pausa real vía botón React únicamente**: se remueve el toggle interno por tecla `P`/`Escape` del original; el botón PAUSA de React llama `pause()`/`resume()` del motor. **Se conserva el overlay de pausa con selector de nivel** (feature del motor, no de React): mientras el motor está en pausa, sigue dibujando su overlay con los 5 botones de nivel y maneja el clic sobre el canvas con su propio listener (agregado en `start()`, removido en `destroy()`) — al hacer clic en un botón, salta a ese nivel y permanece en pausa hasta que el usuario presione REANUDAR en React.
8. **Fin de partida sin doble camino**: el único reinicio es el modal de React vía `restart()` (no hay reinicio interno por teclado en `gameover`/`win`).
9. **Guardado de puntaje real**: `saveScore` (localStorage) + `insertScore` (Supabase, `game_id: "arkanoid"`) sin migración nueva — vía el registry/flag ya generalizado.
10. **Leaderboard real en ficha de detalle** (`app/juegos/[id]/page.tsx`) y **Salón de la Fama** (`components/hall-of-fame.tsx`) para `arkanoid`, mismo tratamiento de estado vacío/parcial que Asteroides/Tetris (podio oculto con <3 filas, mensaje "AÚN NO HAY PUNTAJES" con 0 filas).
11. **"TU MEJOR MARCA" real** para `arkanoid` en el Salón de la Fama, buscando por `player_name === user.name`.

**Fuera de alcance (para specs futuras):**

- Controles táctiles (el original solo soporta mouse/teclado).
- Autenticación real / rate limiting / CAPTCHA.
- Supabase Realtime.
- Borrado o edición de puntajes guardados.
- Migración de `bloque-buster` a motor real (sigue como mock independiente).
- Leaderboard real para los 7 mocks restantes (`caida` ya tiene motor propio vía Tetris; quedan `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`, `bloque-buster`).

---

## Modelo de datos

Sin nuevas estructuras de persistencia — reutiliza `Game` (`lib/games.ts`, campo `engine?: string` ya existente desde SPEC 07), `scores` (Supabase, ya existente, `game_id` libre) y `fetchTopScores`/`insertScore` de `lib/scores.ts` tal cual.

Motor nuevo en `lib/games/arkanoid/engine.ts`, usando los tipos genéricos ya extraídos en `lib/games/types.ts` (sin declarar `EngineCallbacks`/`Engine` de nuevo):

```ts
import type { Engine, EngineCallbacks } from "../types";

export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
): Engine;
```

Registrar en `lib/games/registry.ts`:

```ts
import { createArkanoidEngine } from "./arkanoid/engine";
// ...
export const ENGINE_REGISTRY: Record<string, EngineFactory> = {
  asteroides: createAsteroidesEngine,
  tetris: createTetrisEngine,
  arkanoid: createArkanoidEngine,
};
```

Las estructuras internas (`paddle`, `ball`, `blocks[]`, `explosions[]`, `LEVELS`) no se exportan — detalle de implementación del módulo, igual que en `game.js`/`levels.js` originales. `LEVELS` se porta como constante interna del motor (o archivo hermano `lib/games/arkanoid/levels.ts` si se prefiere separar, a decidir en el paso de implementación).

---

## Plan de implementación

Cada paso deja el proyecto compilando y navegable.

### Paso 1 — Assets

Copiar `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` y `assets/sounds/{ball-bounce.mp3,break-sound.mp3}` a `public/arkanoid/`. Sin código todavía que los use.

### Paso 2 — Catálogo y portada

Agregar la entrada `arkanoid` a `GAMES` en `lib/games.ts` (con `engine: "arkanoid"`) y la clase `.cover-arkanoid` en `app/globals.css`. Sin motor todavía: `/juegos/arkanoid` ya muestra la ficha de detalle con el mock genérico funcionando.

### Paso 3 — Motor portado a TypeScript

Crear `lib/games/arkanoid/engine.ts` portando `game.js`/`levels.js`: constantes (`PADDLE_SPEED`, `BLOCK_COLS/ROWS/W/H`, `BLOCK_COLORS`, velocidades base de pelota), los 5 niveles (`LEVELS`), utilidades (`initPaddle`, `initBall`, `loadLevel`, `collideAABB`), carga de spritesheet/sonidos (`loadSpritesheet`, `new Audio(...)`, con `.cloneNode().play()` para solapar efectos como en el original), loop y `createArkanoidEngine(canvas, callbacks)`. Cambios respecto al original:

- El canvas se recibe por parámetro (no `document.getElementById`).
- Los listeners de teclado (`←`/`→`), `mousemove` y `click` (selector de nivel en pausa) se agregan en `start()`/quitan en `destroy()`, nunca a nivel de módulo.
- Rutas de assets apuntan a `/arkanoid/spritesheet-breakout.png` y `/arkanoid/sounds/*.mp3` (servidos desde `public/`), no a rutas relativas del HTML original.
- Se remueve el toggle de pausa por tecla `P`/`Escape`; el motor expone `pause()`/`resume()` llamados desde el botón React. El overlay de pausa (incluido el selector de nivel) se sigue dibujando internamente mientras el motor está pausado — no se retira esa función, solo su disparador por teclado.
- `update()` invoca `onScore(score)`, `onLives(lives)`, `onLevel(currentLevel)` cuando cambian, y `onGameOver(score)` tanto al entrar a `gameState === 'gameover'` como a `gameState === 'win'`.
- `restart()` re-ejecuta `initPaddle()` + `loadLevel(1)` (reset completo: vidas, puntaje, nivel) y `resume()`.
- `destroy()` cancela el `requestAnimationFrame` pendiente y remueve todos los listeners (`keydown`, `keyup`, `mousemove`, `click`).

Registrar `arkanoid: createArkanoidEngine` en `ENGINE_REGISTRY` (`lib/games/registry.ts`). Módulo sin consumidores en UI todavía — no cambia ninguna pantalla existente.

### Paso 4 — Integración en `GamePlayer`

En `components/game-player.tsx`, la rama ya generalizada (`ENGINE_REGISTRY[game.engine]`) recibe automáticamente `arkanoid` sin condicional nuevo: monta canvas 800×600 con `.asteroides-canvas`, instancia `createArkanoidEngine` en un `useEffect` (con `destroy()` en el cleanup), conecta callbacks a los mismos `useState` de `score`/`lives`/`level`/`over` ya usados por Asteroides. HUD completo (Puntuación/Vidas/Nivel), sin ocultar ninguna columna.

### Paso 5 — Leaderboard real (ficha de detalle + Salón de la Fama)

Sin cambios de código nuevos más allá de que `arkanoid` ya cae en la condición generalizada `game.engine` en `app/juegos/[id]/page.tsx` y `components/hall-of-fame.tsx` (misma lógica ya usada por Asteroides/Tetris). Verificar que el `game_id` que viaja a `fetchTopScores`/`insertScore` es `"arkanoid"`.

### Paso 6 — Verificación manual

`npm run dev`, jugar una partida completa en `/juegos/arkanoid/jugar`: paddle controlable con mouse y con flechas, pelota rebota en paredes/paddle/bloques con sonido, bloques explotan con animación de 4 frames, nivel sube al limpiar el tablero (5 niveles), pausa (botón React) detiene el loop y muestra el overlay con selector de nivel, clic en un botón de nivel salta a ese nivel sin salir de pausa, morir 3 veces o completar el nivel 5 abre el modal "FIN DEL JUEGO" con el puntaje real, guardar puntaje funciona. Confirmar con `mcp__supabase__execute_sql` que la fila aparece con `game_id: "arkanoid"`. Confirmar que Asteroides, Tetris y los 7 mocks restantes siguen sin cambios de comportamiento.

### Paso 7 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

### Catálogo

- [ ] `GAMES` en `lib/games.ts` incluye la entrada `id: "arkanoid"` con los campos definidos en el Alcance, incluyendo `engine: "arkanoid"`.
- [ ] `.cover-arkanoid` existe en `app/globals.css` y se ve en la tarjeta de biblioteca y en la portada de detalle.
- [ ] `/juegos/arkanoid` renderiza la ficha de detalle con título, descripción y leaderboard, igual que cualquier otro juego.
- [ ] `bloque-buster` sigue existiendo como mock independiente, sin cambios.

### Assets

- [ ] `public/arkanoid/spritesheet-breakout.png` y `public/arkanoid/sounds/{ball-bounce.mp3,break-sound.mp3}` existen y se sirven correctamente.
- [ ] El motor carga el spritesheet y dibuja paddle/pelota/bloques con sprites (no rectángulos de color plano).
- [ ] Los sonidos de rebote y rotura se reproducen durante el juego.

### Motor

- [ ] `lib/games/arkanoid/engine.ts` exporta `createArkanoidEngine(canvas, callbacks)` sin exportar las estructuras internas (`paddle`, `ball`, `blocks`, `LEVELS`).
- [ ] El motor no agrega listeners (teclado, mouse, click) a nivel de módulo — solo entre `start()` y `destroy()`.
- [ ] `onScore`/`onLives`/`onLevel` se disparan cuando el valor correspondiente cambia.
- [ ] `onGameOver(finalScore)` se dispara tanto al perder las 3 vidas como al completar el nivel 5.
- [ ] No existe ningún camino de reinicio por tecla — solo `restart()` desde el modal de React.
- [ ] No existe toggle de pausa por tecla `P`/`Escape` — la pausa solo se activa desde `pause()`/`resume()` llamados por React.

### Integración en el reproductor

- [ ] En `/juegos/arkanoid/jugar`, el paddle se mueve con el mouse y con `←`/`→`; el canvas 800×600 se ve dentro de `.crt-screen` usando `.asteroides-canvas`.
- [ ] El HUD (Jugador/Puntuación/Vidas/Nivel) refleja el estado real del motor.
- [ ] El botón PAUSA detiene el juego y muestra el overlay con selector de nivel (5 botones); clic en un botón cambia de nivel sin salir de pausa; REANUDAR continúa el juego.
- [ ] Al perder las 3 vidas o completar el nivel 5, aparece el modal "FIN DEL JUEGO" con el puntaje real; "GUARDAR PUNTUACIÓN" llama a `saveScore` e `insertScore` (`game_id: "arkanoid"`).
- [ ] "JUGAR DE NUEVO" reinicia el motor (puntaje, vidas, nivel al inicio) sin recargar la página; "SALIR" navega a `/juegos/arkanoid` y desmonta el canvas sin listeners colgados.
- [ ] Asteroides, Tetris y los 7 mocks restantes siguen mostrando su HUD (real o simulado) sin cambios de comportamiento.

### Leaderboard (ficha de detalle + Salón de la Fama)

- [ ] `/juegos/arkanoid` con tabla vacía muestra "AÚN NO HAY PUNTAJES"; con datos reales, muestra hasta 10 filas ordenadas por puntaje descendente.
- [ ] Salón de la Fama, pestaña Arkanoid: con 0 filas no se renderiza podio ni tabla (mensaje vacío); con 1-2 filas, tabla sin podio; con 3+, podio y tabla con datos reales.
- [ ] "TU MEJOR MARCA EN ARKANOID" aparece solo si el usuario en sesión tiene al menos una fila propia.
- [ ] Guardar un puntaje en Arkanoid no afecta el leaderboard de Asteroides, Tetris ni de los mocks, y viceversa.

### Compilación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npm run lint` pasa sin advertencias nuevas.
- [ ] `npm run build` termina sin errores.

---

## Decisiones tomadas y descartadas

### Nueva entrada `"arkanoid"` en vez de reemplazar `bloque-buster`

- **Sí:** mismo criterio que "asteroides" vs "rocas" y "tetris" vs "caida" — `bloque-buster` ya existe como entrada mock curada (portada, descripción y mejor puntaje propios); reemplazarla habría descartado contenido sin motivo. Decisión explícita del usuario.
- **No:** reutilizar `bloque-buster` — habría acoplado el juego real a datos pensados para el mock y afectado el seed de `seededScores` (depende de `id.length`).

### Assets (spritesheet + sonido) portados completos, no simplificados a canvas puro

- **Sí:** decisión explícita del usuario — a diferencia de Asteroides/Tetris (canvas puro sin assets), Arkanoid trae un spritesheet y efectos de sonido reales en el original; omitirlos sería descartar funcionalidad y fidelidad visual/sonora ya implementada.
- **No:** dibujar con rectángulos de color plano — habría sido más simple pero una regresión visual/sonora frente al original, sin que el usuario lo pidiera.

### Controles mouse + teclado, ambos coexistiendo

- **Sí:** decisión explícita del usuario — fiel al original, que soporta ambos desde el día uno.
- **No:** limitar a solo teclado (como Asteroides/Tetris) — hubiera sido una reducción de funcionalidad no pedida.

### Selector de nivel en el overlay de pausa, conservado como feature del motor

- **Sí:** decisión explícita del usuario — es una función real del original (saltar a cualquiera de los 5 niveles durante la pausa); se mantiene dibujada y manejada por el propio motor (clic sobre canvas), sin construir un overlay nuevo en React.
- **No:** descartar el selector de nivel para igualar el patrón "sin overlay propio" de Asteroides/Tetris — el usuario prefirió conservar la feature fiel al original en vez de uniformar el patrón.

### Pausa disparada solo por el botón React, sin atajo de teclado `P`/`Escape`

- **Sí:** decisión explícita del usuario — mismo patrón que Asteroides/Tetris, un solo camino de pausa evita estados inconsistentes entre el toggle interno del motor y el botón de React.
- **No:** conservar `P`/`Escape` además del botón — dos caminos de pausa coexistiendo, descartado por el usuario a favor de uniformar con los otros dos juegos.

### Estado `win` mapeado al mismo `onGameOver` que `gameover`, sin modal de victoria separado

- **Sí:** decisión explícita del usuario — `GamePlayer` solo tiene un modal de "FIN DEL JUEGO"; agregar un estado de victoria distinto sería una ampliación de UI no pedida, fuera del patrón ya establecido.
- **No:** agregar un modal de "¡Completaste el juego!" separado — trabajo adicional no solicitado que requeriría extender `GamePlayer` con un estado nuevo.

### Canvas 800×600 reutilizando `.asteroides-canvas`, sin clase CSS propia

- **Sí:** decisión explícita del usuario — mismas dimensiones exactas que Asteroides; crear `.arkanoid-canvas` idéntica sería una clase CSS duplicada sin diferencia visual.
- **No:** crear `.arkanoid-canvas` como clase hermana (patrón usado por `.tetris-canvas`, que sí tiene dimensiones distintas) — no aplica aquí porque las dimensiones son idénticas, a diferencia de Tetris.

### Assets en `public/arkanoid/...`, carga client-side sin pipeline de build

- **Sí:** decisión explícita del usuario — mismo patrón que cualquier asset estático de Next.js servido desde `/public`; el original ya carga assets así (rutas relativas), solo cambia la ruta base.
- **No:** importar los assets como módulos estáticos de Next (`import img from "..."`) — indirección no pedida para un caso donde `/public` ya resuelve el requisito sin fricción.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                                  | Mitigación                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Autoplay de audio bloqueado por el navegador.** Los sonidos de rebote/rotura usan `new Audio(...).cloneNode().play()`; algunos navegadores bloquean audio sin interacción previa del usuario.                                                                         | Aceptado como riesgo conocido — el primer input de teclado/mouse del jugador ya cuenta como interacción, mismo comportamiento que tendría el HTML original abierto directo en el navegador.                            |
| **Múltiples `Audio.cloneNode().play()` simultáneos.** Rebotes rápidos consecutivos podrían acumular instancias de audio sin liberarse, con impacto de memoria menor en partidas muy largas.                                                                             | Aceptado — mismo comportamiento que el original (`game.js` ya usa este patrón sin limpieza explícita); no es una regresión introducida por el port.                                                                    |
| **Doble montaje en desarrollo (React `StrictMode`).** El `useEffect` que crea el motor corre dos veces en dev, pudiendo dejar dos loops de `requestAnimationFrame`/listeners activos si `destroy()` no limpia todo.                                                     | `destroy()` cancela el `requestAnimationFrame` pendiente y remueve explícitamente todos los listeners (`keydown`, `keyup`, `mousemove`, `click`) agregados en `start()`, mismo patrón ya probado en Asteroides/Tetris. |
| **Selector de nivel por clic conservado como excepción al patrón de los otros 2 motores.** Es el único motor con un listener de `click` propio sobre el canvas fuera de pausa/reanudar estándar; futuros juegos podrían copiar esta excepción sin justificación propia. | Documentado explícitamente en Decisiones — es una feature fiel al original, decisión puntual de este juego, no un nuevo patrón de plataforma.                                                                          |
| **Canvas fijo 800×600 en pantallas pequeñas/táctiles.** Sin escalado responsivo, puede desbordar o verse diminuto en móvil.                                                                                                                                             | Aceptado como fuera de alcance (decisión explícita, heredada de Asteroides); se resuelve en una spec futura si se prioriza soporte móvil.                                                                              |
| **`game.best`/`game.plays` no sincronizados con datos reales (deuda conocida, ver `mapa-integracion.md`).** Ya afecta a Asteroides/Tetris desde specs 05/06/07; se hereda para Arkanoid.                                                                                | Riesgo aceptado, sin plan de mitigación en esta spec.                                                                                                                                                                  |
| **`insertScore` falla en silencio (deuda conocida).** Sin feedback en UI si el insert a Supabase falla.                                                                                                                                                                 | Riesgo aceptado, mismo comportamiento heredado de specs anteriores.                                                                                                                                                    |
| **Ningún handler hace `preventDefault()` (deuda conocida).** Flechas también hacen scroll de la página mientras se juega.                                                                                                                                               | Riesgo aceptado, mismo comportamiento heredado de Asteroides; se documenta, no se corrige de oficio en esta spec.                                                                                                      |

---

## Qué **no** está en esta spec

- Controles táctiles.
- Autenticación real / rate limiting / CAPTCHA.
- Supabase Realtime.
- Borrado o edición de puntajes guardados.
- Migración de `bloque-buster` a motor real.
- Leaderboard real para los mocks restantes (`serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`, `bloque-buster`).
- Modal de victoria separado del modal de "FIN DEL JUEGO".
- Generalización de `.asteroides-canvas` a una clase parametrizable (se reutiliza tal cual, sin renombrarla).

Cada uno de estos, si se necesita, va en su propia spec.
