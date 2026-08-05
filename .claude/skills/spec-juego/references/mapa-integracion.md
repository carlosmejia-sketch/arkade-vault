# Mapa de integración — juegos reales con leaderboard en Arcade Vault

Base verificada sobre la implementación de Asteroides (specs 05 y 06). Úsalo para escribir el
plan de implementación del spec sin tener que re-explorar el repo cada vez.

## Sitios a tocar (7)

1. **`lib/games.ts`** — tipo `Game` (L7-24), array `GAMES` (L26-126), `CATS` (L128-134),
   `getGame` (L136-138). Consumidores automáticos que no requieren cambio propio: `library.tsx:17`,
   `home.tsx:214` (`slice(0,6)`), `hall-of-fame.tsx:53` (pestañas), `generateStaticParams` de
   `app/juegos/[id]/page.tsx` y `app/juegos/[id]/jugar/page.tsx`.

2. **`app/globals.css`** — clase `.cover-<slug>` siguiendo el patrón `::after`/`::before` del
   bloque L696-897 (`.cover-asteroides`, L842-868, es el modelo más reciente: gradiente base,
   `::after` con `radial/linear-gradient` de detalle, `::before` opcional con un glifo). Si el
   canvas no es 800×600, generalizar `.asteroides-canvas` (L1179-1186) — hoy nombrada por juego,
   no genérica.

3. **`lib/games/<slug>/engine.ts`** — factory con closure (no clase). Debe exponer exactamente:

   ```ts
   type EngineCallbacks = {
     onScore: (score: number) => void;
     onLives: (lives: number) => void;
     onLevel: (level: number) => void;
     onGameOver: (finalScore: number) => void;
   };
   type Engine = { start(): void; pause(): void; resume(): void; restart(): void; destroy(): void };
   function create<Slug>Engine(canvas: HTMLCanvasElement, callbacks: EngineCallbacks): Engine;
   ```

   Receta de port (documentada en los comentarios de cabecera de
   `lib/games/asteroides/engine.ts:1-12`, repetible tal cual):
   - El canvas se recibe por parámetro, nunca `document.getElementById`.
   - Listeners de teclado se agregan en `start()` y se remueven en `destroy()`, jamás a nivel de
     módulo.
   - `emitIfChanged()` (patrón de `engine.ts:377-394`): guardar el último valor emitido de cada
     métrica y solo invocar el callback cuando cambia — evita `setState` por frame.
   - Loop con `requestAnimationFrame`, `dt` clamped (p. ej. `Math.min((ts-last)/1000, 0.05)`,
     `engine.ts:599-611`) para no romper la física si el tab pierde foco.
   - `pause()`/`resume()` deben congelar/reanudar sin acumular `dt` fantasma (resetear
     `lastTime = null` al reanudar).
   - Sin reinicio interno por teclado en el estado de game over — el único reinicio es
     `restart()` llamado desde el modal de React (decisión explícita heredada de spec 05).

4. **`components/game-player.tsx`** — puntos exactos de la versión actual (single-juego):
   `isAsteroides` L17, cálculo de `level` L33, mock `setInterval` L38-46 (debe seguir
   funcionando intacto para los juegos sin motor real), montaje del motor L48-63, wiring de
   pause/finish/restart L65-91, render condicional canvas vs `.game-arena` L134-149, llamada a
   `insertScore` dentro del modal de guardado L196-216.

5. **`app/juegos/[id]/page.tsx`** — rama L26-35: hoy pasa el literal `"asteroides"` a
   `fetchTopScores` en vez de `id` (bug latente a corregir en el refactor). Estado vacío
   L95-102 (mensaje "AÚN NO HAY PUNTAJES" si `scores.length === 0`).

6. **`components/hall-of-fame.tsx`** — `tab`/flag L12, `useEffect` de fetch L22-31 (mismo
   literal `"asteroides"` en vez de `tab`), `realRows`/`rows` L34, `youReal` L39-43, flags
   `loading`/`showPodium`/`showTable`/`showEmpty` L45-48, los dos bloques casi duplicados de
   "TU MEJOR MARCA" (mock L130-157, real L158-185).

7. **`specs/NN-juego-<slug>.md`** — el spec en sí, más el commit final.

## Reutilizar sin tocar

- **`lib/scores.ts`** — `fetchTopScores(supabase, gameId, limit)` (L79-99) e
  `insertScore(supabase, { gameId, playerName, score })` (L101-112) **ya son genéricas por
  `gameId`**. No requieren cambio para un segundo juego.
- **`lib/supabase/client.ts` / `server.ts`** — sin cambios.
- **Tabla `scores` en Supabase** — `game_id` es `text` libre (no enum) y las policies RLS son
  públicas para `anon`/`authenticated`. Un juego nuevo NO requiere migración; basta con escribir
  otro valor de `game_id`.
- **`components/leaderboard.tsx`** — presentacional puro, ya tipado sobre `ScoreRow`/
  `RealScoreRow` (formas compatibles).
- **`lib/session.tsx`** — `saveScore` de localStorage sigue igual para todos los juegos.

## Refactor de generalización (una sola vez, primer juego adicional)

Motivo: hoy la integración real está condicionada a `id === "asteroides"` hardcodeado en 3
archivos (puntos 4, 5, 6 arriba). Con un segundo juego real eso debe generalizarse o cada juego
nuevo agrega otro `||` disperso.

Cambios mínimos, sin alterar comportamiento observable de Asteroides ni de los 8 mocks:

- Extraer `EngineCallbacks` y el tipo de motor a un archivo compartido, p. ej.
  `lib/games/types.ts`.
- Agregar un registry `id -> factory`, p. ej. `lib/games/registry.ts`, con una entrada
  `asteroides: createAsteroidesEngine`.
- Agregar al tipo `Game` (`lib/games.ts`) un flag que indique motor real y leaderboard real
  (p. ej. `engine?: string` que sea la key del registry, o `hasRealLeaderboard: boolean` —
  decidir con el usuario en el spec).
- Reemplazar los 3 `isAsteroides` por una consulta al registry/flag.
- Reemplazar los literales `"asteroides"` pasados a `fetchTopScores` por `id`/`game.id`.

Este paso solo va en el plan si `lib/games.ts` todavía no tiene ese flag — verificar antes de
incluirlo (evita re-proponer un refactor ya hecho).

## Deuda conocida — mencionar como riesgo aceptado, no arreglar de oficio

- `game.best`/`game.plays` nunca se sincronizan con datos reales de Supabase.
- Ningún handler hace `preventDefault()` en teclado: flechas/espacio también hacen scroll de
  la página.
- `components/leaderboard.tsx` usa `key={r.name}` — colisiona si dos filas reales comparten
  alias.
- `insertScore` falla en silencio (`.catch(err => console.error(...))`), sin feedback en UI.

## Assets fuera del patrón actual

El pipeline hoy (canvas puro, sin sprites ni audio) cubre bien `references/started-games/02-asteroids`
y `03-tetris` (ambos sin assets externos, `tetris` con `style.css` propio a revisar aparte).
`04-arkanoid` sí trae `assets/spritesheet*.png` y `assets/sounds/*.mp3` — si el juego a portar
los necesita, el spec debe declararlo como alcance explícito (destino `public/<slug>/...`,
carga de imágenes/audio en el engine) en vez de asumir que es igual de simple que Asteroides.
