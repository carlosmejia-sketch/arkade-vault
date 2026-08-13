# SPEC GAME JAM — PONG (motor real + leaderboard Supabase)

> **Estado:** Borrador
> **Tema del jam:** (juego provisto directamente, sin jam asociado)
> **Depende de:** SPEC 05 (motor real de Asteroides), SPEC 06 (leaderboard Supabase), SPEC 07 (refactor de generalización — registry `ENGINE_REGISTRY`, ya existente)
> **Fecha:** 2026-08-12
> **Objetivo:** Crear Pong como quinto juego del catálogo — un jugador contra IA, paletas verticales y pelota rebotando en un canvas 800×600, motor real en TypeScript, sin sprites ni audio, con leaderboard real en Supabase, sin tocar el comportamiento de Asteroides, Tetris, Arkanoid ni Snake.

---

## Alcance

**Dentro:**

0. **Alta de la categoría `VERSUS` en `CATS`** (`lib/games.ts`): hoy `GameCategory` ya incluye `"VERSUS"` en el tipo pero `CATS` (usado por el filtro de `components/library.tsx`) no lo lista. Se agrega `"VERSUS"` al array `CATS`, sin quitar ni reordenar los valores existentes (`TODOS`, `ARCADE`, `PUZZLE`, `SHOOTER`). No requiere el refactor de generalización de motor (`EngineCallbacks`/`ENGINE_REGISTRY`/flag en `Game`) porque ese refactor ya existe desde la spec 07 — se verifica antes de tocar nada y no se repite.
1. **Nueva entrada en el catálogo** (`lib/games.ts`): `id: "pong"`, `title: "PONG"`, `short: "Devuelve cada rally antes de que la IA te saque de la mesa."`, `long: "Controla una paleta vertical contra una IA que sigue la pelota con reacción imperfecta. Cada rebote de tu paleta suma puntos y acelera la pelota; si se te escapa por tu lado pierdes una vida, si se le escapa a la IA ganas un bono grande y sube el nivel. Tres vidas, dificultad creciente, sin tregua."`, `cat: "VERSUS"`, `cover: "cover-pong"`, `color: "magenta"`, `engine: "pong"`, `best: 1200`, `plays: "0.1K"`.
2. **Clase CSS `.cover-pong`** en `app/globals.css`, patrón `::after`/`::before` como `.cover-asteroides`/`.cover-arkanoid` (L702-771): fondo oscuro con franja central punteada (red de Pong) vía `linear-gradient` repetido en `::after`, y un glifo `●` (pelota) o `▮▮` (paletas) en `::before`.
3. **Sin assets** — canvas puro, todo dibujado con `fillRect`/`arc`, consistente con los 4 motores existentes. No se crea ninguna carpeta en `public/`.
4. **Motor creado en TypeScript** en `lib/games/pong/engine.ts`:
   - Estado interno: posición y velocidad de la pelota (`ballX/Y`, `vx/vy`), posición de la paleta del jugador (`playerY`) y de la paleta IA (`aiY`), ancho/alto fijos de paletas, `speedMultiplier` que crece con el nivel, `lives`, `score`, `level`, flags de pausa/game-over.
   - Física: rebote elástico contra bordes superior/inferior del canvas y contra ambas paletas (AABB pelota-paleta), ángulo de rebote variable según el punto de contacto en la paleta (como Arkanoid).
   - IA de la paleta rival: sigue `ballY` con una velocidad máxima limitada y un error/retardo aleatorio pequeño (no persigue con precisión perfecta), de forma que sea vencible; su velocidad máxima crece levemente con `level`.
   - Expone `createPongEngine(canvas, callbacks)` con `{ start, pause, resume, restart, destroy }`.
   - Mapeo EXPLÍCITO de callbacks (documentado también en "Modelo de datos"):
     - `onScore(score)`: se llama cuando `score` cambia. Sube +10 por cada rebote válido de la paleta del jugador (con multiplicador de combo, ver Concepto), y +50 cuando la pelota se le escapa a la IA (el jugador "anota").
     - `onLives(lives)`: arranca en 3. Baja en 1 cada vez que la pelota pasa de largo por el lado del jugador (falla en devolver). Al llegar a 0, dispara game over.
     - `onLevel(level)`: sube cada vez que el jugador acumula un umbral de puntos (p. ej. cada 200 puntos) o cada vez que anota contra la IA; aumenta `speedMultiplier` de la pelota y el límite de velocidad de la IA.
     - `onGameOver(finalScore)`: se dispara una sola vez cuando `lives` llega a 0, con el último `score` acumulado.
5. **Registro en `ENGINE_REGISTRY`** (`lib/games/registry.ts`): agregar `pong: createPongEngine` importando desde `./pong/engine`, junto a las 4 entradas existentes, sin reordenarlas.
6. **`components/game-player.tsx`**: Pong cae en la rama ya generalizada sin condicional nuevo — canvas 800×600 con clase `.asteroides-canvas` (mismo tamaño que Asteroides/Arkanoid), HUD con "Vidas" visible (no aplica la excepción de Tetris) y overlay de pausa genérico de React (no aplica la excepción de Arkanoid, que dibuja su propio overlay). No se toca este archivo.
7. **Pausa real** vía el botón React existente (`togglePause` ya llama `engine.pause()`/`engine.resume()`), **fin de partida sin doble camino** (el único reinicio es `restart()` desde el modal, igual que los 4 juegos existentes).
8. **Guardado de puntaje real**: `saveScore` (localStorage) + `insertScore` (Supabase, `game_id: "pong"`), sin migración nueva — la tabla `scores` ya admite cualquier `game_id` de tipo `text`.
9. **Leaderboard real** en ficha de detalle (`app/juegos/pong` vía `app/juegos/[id]/page.tsx`) y Salón de la Fama (`components/hall-of-fame.tsx`, que ya deriva sus pestañas de `GAMES` — no requiere cambio propio más allá de que la nueva entrada exista en el catálogo), mismo tratamiento de estado vacío/parcial que los juegos existentes (podio oculto con menos de 3 filas, mensaje "AÚN NO HAY PUNTAJES" con 0 filas).
10. **"TU MEJOR MARCA" real** en el Salón de la Fama para `pong`, buscando por `player_name === user.name`, reutilizando el bloque ya existente sin duplicar lógica.

**Fuera de alcance (para specs futuras):**

- Controles táctiles.
- Autenticación real / rate limiting / CAPTCHA.
- Supabase Realtime.
- Sonido/efectos de audio (sin assets de audio declarados; el "feel" de Pong con sonido de rebote queda para una spec futura si se decide).
- Borrado o edición de puntajes guardados.
- Multijugador real (dos jugadores humanos, uno por teclado) — Pong queda como un jugador contra IA únicamente, tal como se especifica en este documento.
- Marcador "clásico a 11" con fin de partida por diferencia de puntos — se reemplaza por el sistema de vidas + rally descrito arriba (ver "Decisiones tomadas y descartadas").
- Dificultad de IA seleccionable por el usuario (fácil/normal/difícil) — la curva de dificultad es fija y solo escala con `level`.

---

## Modelo de datos

Sin nuevas estructuras de persistencia — reutiliza `Game` (`lib/games.ts`), `scores` (Supabase, `game_id` libre) y `fetchTopScores`/`insertScore` de `lib/scores.ts` tal cual.

Tipos y datos nuevos acotados al motor, en `lib/games/pong/engine.ts`:

```ts
import type { Engine, EngineCallbacks } from "@/lib/games/types";

type Paddle = {
  y: number; // esquina superior de la paleta
  vy: number;
};

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type PongState = {
  ball: Ball;
  player: Paddle;
  ai: Paddle;
  score: number;
  lives: number;
  level: number;
  speedMultiplier: number;
  paused: boolean;
  gameOver: boolean;
};

export function createPongEngine(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
): Engine;
```

Registro esperado en `lib/games/registry.ts`:

```ts
import { createPongEngine } from "./pong/engine";

export const ENGINE_REGISTRY: Record<string, EngineFactory> = {
  asteroides: createAsteroidesEngine,
  tetris: createTetrisEngine,
  arkanoid: createArkanoidEngine,
  snake: createSnakeEngine,
  pong: createPongEngine,
};
```

---

## Plan de implementación

1. **Catálogo y `CATS`**: agregar `"VERSUS"` a `CATS` y la entrada `pong` a `GAMES` en `lib/games.ts`. Proyecto sigue compilando; Pong aparece en `/biblioteca` (sin cover art todavía, cae al fondo por defecto) y en `/salon` (tab nueva, tabla vacía).
2. **Portada**: agregar `.cover-pong` (y `::after`/`::before`) en `app/globals.css`. Verificar visualmente en `/biblioteca` y en la ficha de detalle.
3. **Motor a TypeScript**: crear `lib/games/pong/engine.ts` con física de rebote, IA de la paleta rival y mapeo de callbacks descrito en el Alcance. Sin assets.
4. **Registro del motor**: agregar `pong: createPongEngine` a `ENGINE_REGISTRY` (`lib/games/registry.ts`).
5. **Leaderboard real**: sin cambios de código adicionales — `app/juegos/[id]/page.tsx` y `hall-of-fame.tsx` ya son genéricos por `id`/`game.id` desde el refactor de la spec 07; solo se verifica que Pong los recorra correctamente al existir en `GAMES`.
6. **Verificación manual**: `npm run dev`, entrar a `/juegos/pong`, jugar una partida completa (perder las 3 vidas), guardar puntaje, confirmar con `mcp__supabase__execute_sql` que la fila aparece con `game_id = 'pong'`, confirmar que Asteroides/Tetris/Arkanoid/Snake no cambian de comportamiento ni de HUD.
7. **Compilación**: `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

### Catálogo

- [ ] `CATS` incluye `"VERSUS"` sin eliminar ni reordenar los valores existentes.
- [ ] `GAMES` incluye la entrada `pong` con todos los campos de `Game` completos y literales (sin "a definir").
- [ ] `/biblioteca` filtra correctamente por la pestaña `VERSUS` y muestra solo Pong en ese filtro.
- [ ] Ningún juego existente cambia de posición, `id`, `cover`, `color` o `engine` en `GAMES`.

### Assets

- [ ] No se crea ninguna carpeta ni archivo bajo `public/pong/`.

### Motor

- [ ] `createPongEngine(canvas, callbacks)` expone `{ start, pause, resume, restart, destroy }`.
- [ ] La pelota rebota elásticamente en bordes superior/inferior y en ambas paletas, con ángulo de salida dependiente del punto de contacto.
- [ ] La IA de la paleta rival seguiría la pelota, es vencible (tiene error/retardo/límite de velocidad) y no responde instantáneamente.
- [ ] `onScore` sube +10 por rebote válido del jugador y +50 cuando la IA falla en devolver.
- [ ] `onLives` arranca en 3 y baja en 1 cada vez que el jugador falla en devolver; llega a 0 dispara `onGameOver` exactamente una vez.
- [ ] `onLevel` sube según el umbral de puntos definido y acelera pelota + IA de forma perceptible.
- [ ] `pause()`/`resume()` congelan y reanudan el movimiento sin saltos de física (sin acumular `dt` fantasma).
- [ ] `restart()` reinicia pelota, paletas, score, vidas y nivel al estado inicial.
- [ ] `destroy()` remueve todos los listeners de teclado y cancela el `requestAnimationFrame` pendiente.
- [ ] Los listeners de teclado se agregan en `start()` y se remueven en `destroy()`, nunca a nivel de módulo.

### Integración en el reproductor

- [ ] Pong se juega desde `/juegos/pong/jugar` usando `components/game-player.tsx` sin ningún condicional nuevo (cae en la rama genérica: canvas 800×600, `.asteroides-canvas`, HUD con Vidas visible, overlay de pausa genérico).
- [ ] El botón PAUSA/REANUDAR funciona correctamente sobre el motor de Pong.
- [ ] El botón FIN abre el modal de fin de partida sin necesidad de perder las 3 vidas.
- [ ] El modal de fin de partida guarda el puntaje en `localStorage` (`saveScore`) y en Supabase (`insertScore` con `gameId: "pong"`).

### Leaderboard (ficha de detalle + Salón de la Fama)

- [ ] `app/juegos/pong` (vía `app/juegos/[id]/page.tsx`) muestra el top 10 real de Supabase para `game_id = 'pong'`.
- [ ] Con 0 filas muestra el mensaje "AÚN NO HAY PUNTAJES"; con menos de 3 filas oculta el podio.
- [ ] El Salón de la Fama (`components/hall-of-fame.tsx`) incluye la pestaña PONG (derivada automáticamente de `GAMES`) y muestra su tabla/podio real.
- [ ] "TU MEJOR MARCA" en el Salón de la Fama funciona para Pong buscando por `player_name === user.name`.

### Compilación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npm run lint` pasa sin advertencias nuevas.
- [ ] `npm run build` termina sin errores.

---

## Decisiones tomadas y descartadas

### Sistema de puntaje: rally + vidas en vez de "primero a 11"

- **Sí:** se mapea el puntaje a rebotes exitosos del jugador (+10, con posible combo) más un bono grande cuando la pelota se le escapa a la IA (+50), y se usa un sistema de 3 vidas para el fin de partida — igual patrón que Arkanoid (puntos por bloque + vidas), que ya está resuelto y probado en el repo. Esto produce un entero creciente y compatible con el `CHECK (score > 0 AND score < 10000000)` sin artificios.
- **No:** se descarta el marcador clásico "primero a 11 puntos" porque no crece de forma monótona útil para un leaderboard de puntaje más alto — una partida a 11 siempre termina en un número bajo y casi idéntico entre partidas, sin diferenciar buenos de malos jugadores más allá de quién ganó.

### Vidas en vez de "diferencia de 5 puntos"

- **Sí:** se usa el mismo campo `onLives` que ya consume `components/game-player.tsx` (Asteroides/Arkanoid ya lo usan), evitando cualquier condicional nuevo en el reproductor.
- **No:** se descarta terminar la partida por "diferencia de puntaje" (p. ej. perder cuando la IA saca 5 puntos de ventaja) porque no existe un campo de "diferencia" en `EngineCallbacks` y requeriría lógica adicional fuera del contrato ya probado.

### Categoría `VERSUS` nueva en `CATS`

- **Sí:** Pong es la única propuesta pendiente que llena un hueco de categoría real (`VERSUS` existe en el tipo `GameCategory` pero nunca se usó en `CATS`), dando variedad de género frente a los 2 ARCADE + 1 PUZZLE + 1 SHOOTER actuales.
- **No:** se descarta dejar a Pong como `ARCADE` para evitar tocar `CATS` — eso ocultaría la categoría real del juego y desaprovecharía el hueco que ya existe en el tipo.

### Sin sprites ni audio

- **Sí:** todo el arte se dibuja con `fillRect`/`arc` (paletas, pelota, línea central punteada), igual que los 4 motores existentes; consistente con "canvas puro" y sin abrir scope de `public/pong/`.
- **No:** se descarta agregar sonido de rebote (aunque es parte del "feel" clásico de Pong) porque ningún motor actual usa `Audio`/Web Audio API y abrir ese scope excede esta spec — queda anotado en "Fuera de alcance".

### IA con error/retardo, no seguimiento perfecto

- **Sí:** la paleta IA sigue `ballY` con velocidad máxima limitada y un pequeño margen de error aleatorio, de forma que el jugador pueda anotarle puntos (necesario para que `onScore` con el bono de +50 sea alcanzable) y la dificultad escale con `level` sin volverse imbatible de entrada.
- **No:** se descarta una IA que siga la pelota con precisión perfecta (posición Y idéntica cada frame) porque haría el juego imposible de vencer y el bono de +50 nunca se dispararía en partidas normales.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                  | Mitigación                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calibrar la IA (velocidad máxima, margen de error) para que sea "vencible pero desafiante" es un ajuste fino sin referencia directa en el repo (los 4 motores existentes no tienen IA). | Empezar con valores conservadores (IA more lenta que el jugador, error visible) y ajustar en la verificación manual del Paso 6 jugando varias partidas completas antes de dar por cerrado el spec.                        |
| El sistema de puntaje por rally + vidas es una decisión de diseño nueva (no hay pariente directo 1:1 en el repo, aunque se apoya en el patrón de Arkanoid).                             | Documentado explícitamente en "Decisiones tomadas y descartadas"; los criterios de aceptación fijan los valores exactos (+10 por rebote, +50 por anotar, 3 vidas) para que la implementación no quede ambigua.            |
| Agregar `"VERSUS"` a `CATS` es el único cambio de este spec que toca una constante compartida por todo el catálogo, no solo la entrada de Pong.                                         | Criterio de aceptación explícito de que ningún juego existente cambia de posición/campos en `GAMES`; verificación manual incluye revisar `/biblioteca` con los filtros existentes (TODOS/ARCADE/PUZZLE/SHOOTER) intactos. |
| `game.best`/`game.plays` en `lib/games.ts` no se sincronizan con los datos reales de Supabase (deuda conocida heredada).                                                                | Aceptado como riesgo conocido, no se corrige en este spec — mismo tratamiento que los 4 juegos existentes.                                                                                                                |
| `insertScore` falla en silencio (`.catch(err => console.error(...))`), sin feedback en UI (deuda conocida heredada).                                                                    | Aceptado como riesgo conocido, no se corrige en este spec.                                                                                                                                                                |
| Ningún handler de teclado hace `preventDefault()` (deuda conocida heredada) — en Pong las flechas/`W`/`S` también podrían hacer scroll de la página.                                    | Aceptado como riesgo conocido, mismo tratamiento que los 4 juegos existentes; no se corrige en este spec.                                                                                                                 |
| Doble montaje en desarrollo (`React StrictMode`) puede montar y destruir el motor dos veces seguidas.                                                                                   | Mitigado por `destroy()` limpiando el `requestAnimationFrame` pendiente y todos los listeners de teclado, igual que los 4 motores existentes.                                                                             |

---

## Qué **no** está en esta spec

- Controles táctiles.
- Autenticación real / rate limiting / CAPTCHA.
- Supabase Realtime.
- Sonido/efectos de audio.
- Borrado o edición de puntajes guardados.
- Multijugador real (dos jugadores humanos por teclado).
- Marcador clásico "primero a 11" como condición de fin de partida.
- Dificultad de IA seleccionable por el usuario.
