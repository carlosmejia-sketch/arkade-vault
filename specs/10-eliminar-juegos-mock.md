# SPEC 10 — Eliminar juegos mock, dejar solo catálogo real (Supabase)

> **Estado:** Aprobado
> **Depende de:** SPEC 05 (motor real Asteroides), SPEC 06 (leaderboard Supabase), SPEC 07 (registry `ENGINE_REGISTRY`), SPEC 08 (Arkanoid), SPEC 09 (Snake)
> **Fecha:** 2026-08-05
> **Objetivo:** Eliminar del catálogo los 8 juegos mock sin motor real (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) y todo el código de soporte que solo ellos usaban (`seededScores`, ramas mock en Hall of Fame y ficha de detalle, datos inventados de home), dejando `asteroides`, `tetris`, `arkanoid` y `snake` como único catálogo, todos con motor real y leaderboard real en Supabase.

---

## Alcance

**Dentro:**

1. **`lib/games.ts`**: eliminar las 8 entradas mock (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) de `GAMES`, dejando solo `asteroides`, `tetris`, `arkanoid`, `snake`. Campo `engine` pasa de `engine?: string` a `engine: string` (obligatorio) — todo juego que queda tiene motor real. Quitar `"VERSUS"` de `CATS` (categoría exclusiva de `duelo-pixel`, sin ningún juego real que la use).
2. **`app/globals.css`**: eliminar las clases de portada exclusivas de los mocks eliminados: `.cover-bricks`, `.cover-tetro`, `.cover-snake` (el mock de "serpentina"; `.cover-snake-real` de Snake no se toca), `.cover-glot`, `.cover-invaders`, `.cover-rocas`, `.cover-rana`, `.cover-duelo`, con sus `::after`/`::before`. Se conservan `.cover-asteroides`, `.cover-tetris`, `.cover-arkanoid`, `.cover-snake-real`.
3. **`lib/scores.ts`**: eliminar `seededScores`, `PLAYERS` y el tipo `ScoreRow` (sin consumidores tras el punto 1). Se agregan dos funciones nuevas para alimentar home con datos reales cruzando los 4 juegos:
   - `fetchRecentScores(supabase, limit)`: últimos puntajes insertados en `scores`, de cualquier `game_id`, para el ticker de "últimas puntuaciones".
   - `fetchTopScoresAllGames(supabase, limit)`: los puntajes más altos de `scores`, de cualquier `game_id`, para "top jugadores".
4. **`components/leaderboard.tsx`**: cambia el tipo importado de `ScoreRow` (eliminado) a `RealScoreRow`.
5. **`app/juegos/[id]/page.tsx`**: elimina la rama `seededScores`/`hasRealLeaderboard` — siempre llama `fetchTopScores` (todo juego en el catálogo tiene leaderboard real).
6. **`components/hall-of-fame.tsx`**: elimina la rama mock completa (`seededScores`, `mockRows`, `youRank`, `youScore` placeholder, `showPodium`/`showTable` con fallback `!hasRealLeaderboard`) — el componente queda solo con la lógica de leaderboard real (fetch por pestaña, estado vacío/parcial, "TU MEJOR MARCA" buscando por `player_name`).
7. **`components/game-player.tsx`**: elimina la rama sin motor (`hasEngine` ternario, nivel simulado `1 + Math.floor(score / 2500)`) — todo juego del catálogo tiene `engineFactory` real vía `ENGINE_REGISTRY[game.engine]`.
8. **`components/home.tsx`**: reemplaza los datos inventados por datos reales de Supabase:
   - `TICKER` (sección "ÚLTIMAS PUNTUACIONES"): usa `fetchRecentScores` (server-side, componente pasa a ser `async`), mapeando `game_id` → `game.title` vía `getGame()`, con tiempo relativo ("hace X min") calculado a partir de `created_at`.
   - `TOP_PLAYERS` (sección "TOP JUGADORES · HOY"): usa `fetchTopScoresAllGames` (top 5 puntajes individuales más altos, sin agrupar por jugador — puede repetir nombre si el mismo jugador tiene más de un puntaje alto).
   - `STATS`: el primer bloque (`"12+ JUEGOS Y CONTANDO"`) cambia su número a `GAMES.length` calculado dinámicamente en vez del literal `"12+"`. Los otros dos bloques (`"MILES DE PARTIDAS"`, `"GLOBAL RANKING"`) no cambian — son copy de marketing sin dato del catálogo detrás.
   - Si `scores` está vacía (sin partidas jugadas todavía), el ticker y el top de jugadores muestran un estado vacío simple en vez de listas vacías o placeholders inventados.

**Fuera de alcance (para specs futuras):**

- Sincronizar `game.best`/`game.plays` con datos reales de Supabase (deuda conocida documentada desde SPEC 05/06/07/08/09, no se corrige acá).
- Borrado de los assets de `references/` usados originalmente por los mocks (siguen ahí como referencia histórica del template; no se sirven desde `public/` ni se importan en código, así que no generan dead code ejecutable).
- Cualquier juego mock nuevo o reemplazo de los 8 eliminados por versiones con motor real (cada uno, si se hace, es su propia spec — como ya pasó con Asteroides/Tetris/Arkanoid/Snake).
- Agrupar `TOP_PLAYERS` por jugador único (se deja como ranking de puntajes individuales, ver Decisiones).
- Actualizar el copy de `FEATURES` en home (ya menciona "Arkanoid, Tetris, Snake y muchos más", sigue vigente sin cambios).

---

## Modelo de datos

Sin nuevas tablas ni columnas — reutiliza `scores` (Supabase, ya existente). Dos funciones nuevas en `lib/scores.ts`, mismo cliente/patrón que `fetchTopScores`:

```ts
export type RecentScoreRow = {
  playerName: string;
  gameId: string;
  score: number;
  createdAt: string; // ISO, home.tsx calcula el "hace X min" en el server component
};

export async function fetchRecentScores(
  supabase: SupabaseClient,
  limit: number,
): Promise<RecentScoreRow[]>;

// Reutiliza RealScoreRow (rank/name/score/date) — mismo shape que fetchTopScores,
// pero sin filtrar por game_id.
export async function fetchTopScoresAllGames(
  supabase: SupabaseClient,
  limit: number,
): Promise<RealScoreRow[]>;
```

`lib/games.ts`: cambia el tipo `Game`:

```ts
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  /** Key en lib/games/registry.ts — todo juego del catálogo tiene motor real + leaderboard real. */
  engine: string;
  best: number;
  plays: string;
};
```

`GameCategory` se mantiene como tipo (`"ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS"`) aunque `CATS` ya no incluya `"VERSUS"` como filtro — no hace falta angostar el union type para esto, y evita romper si se reintroduce un juego VERSUS real más adelante.

---

## Plan de implementación

Cada paso deja el proyecto compilando y navegable.

### Paso 1 — Catálogo: quitar los 8 mocks

En `lib/games.ts`, eliminar las entradas `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel` de `GAMES`. Cambiar `engine?: string` a `engine: string` en el tipo `Game` (los 4 juegos restantes ya lo tienen). Quitar `"VERSUS"` de `CATS`. En este punto, `npx tsc --noEmit` puede fallar en los consumidores que todavía asumen mocks (`seededScores`, `hasRealLeaderboard` en varios archivos) — se corrige en los pasos siguientes.

### Paso 2 — `lib/scores.ts`: quitar mock, agregar queries cruzadas

Eliminar `seededScores`, `PLAYERS`, `ScoreRow`. Agregar `RecentScoreRow`, `fetchRecentScores` y `fetchTopScoresAllGames` según el modelo de datos. Sin consumidores todavía para las dos funciones nuevas.

### Paso 3 — Simplificar `components/leaderboard.tsx`

Cambiar el import de `ScoreRow` (eliminado) a `RealScoreRow`. Sin más cambios — mismo shape de campos.

### Paso 4 — Simplificar `app/juegos/[id]/page.tsx`

Quitar el import de `seededScores`/`ScoreRow`, la variable `hasRealLeaderboard` y el `if/else`: siempre `fetchTopScores(supabase, id, 10)`. El bloque de estado vacío (`scores.length === 0`) deja de estar condicionado a `hasRealLeaderboard` — aplica siempre.

### Paso 5 — Simplificar `components/hall-of-fame.tsx`

Quitar `seededScores`, `mockRows`, `hasRealLeaderboard`, `youRank`, `youScore` y las ramas `!hasRealLeaderboard` (incluida la fila "TU MEJOR MARCA" con placeholder `youScore || 9999`). El componente queda con: fetch por pestaña activa vía `fetchTopScores`, `loading`/`showEmpty`/`showPodium`/`showTable` calculados solo sobre `rows.length`, y "TU MEJOR MARCA" únicamente vía `youReal` (búsqueda real por `player_name === user.name`).

### Paso 6 — Simplificar `components/game-player.tsx`

Quitar el ternario `hasEngine` y el cálculo de nivel simulado (`1 + Math.floor(score / 2500)`) — `engineFactory` siempre existe (`ENGINE_REGISTRY[game.engine]`), así que `level` viene siempre de `engineLevel` (el motor real vía `onLevel`).

### Paso 7 — `components/home.tsx`: TICKER y TOP_PLAYERS reales

Convertir `Home` en componente `async` (server component, mismo patrón que `app/juegos/[id]/page.tsx`), usando `createClient()` de `lib/supabase/server.ts`. Reemplazar el array `TICKER` por el resultado de `fetchRecentScores(supabase, 7)`, mapeando cada fila a `{ p: playerName, g: getGame(gameId)?.title, s: score, t: tiempoRelativo(createdAt) }`. Reemplazar `TOP_PLAYERS` por `fetchTopScoresAllGames(supabase, 5)`. Si alguno de los dos arrays viene vacío, renderizar un mensaje simple ("AÚN NO HAY PARTIDAS REGISTRADAS") en vez de la lista. El primer bloque de `STATS` usa `GAMES.length` en vez del literal `"12+"`.

### Paso 8 — Limpieza de CSS

En `app/globals.css`, eliminar `.cover-bricks`, `.cover-tetro`, `.cover-snake` (con sus `::after`), `.cover-glot` (con `::after`/`::before`), `.cover-invaders` (con `::after`), `.cover-rocas` (con `::after`/`::before`), `.cover-rana` (con `::after`), `.cover-duelo` (con `::after`) — todas sin ningún `game.cover` que las referencie tras el Paso 1.

### Paso 9 — Verificación manual

`npm run dev`. Confirmar: `/biblioteca` muestra solo 4 tarjetas (Asteroides, Tetris, Arkanoid, Snake), buscador y filtro de categoría (`ARCADE`/`PUZZLE`/`SHOOTER`, sin `VERSUS`) funcionan sobre esos 4. `/juegos/bloque-buster` (o cualquier otro id eliminado) devuelve 404. `/` (home) muestra ticker y top de jugadores con datos reales de `scores` (o el estado vacío si la tabla está vacía para alguno de los dos). `/salon` muestra 4 pestañas, cada una con leaderboard real. Jugar una partida en cualquiera de los 4, guardar puntaje, y confirmar que aparece reflejado en el ticker/top de home tras recargar.

### Paso 10 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

### Catálogo

- [ ] `GAMES` en `lib/games.ts` contiene únicamente `asteroides`, `tetris`, `arkanoid`, `snake`.
- [ ] El tipo `Game` declara `engine: string` (obligatorio, sin `?`).
- [ ] `CATS` no incluye `"VERSUS"`.
- [ ] `/juegos/bloque-buster`, `/juegos/caida`, `/juegos/serpentina`, `/juegos/gloton`, `/juegos/invasores`, `/juegos/rocas`, `/juegos/ranaria`, `/juegos/duelo-pixel` devuelven 404.

### Biblioteca

- [ ] `/biblioteca` muestra exactamente 4 tarjetas.
- [ ] El filtro de categoría no muestra el chip `VERSUS`.
- [ ] El buscador sigue funcionando sobre los 4 juegos restantes.

### `lib/scores.ts`

- [ ] `seededScores`, `PLAYERS` y `ScoreRow` ya no existen en el archivo.
- [ ] `fetchRecentScores(supabase, limit)` devuelve como máximo `limit` filas ordenadas por `created_at` descendente, de cualquier `game_id`.
- [ ] `fetchTopScoresAllGames(supabase, limit)` devuelve como máximo `limit` filas ordenadas por `score` descendente, de cualquier `game_id`.

### Ficha de detalle y Salón de la Fama

- [ ] `app/juegos/[id]/page.tsx` no importa `seededScores` ni el tipo `ScoreRow`; siempre usa `fetchTopScores`.
- [ ] `components/hall-of-fame.tsx` no importa `seededScores`; no queda ninguna rama `!hasRealLeaderboard` ni variable `mockRows`/`youRank`/`youScore` placeholder.
- [ ] Las 4 pestañas del Salón de la Fama muestran leaderboard real, con el mismo tratamiento de estado vacío/parcial ya usado por Asteroides (podio oculto con <3 filas, "AÚN NO HAY PUNTAJES" con 0 filas).

### Reproductor

- [ ] `components/game-player.tsx` no tiene rama sin motor (`hasEngine` ternario, nivel simulado) — el nivel siempre viene del motor real.
- [ ] Jugar cualquiera de los 4 juegos, guardar puntaje y ver el leaderboard actualizado sigue funcionando igual que antes de esta spec.

### Home

- [ ] La sección "ÚLTIMAS PUNTUACIONES" muestra filas reales de `scores` (o el estado vacío si no hay ninguna), sin ningún nombre/juego/puntaje inventado.
- [ ] La sección "TOP JUGADORES · HOY" muestra los puntajes reales más altos de `scores` (o el estado vacío si no hay ninguno).
- [ ] El primer bloque de `STATS` muestra el número real de juegos del catálogo (`GAMES.length`), no `"12+"`.

### CSS

- [ ] `.cover-bricks`, `.cover-tetro`, `.cover-snake`, `.cover-glot`, `.cover-invaders`, `.cover-rocas`, `.cover-rana`, `.cover-duelo` ya no existen en `app/globals.css`.
- [ ] `.cover-asteroides`, `.cover-tetris`, `.cover-arkanoid`, `.cover-snake-real` siguen intactas.

### Compilación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npm run lint` pasa sin advertencias nuevas.
- [ ] `npm run build` termina sin errores.

---

## Decisiones tomadas y descartadas

### Eliminar los 8 mocks por completo, no ocultarlos ni marcarlos como "próximamente"

- **Sí:** decisión explícita del usuario — el objetivo es que el catálogo quede compuesto únicamente por juegos conectados a la base de datos. Ocultarlos condicionalmente hubiera dejado código y datos muertos sin necesidad.
- **No:** un flag `hidden: true` en el catálogo — hubiera sido complejidad no pedida para un caso donde la decisión es borrar, no posponer.

### `engine` pasa a ser obligatorio en `Game`, no opcional

- **Sí:** decisión explícita del usuario — tras quitar los mocks, todo juego del catálogo tiene motor real; mantener `engine?: string` hubiera dejado un tipo mintiendo sobre un caso que ya no existe.
- **No:** dejar `engine?: string` "por si acaso" — el propio "no agregar código para hipotéticos futuros" aplica acá: si se agrega un mock nuevo más adelante, esa spec futura reintroduce la opcionalidad con contexto propio.

### `TICKER`/`TOP_PLAYERS` de home con datos reales de Supabase, no solo "quitar lo que sobra"

- **Sí:** decisión explícita del usuario — mantiene la sección con valor real en vez de dejarla vacía o con placeholders genéricos tras quitar las referencias a los mocks.
- **No:** dejar el home con TICKER/TOP_PLAYERS estáticos pero "genéricos" (sin nombres de juegos eliminados) — hubiera sido datos igual de falsos, solo con menos pistas de que lo son.

### `TOP_PLAYERS` = top 5 puntajes individuales, sin agrupar por jugador único

- **Sí:** decisión explícita del usuario — mismo criterio simple que ya usa `fetchTopScores` (ORDER BY score DESC LIMIT n), sin agregar una agregación por `player_name` no pedida.
- **No:** `GROUP BY player_name` tomando el máximo por jugador — funcionalidad adicional (deduplicar jugador) no solicitada; se deja para una spec futura si se necesita.

### Rama mock de `hall-of-fame.tsx`/`game-player.tsx`/ficha de detalle se elimina, no se deja "por si vuelve un mock"

- **Sí:** decisión explícita del usuario — código muerto tras esta spec; si se agrega un mock nuevo en el futuro, esa spec reintroduce lo que necesite con el contexto de ese juego puntual.
- **No:** mantener las ramas condicionales inactivas — viola la convención del proyecto de no dejar código muerto ni ramas sin consumidor real.

### `.cover-*` de los 8 mocks se borran de `globals.css`, no se dejan "por si se reusan"

- **Sí:** decisión explícita del usuario (alcance de la limpieza) — sin ninguna entrada de `GAMES` que las referencie, son CSS muerto.
- **No:** dejarlas comentadas o sin usar — mismo criterio de no dejar dead code.

### `GameCategory` (union type) no se angosta al quitar `"VERSUS"` de `CATS`

- **Sí:** son cosas distintas — `CATS` es la lista de chips de filtro visibles hoy; `GameCategory` es el tipo de dato. Angostar el union type sería un cambio más invasivo (afecta cualquier literal `"VERSUS"` en el código) sin beneficio adicional, ya que ningún juego actual lo usa de todas formas.
- **No:** quitar `"VERSUS"` también del union type — hubiera sido una limpieza más agresiva no pedida explícitamente, y dificulta reintroducir un juego VERSUS real más adelante.

### `game.best`/`game.plays` siguen sin sincronizar con Supabase (deuda heredada, no se corrige acá)

- **Sí:** ya documentado como riesgo aceptado desde SPEC 05; esta spec es sobre eliminar mocks, no sobre cerrar esa deuda técnica particular.
- **No:** sincronizar `best`/`plays` con `scores` en esta misma spec — ampliaría el alcance a un problema preexistente no pedido para esta tarea.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                        | Mitigación                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Enlaces rotos a rutas eliminadas.** Si queda algún link estático a `/juegos/serpentina` (u otro mock) en algún componente no revisado, el usuario vería un 404 inesperado.                                  | Verificación manual en el Paso 9 navegando la biblioteca completa; `Grep` final sobre el repo buscando los 8 ids eliminados como string literal antes de dar la spec por cerrada.                                               |
| **`fetchRecentScores`/`fetchTopScoresAllGames` con tabla `scores` vacía en producción.** Si nadie jugó todavía tras el deploy, home mostraría listas vacías.                                                  | Estado vacío explícito ("AÚN NO HAY PARTIDAS REGISTRADAS") en vez de listas en blanco, definido en el Paso 7.                                                                                                                   |
| **`Home` pasa de componente sin datos a `async` server component.** Cambia el patrón de renderizado (ya no es 100% estático); un error de red en Supabase durante el build/SSR podría romper la carga de `/`. | Mismo patrón ya probado en `app/juegos/[id]/page.tsx` (server component con `createClient` de `lib/supabase/server.ts`); Next.js maneja el error igual que en esa ruta. Riesgo aceptado, consistente con el resto del proyecto. |
| **Deuda conocida heredada (no se corrige en esta spec):** `game.best`/`game.plays` sin sincronizar con Supabase; `insertScore` falla en silencio; sin `preventDefault()` en teclado.                          | Aceptado como riesgo conocido, documentado igual que en specs anteriores (05/06/07/08/09).                                                                                                                                      |

---

## Qué **no** está en esta spec

- Sincronizar `game.best`/`game.plays` con datos reales de Supabase.
- Borrado de assets de `references/` (no ejecutables, quedan como referencia histórica).
- Cualquier juego mock nuevo o motor real adicional.
- Agrupar `TOP_PLAYERS` por jugador único (deduplicación).
- Cambios al copy de `FEATURES` en home.
- Angostar el union type `GameCategory` quitando `"VERSUS"`.

Cada uno de estos, si se necesita, va en su propia spec.
