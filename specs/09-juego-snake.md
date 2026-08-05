# SPEC 09 — Juego Snake (motor real + leaderboard Supabase)

> **Estado:** Implementado
> **Depende de:** SPEC 05 (motor real de Asteroides), SPEC 06 (leaderboard Supabase de Asteroides)
> **Fecha:** 2026-08-05
> **Objetivo:** Crear desde cero un motor jugable real de Snake (grilla con wrap en bordes, frutas variadas del atlas de sprites provisto) como nueva entrada `"snake"` en el catálogo, con leaderboard real en Supabase, sin tocar el comportamiento del mock existente `"serpentina"` ni de los demás juegos.

---

## Alcance

**Dentro:**

1. **Nueva entrada en el catálogo** (`lib/games.ts`): `id: "snake"`, `title: "SNAKE"`, `short: "Devora frutas y crece sin perder el rumbo."`, `long: "Guía una serpiente de píxeles por una grilla sin bordes: al llegar a un extremo reaparece del lado opuesto. Cada fruta que devora —de un surtido real de más de 20 variedades— la hace más larga y más veloz. Un giro en falso contra su propia cola termina la partida."`, `cat: "ARCADE"`, `cover: "cover-snake-real"`, `color: "green"`, `engine: "snake"`, `best`/`plays` con valores placeholder coherentes con los demás. No reemplaza ni modifica la entrada mock existente `"serpentina"`.
2. **Clase CSS `.cover-snake-real`** en `app/globals.css`, patrón `::after`/`::before` como `.cover-asteroides` (nombre distinto de `.cover-snake` para no chocar con el mock de "serpentina").
3. **Assets de sprites**: copiar `references/source-assets/snake-assets/fruits.png` a `public/snake/fruits.png`. Portar el atlas de coordenadas de `references/source-assets/snake-assets/sprites.js` (formato `{x, y, w, h}` por fruta) a un módulo TypeScript propio del motor (p. ej. `lib/games/snake/sprites.ts`), sin depender del `window.SPRITE_ATLAS` global del archivo original.
4. **Motor creado en TypeScript** en `lib/games/snake/engine.ts`: grilla 20×15 celdas de 40px sobre canvas 800×600, movimiento por turnos (tick de velocidad, no por frame), serpiente representada como lista de segmentos, wrap en los 4 bordes (reaparece del lado opuesto, no muere), colisión solo contra su propia cola, fruta actual elegida al azar entre las ~21 del atlas cada vez que se come una, dibujada vía `drawImage` con recorte del atlas sobre `fruits.png`. Expone `createSnakeEngine(canvas, callbacks)` con `{ start, pause, resume, restart, destroy }` y callbacks `onScore`/`onLives`/`onLevel`/`onGameOver`, mapeados así (sin vidas ni niveles literales en el juego original):
   - `onScore`: puntos acumulados por fruta comida.
   - `onLives`: fijo en `1` mientras la partida está viva; emite `0` una sola vez al morir (colisión contra la cola), inmediatamente antes de `onGameOver`.
   - `onLevel`: contador que sube cada N frutas comidas (p. ej. cada 5), reflejando el aumento real de velocidad del tick.
   - `onGameOver(finalScore)`: se dispara al detectar colisión contra la propia cola.
5. **Registro en `lib/games/registry.ts`**: agregar `snake: createSnakeEngine` (el registry y el flag `engine` en `Game` ya existen — sin refactor de generalización nuevo).
6. **`components/game-player.tsx`**: sin condicional nuevo por juego — ya lee el registry por `game.engine`; solo se beneficia automáticamente al existir la entrada `snake` con esa key.
7. **Pausa real**, **fin de partida sin doble camino** (reinicio solo vía modal, ninguna tecla reinicia en game over), **canvas fijo 800×600** — mismas decisiones que Asteroides.
8. **Guardado de puntaje real**: `saveScore` (localStorage) + `insertScore` (Supabase, `game_id: "snake"`) sin migración nueva — la tabla `scores` ya admite cualquier `game_id`.
9. **Leaderboard real en ficha de detalle** (`app/juegos/[id]/page.tsx`) y **Salón de la Fama** (`components/hall-of-fame.tsx`) para `snake`, con estado vacío/parcial igual que Asteroides (podio oculto con <3 filas, mensaje "AÚN NO HAY PUNTAJES" con 0 filas).
10. **"TU MEJOR MARCA" real** para `snake` en el Salón de la Fama, buscando por `player_name === user.name`.

**Fuera de alcance (para specs futuras):**

- Controles táctiles.
- Autenticación real / rate limiting / CAPTCHA.
- Supabase Realtime.
- Efectos de sonido (no hay assets de audio provistos para Snake).
- Borrado o edición de puntajes guardados.
- Modificar, reemplazar o retirar el mock existente `"serpentina"`.

---

## Modelo de datos

Sin nuevas estructuras de persistencia — reutiliza `Game` (`lib/games.ts`), `scores` (Supabase,
ya existente, `game_id` libre) y `fetchTopScores`/`insertScore` de `lib/scores.ts` tal cual.

Tipos y datos nuevos acotados al motor:

```ts
// lib/games/snake/sprites.ts
export type SpriteRect = { x: number; y: number; w: number; h: number };

export const FRUIT_SPRITES: Record<string, SpriteRect> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  // ...resto de las ~21 frutas portadas de sprites.js
};

export const FRUIT_SHEET_SRC = "/snake/fruits.png";
```

```ts
// lib/games/snake/engine.ts
export type EngineCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type SnakeEngine = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  destroy: () => void; // cancela el tick/rAF y remueve listeners de teclado al desmontar
};

export function createSnakeEngine(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
): SnakeEngine;
```

El estado interno (segmentos de la serpiente, posición/tipo de fruta actual, dirección,
velocidad del tick) no se exporta — detalle de implementación del módulo.

---

## Plan de implementación

Cada paso deja el proyecto compilando y navegable.

### Paso 1 — Catálogo y portada

Agregar la entrada `snake` a `GAMES` en `lib/games.ts` y la clase `.cover-snake-real` en
`app/globals.css`. Sin motor todavía: `/juegos/snake` ya muestra la ficha de detalle con el
mock genérico funcionando (igual que cualquier otro juego hoy). La entrada `serpentina` no se
toca.

### Paso 2 — Assets de sprites

Copiar `references/source-assets/snake-assets/fruits.png` a `public/snake/fruits.png`. Crear
`lib/games/snake/sprites.ts` portando las coordenadas de
`references/source-assets/snake-assets/sprites.js` (las ~21 frutas de la fila usada) a un
`Record<string, SpriteRect>` tipado. Sin consumidores todavía.

### Paso 3 — Motor creado en TypeScript

Crear `lib/games/snake/engine.ts`: grilla 20×15 celdas de 40px, loop por tick (no por frame de
física continua), input de dirección (flechas/WASD) sin permitir giro de 180° instantáneo sobre
sí misma, wrap en los 4 bordes, spawn de fruta en celda libre con sprite aleatorio de
`FRUIT_SPRITES`, colisión contra la propia cola como única causa de game over,
`createSnakeEngine(canvas, callbacks)` según el tipo definido en el paso anterior. Reglas:

- El canvas se recibe por parámetro (no `document.getElementById`).
- Listeners de teclado se agregan en `start()`/se remueven en `destroy()`, nunca a nivel de módulo.
- `onScore`/`onLives`/`onLevel` solo se invocan cuando el valor cambia (patrón `emitIfChanged`).
- Sin reinicio interno por teclado en el estado de game over — el único reinicio es `restart()`.
- `pause()`/`resume()` detienen/reanudan el tick sin acumular turnos fantasma.

Módulo sin consumidores todavía — no cambia ninguna pantalla existente.

### Paso 4 — Registro del motor

Agregar `snake: createSnakeEngine` a `ENGINE_REGISTRY` en `lib/games/registry.ts`. Como
`game-player.tsx` ya lee el registry por `game.engine` (generalizado en el port de Tetris/
Arkanoid), no hace falta tocar ese componente: al tener la entrada `snake` con `engine: "snake"`
en el catálogo, el reproductor monta el canvas real automáticamente.

### Paso 5 — Leaderboard real (ficha de detalle + Salón de la Fama)

En `app/juegos/[id]/page.tsx` y `components/hall-of-fame.tsx`, confirmar que la lectura por
`game.engine`/`id` (ya generalizada para Asteroides/Tetris/Arkanoid) cubre `snake` sin
condicional nuevo — solo agregar el `game_id: "snake"` donde corresponda si quedó algún literal
sin generalizar. Guardado real desde `game-player.tsx`: al presionar "GUARDAR PUNTUACIÓN" con
motor real, además de `saveScore` se llama `insertScore` con `gameId: "snake"`.

### Paso 6 — Verificación manual

`npm run dev`, jugar una partida completa en `/juegos/snake/jugar` (serpiente se mueve por
grilla, wrap en los bordes, come frutas variadas con sprites reales, muere solo al chocar contra
su propia cola), guardar puntaje, confirmar con `mcp__supabase__execute_sql` que la fila aparece
con `game_id = 'snake'`, confirmar que `/juegos/serpentina/jugar` y los demás juegos no cambian.

### Paso 7 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

### Catálogo

- [x] `GAMES` en `lib/games.ts` incluye la entrada `id: "snake"` con los campos definidos en el Alcance, incluyendo `engine: "snake"`.
- [x] `.cover-snake-real` existe en `app/globals.css` y se ve en la tarjeta de biblioteca y en la portada de detalle.
- [x] La entrada mock `id: "serpentina"` sigue existiendo sin cambios.

### Assets

- [x] `public/snake/fruits.png` existe y se sirve correctamente.
- [x] `lib/games/snake/sprites.ts` exporta las coordenadas de las frutas usadas por el motor.

### Motor

- [x] `lib/games/snake/engine.ts` exporta `createSnakeEngine(canvas, callbacks)` sin exportar el estado interno.
- [x] El motor no agrega listeners de teclado a nivel de módulo — solo entre `start()` y `destroy()`.
- [x] La serpiente reaparece del lado opuesto al tocar cualquiera de los 4 bordes (sin morir).
- [x] Comer una fruta hace crecer la serpiente, suma puntaje y hace aparecer una nueva fruta con sprite aleatorio del atlas.
- [x] Colisionar contra la propia cola es la única causa de game over.
- [x] `onScore`/`onLevel` se disparan cuando el valor correspondiente cambia; `onLives` emite `1` en juego y `0` justo antes de `onGameOver`.
- [x] Presionar cualquier tecla en estado game over **no** reinicia la partida.

### Integración en el reproductor

- [x] En `/juegos/snake/jugar`, la serpiente se controla con flechas/WASD; el canvas 800×600 se ve dentro de `.crt-screen`.
- [x] El HUD (Jugador/Puntuación/Vidas/Nivel) refleja el estado real del motor.
- [x] El botón PAUSA detiene el juego; REANUDAR lo continúa.
- [x] Al morir, aparece el modal "FIN DEL JUEGO" con el puntaje real; "GUARDAR PUNTUACIÓN" llama a `saveScore` e `insertScore` con `gameId: "snake"`.
- [x] "JUGAR DE NUEVO" reinicia el motor sin recargar la página.
- [x] "SALIR" navega a `/juegos/snake` y desmonta el canvas sin dejar listeners colgados.
- [x] Cualquier otro juego (ej. `/juegos/serpentina/jugar`, `/juegos/caida/jugar`) sigue mostrando su comportamiento actual sin cambios.

### Leaderboard (ficha de detalle + Salón de la Fama)

- [x] Con la tabla vacía para `snake`, se muestra "AÚN NO HAY PUNTAJES" en vez de tabla/podio.
- [x] Con 1-2 filas reales, se muestra la tabla sin podio.
- [x] Con 3+ filas reales, se muestra podio y tabla con datos reales de Supabase.
- [x] "TU MEJOR MARCA EN SNAKE" aparece en el Salón de la Fama si el usuario en sesión tiene al menos una fila propia.
- [x] Las demás pestañas/fichas de detalle no cambian de comportamiento.

### Compilación

- [x] `npx tsc --noEmit` pasa sin errores.
- [x] `npm run lint` pasa sin advertencias nuevas.
- [x] `npm run build` termina sin errores.

---

## Decisiones tomadas y descartadas

### Id nuevo `"snake"` en vez de reemplazar el mock `"serpentina"`

- **Sí:** `serpentina` ya existe como entrada mock curada (portada, descripción y mejor puntaje propios); reemplazarla habría descartado contenido existente sin necesidad. Decisión explícita del usuario.
- **No:** reutilizar `serpentina` — habría desplazado el seed de `seededScores` (depende de `id.length`) sin beneficio real.

### Wrap en los bordes en vez de muerte al chocar contra la pared

- **Sí:** decisión explícita del usuario — la serpiente solo muere contra su propia cola, nunca contra el borde del tablero.
- **No:** muerte al tocar el borde — hubiera sido la variante clásica alternativa, descartada por el usuario.

### Fruta rotativa entre las ~21 del atlas, en vez de una sola fija

- **Sí:** decisión explícita del usuario — aprovecha los sprites reales provistos (`fruits.png`/`sprites.js`) en vez de usar solo una fruta y desperdiciar el resto del atlas.
- **No:** fruta única fija — más simple de implementar pero ignora el asset provisto.

### Sin vidas/niveles literales — mapeo a `1`/`0` y contador de velocidad

- **Sí:** decisión explícita del usuario — mantiene el contrato de callbacks `onScore`/`onLives`/`onLevel`/`onGameOver` sin forzar un concepto de "vidas múltiples" que Snake no tiene, y usa `onLevel` para reflejar el aumento real de velocidad.
- **No:** omitir `onLives`/`onLevel` del todo — hubiera roto el contrato genérico del motor y dejado el HUD incompleto respecto a los demás juegos reales.

### Assets copiados a `public/snake/`, atlas portado a TypeScript propio

- **Sí:** el pipeline actual (canvas puro) no cubre sprites; se declara explícito como alcance adicional en vez de asumir que es tan simple como Asteroides, según lo indicado en el mapa de integración.
- **No:** cargar `sprites.js` tal cual (con `window.SPRITE_ATLAS` global) — no es idiomático en un módulo TypeScript y acopla el motor a una variable global.

### Sin refactor de generalización nuevo

- **Sí:** el registry (`lib/games/registry.ts`) y el flag `engine` en `Game` ya existen desde el port de Tetris/Arkanoid; Snake solo agrega una entrada más al registry existente.
- **No:** proponer un refactor ya hecho — hubiera sido trabajo redundante no solicitado.

### Reinicio solo vía modal, sin tecla interna

- **Sí:** misma decisión heredada de Asteroides — evita un camino de reinicio que se salte el flujo de guardado de puntaje.
- **No:** permitir reinicio con tecla en game over — riesgo de partida "fantasma" sin puntaje registrado.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                             | Mitigación                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coordenadas del atlas (`sprites.js`) imprecisas.** El archivo original indica que las coordenadas fueron "detectadas por análisis de píxeles", no oficiales — pueden tener desajustes de recorte.                                                                | Verificación visual manual en el Paso 6: confirmar que cada fruta se recorta sin bordes cortados ni artefactos antes de dar el motor por terminado.            |
| **Doble montaje en desarrollo (React `StrictMode`).** El `useEffect` que crea el motor vía registry se ejecuta dos veces en dev, pudiendo dejar dos loops o dos sets de listeners activos si `destroy()` no limpia todo.                                           | `destroy()` debe cancelar el loop pendiente y remover explícitamente los listeners de teclado agregados en `start()`, igual que en Asteroides/Tetris/Arkanoid. |
| **Spawn de fruta en celda ocupada por la serpiente.** Si el motor elige una celda al azar sin excluir los segmentos actuales, la fruta podría aparecer superpuesta.                                                                                                | El algoritmo de spawn debe excluir explícitamente las celdas ocupadas por la serpiente antes de elegir la posición de la nueva fruta.                          |
| **Deuda conocida heredada (no se arregla en esta spec):** `game.best`/`game.plays` no se sincronizan con Supabase; `insertScore` falla en silencio; `leaderboard.tsx` usa `key={r.name}`, sin `preventDefault()` en teclado (flechas también scrollean la página). | Aceptado como riesgo conocido documentado en el mapa de integración, igual que para los demás juegos reales.                                                   |

---

## Qué **no** está en esta spec

- Controles táctiles.
- Autenticación real / rate limiting / CAPTCHA.
- Supabase Realtime.
- Efectos de sonido.
- Borrado o edición de puntajes guardados.
- Cambios a la entrada mock `"serpentina"`.
- Refactor de generalización de la plataforma (ya existente de specs previas).

Cada uno de estos, si se necesita, va en su propia spec.
