# SPEC 05 — Juego Asteroides (rocas real)

> **Estado:** Aprobado.
> **Depende de:** ninguna spec previa (usa convenciones ya existentes de `lib/games.ts`, `lib/scores.ts`, `lib/session.tsx`, `components/game-player.tsx`).
> **Fecha:** 2026-08-03
> **Objetivo:** Portar el motor de juego de `references/started-games/02-asteroids/game.js` a TypeScript como una nueva entrada `"asteroides"` en el catálogo, reemplazando la simulación de puntaje mock por un canvas jugable real (teclado), sincronizado con el HUD/pausa/game-over/guardado de puntaje ya existentes en `GamePlayer`, sin tocar el comportamiento de los demás 8 juegos.

---

## Alcance

**Dentro:**

1. **Nueva entrada en el catálogo** (`lib/games.ts`): `id: "asteroides"`, `title: "ASTEROIDES"`, `short: "Pulveriza rocas y sobrevive en el vacío."`, `long: "Pilota una nave triangular a la deriva en el vacío. Dispara y rota para partir asteroides en fragmentos cada vez más pequeños. Recoge el power-up 3x para triplicar tu disparo por unos segundos."`, `cat: "SHOOTER"`, `cover: "cover-asteroides"`, `color: "cyan"`, `best`/`plays` con valores placeholder coherentes con los demás (se definen en el paso de implementación, sin bloquear la spec).
2. **Clase CSS `.cover-asteroides`** en `app/globals.css`, variante visual nueva (tema espacial) siguiendo el patrón de las `.cover-*` existentes (`::after`/`::before` con gradientes).
3. **Motor portado a TypeScript** en `lib/games/asteroides/engine.ts`: clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, funciones de `update`/`draw`, el power-up 3x incluido tal cual. El motor expone una API de control (crear/destruir instancia sobre un `<canvas>`, pausar/reanudar, reiniciar) y callbacks (`onScore`, `onLives`, `onLevel`, `onGameOver`) para que React refleje el estado sin duplicar lógica de juego.
4. **`components/game-player.tsx` condicional por `game.id === "asteroides"`:** cuando el juego es `asteroides`, monta el canvas real y sincroniza HUD (puntaje, vidas, nivel) vía los callbacks del motor en lugar del `setInterval` simulado. Para cualquier otro `game.id`, el comportamiento mock actual (`setInterval`, nivel derivado de `score`) se mantiene exactamente igual.
5. **Pausa real:** el botón PAUSA detiene el `requestAnimationFrame` del motor (deja de avanzar `dt`) cuando `game.id === "asteroides"`.
6. **Fin de partida sin doble camino:** dentro del motor, la tecla `Espacio` deja de reiniciar la partida internamente (se remueve ese `pressed('Space')` de reinicio en el estado `gameover`); el único reinicio posible es el botón "JUGAR DE NUEVO" del modal React, que llama al método `restart()` del motor.
7. **Canvas fijo 800×600** dentro de `.crt-screen`, con el mismo comportamiento de recorte/escala CSS que ya tiene el mock (sin agregar responsividad nueva).
8. **Guardado de puntaje real:** al llegar a `gameover`, el modal usa el `score` real emitido por el motor (no el simulado) para `saveScore`.

**Fuera de alcance (para specs futuras):**

- Controles táctiles para `asteroides` (el original solo soporta teclado).
- Abstracción genérica reutilizable para portar futuros juegos (se decide con el segundo juego real).
- Modificar/retirar la simulación mock de los otros 8 juegos.
- Persistencia real de leaderboard en Supabase para `asteroides` (sigue usando `lib/scores.ts`/`lib/session.tsx` tal como está).
- Ajustar el tag genérico `"TECLADO / TÁCTIL"` de la pantalla de detalle (es texto compartido de la plantilla, no exclusivo de este juego).
- Sonido/efectos de audio (el original no tiene).

---

## Modelo de datos

No se introducen nuevas estructuras de persistencia (sigue usando `Game` de `lib/games.ts` sin campos nuevos, y `Score`/`saveScore` de `lib/scores.ts`/`lib/session.tsx` tal cual existen).

Se agregan tipos nuevos, acotados al motor, en `lib/games/asteroides/engine.ts`:

```ts
export type EngineCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type AsteroidesEngine = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  destroy: () => void; // cancela el rAF y remueve listeners de teclado al desmontar
};

export function createAsteroidesEngine(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
): AsteroidesEngine;
```

Las clases internas (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`) no se exportan — son detalle de implementación del módulo, igual que en el `game.js` original.

---

## Plan de implementación

Cada paso deja el proyecto compilando y navegable.

### Paso 1 — Catálogo y portada

Agregar la entrada `asteroides` a `GAMES` en `lib/games.ts` y la clase `.cover-asteroides` en `app/globals.css`. Sin motor todavía: `/juegos/asteroides` ya muestra la ficha de detalle con el mock genérico funcionando (igual que cualquier otro juego hoy).

### Paso 2 — Motor portado a TypeScript

Crear `lib/games/asteroides/engine.ts` portando `game.js`: clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, constantes (`RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`), utilidades (`wrap`, `dist`, `rand`, `randInt`), input (`keys`/`justPressed`/`pressed`), loop y `createAsteroidesEngine(canvas, callbacks)` según el tipo definido en el paso anterior. Cambios respecto al original:

- El canvas se recibe por parámetro (no `document.getElementById`).
- Los listeners de teclado se agregan en `start()`/quitan en `destroy()`, no a nivel de módulo.
- `update()` invoca `onScore(score)`, `onLives(lives)`, `onLevel(level)` cuando cambian, y `onGameOver(score)` al entrar a `state === 'gameover'`.
- Se remueve el `pressed('Space')` de reinicio dentro del estado `gameover` (paso 6 del alcance).
- `pause()`/`resume()` congelan/reanudan el loop (dt no avanza mientras está en pausa).
- `restart()` re-ejecuta `initGame()` y `resume()`.

Módulo sin consumidores todavía — no cambia ninguna pantalla existente.

### Paso 3 — Integración condicional en `GamePlayer`

En `components/game-player.tsx`, agregar rama `game.id === "asteroides"`: monta un `<canvas>` real dentro de `.crt-screen` en lugar del `.game-arena` decorativo, instancia `createAsteroidesEngine` en un `useEffect` (con `destroy()` en el cleanup), conecta los callbacks a los mismos `useState` de `score`/`lives`/`level`/`over` que ya existen, y conecta los botones PAUSA/FIN/JUGAR DE NUEVO a `pause()`/`resume()`/`onGameOver` manual/`restart()` del motor. Para cualquier otro `game.id`, el bloque `if` cae al camino mock actual sin cambios.

### Paso 4 — Verificación manual

`npm run dev`, abrir `/juegos/asteroides`, entrar a `/juegos/asteroides/jugar`: nave controlable con flechas/espacio, vidas/puntaje/nivel reales en el HUD, pausa detiene el juego, morir 3 veces abre el modal con puntaje real, guardar puntaje funciona, "JUGAR DE NUEVO" reinicia el motor. Confirmar que otro juego (ej. `/juegos/caida/jugar`) sigue mostrando el mock simulado sin cambios.

### Paso 5 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

### Catálogo

- [ ] `GAMES` en `lib/games.ts` incluye la entrada `id: "asteroides"` con los campos definidos en el Alcance.
- [ ] `.cover-asteroides` existe en `app/globals.css` y se ve en la tarjeta de biblioteca y en la portada de detalle.
- [ ] `/juegos/asteroides` renderiza la ficha de detalle con título, descripción y leaderboard mock, igual que cualquier otro juego.

### Motor

- [ ] `lib/games/asteroides/engine.ts` exporta `createAsteroidesEngine(canvas, callbacks)` sin exportar las clases internas.
- [ ] El motor no agrega listeners de teclado a nivel de módulo — solo entre `start()` y `destroy()`.
- [ ] `onScore`, `onLives`, `onLevel` se disparan cuando el valor correspondiente cambia.
- [ ] `onGameOver(finalScore)` se dispara al entrar a `state === 'gameover'`.
- [ ] Presionar `Espacio` en estado `gameover` **no** reinicia la partida (el reinicio interno por teclado fue removido).

### Integración en el reproductor

- [ ] En `/juegos/asteroides/jugar`, la nave se controla con `←` `→` `↑` y se dispara con `Espacio`; el canvas 800×600 se ve dentro de `.crt-screen`.
- [ ] El HUD (Jugador/Puntuación/Vidas/Nivel) refleja el estado real del motor, no una simulación.
- [ ] El botón PAUSA detiene el juego (la nave/asteroides dejan de moverse); REANUDAR lo continúa.
- [ ] Al perder las 3 vidas, aparece el modal "FIN DEL JUEGO" con el puntaje real; "GUARDAR PUNTUACIÓN" llama a `saveScore` con ese puntaje.
- [ ] "JUGAR DE NUEVO" reinicia el motor (puntaje, vidas y nivel vuelven a su estado inicial) sin recargar la página.
- [ ] "SALIR" navega a `/juegos/asteroides` y desmonta el canvas (el motor llama `destroy()`, no quedan listeners de teclado colgados).
- [ ] Cualquier otro juego (ej. `/juegos/caida/jugar`, `/juegos/rocas/jugar`) sigue mostrando el HUD simulado con `setInterval`, sin cambios de comportamiento.

### Compilación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npm run lint` pasa sin advertencias nuevas.
- [ ] `npm run build` termina sin errores.

---

## Decisiones tomadas y descartadas

### Nueva entrada `"asteroides"` en vez de reemplazar `rocas`

- **Sí:** `rocas` ya existe como entrada mock independiente en el catálogo (portada, descripción y mejor puntaje propios); reemplazarla habría descartado contenido ya curado sin motivo. Decisión explícita del usuario.
- **No:** reutilizar `rocas` — habría acoplado el juego real a datos pensados para el mock.

### Motor portado a `lib/games/asteroides/engine.ts`, separado del componente

- **Sí:** mantiene `game-player.tsx` legible y aísla la lógica de canvas/física de la UI React. Confirmado por el usuario tras comparar con portarlo inline.
- **No:** meter las clases directo en el `.tsx` — hubiera mezclado dos responsabilidades muy distintas en un solo archivo grande.

### Reemplazo condicional (`game.id === "asteroides"`) en vez de reemplazo total del mock

- **Sí:** pedido explícito del usuario — los otros 8 juegos no tienen motor real todavía y no se quiere dejarlos sin ningún loop de HUD mientras no se porten.
- **No:** quitar la simulación mock global — habría roto el HUD de 8 juegos para arreglar 1.

### Sin abstracción genérica para futuros juegos todavía

- **Sí:** este es el primer juego portado; generalizar la integración (tipo de callbacks, montaje de canvas, ciclo de vida) sin un segundo caso real es especular sobre una forma que todavía no se conoce. Se decide con el segundo juego.
- **No:** crear ya un `GameEngine` genérico / HOC — riesgo de abstracción incorrecta que haya que deshacer.

### Reinicio solo vía modal, no por `Espacio` interno

- **Sí:** pedido explícito del usuario — evita dos caminos de reinicio con estados potencialmente inconsistentes (el modal ya maneja guardado de puntaje, que el reinicio por teclado se saltaría).
- **No:** dejar ambos caminos coexistiendo — el reinicio por teclado podría reiniciar el motor sin pasar por el flujo de guardado, produciendo una partida "fantasma" sin puntaje registrado.

### Power-up 3x portado tal cual, pese a no estar documentado en el README original

- **Sí:** decisión explícita del usuario — es comportamiento real ya implementado en `game.js`, omitirlo sería descartar funcionalidad existente por un README desactualizado.
- **No:** omitirlo por no estar documentado — hubiera sido más trabajo (quitar código funcional) sin beneficio.

### Canvas fijo 800×600, sin responsividad nueva

- **Sí:** pedido explícito del usuario — igual tratamiento que el mock actual, sin ampliar el alcance a diseño responsivo del canvas.
- **No:** escalar el canvas al contenedor — trabajo no solicitado que además puede introducir bugs de coordenadas de mouse/touch fuera de alcance.

### Táctil fuera de alcance

- **Sí:** el original (`game.js`) solo soporta teclado; agregar táctil ahora sería una feature nueva no pedida, no una migración fiel.
- **No:** agregarlo ya — se deja para una spec futura si se decide soportar dispositivos táctiles.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                            | Mitigación                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Doble montaje en desarrollo (React `StrictMode`).** El `useEffect` que crea el motor se ejecuta dos veces en dev, pudiendo dejar dos loops de `requestAnimationFrame` o dos sets de listeners de teclado activos si `destroy()` no limpia todo. | `destroy()` debe cancelar el `requestAnimationFrame` pendiente y remover explícitamente los listeners `keydown`/`keyup` agregados en `start()`. |
| **Canvas fijo 800×600 en pantallas pequeñas/táctiles.** Sin escalado responsivo, el canvas puede desbordar o verse diminuto en móvil.                                                                                                             | Aceptado como fuera de alcance (decisión explícita); se resuelve en una spec futura si se prioriza soporte móvil.                               |
| **Estado colgante al salir con "SALIR" a mitad de partida.** Si el componente se desmonta mientras el motor sigue corriendo, podría intentar invocar callbacks sobre un componente ya desmontado.                                                 | `destroy()` se llama en el cleanup del `useEffect`, garantizando que el motor deje de invocar callbacks antes de que React desmonte.            |
