# SPEC 11 — Skins de Asteroides (clasico / neon / retro)

> **Estado:** Implementado
> **Depende de:** SPEC 05 (motor real de Asteroides), SPEC 06 (leaderboard Supabase de Asteroides)
> **Fecha:** 2026-08-14
> **Objetivo:** Permitir elegir entre 3 paletas visuales (`clasico`, `neon`, `retro`) para el motor de Asteroides sin alterar su lógica de juego, agregando la infraestructura genérica de skins (`lib/games/skins.ts`, extensión de `EngineFactory`/`Engine`) que usarán los demás juegos en specs futuras.

---

## Alcance

**Dentro:**

1. **`lib/games/skins.ts` (nuevo, primer juego del flujo)**: `type SkinId = "clasico" | "neon" | "retro"`, `type GameId = "asteroides" | "tetris" | "arkanoid" | "snake"`, `type GamePalette` con los roles inventariados en este spec para Asteroides, `SKINS: Record<GameId, Record<SkinId, GamePalette>>` con **solo** la entrada `asteroides` poblada (las otras 3 quedan pendientes de sus propios specs), `DEFAULT_SKIN: SkinId = "clasico"`, `getPalette(gameId, skinId)` con fallback a `clasico` si `skinId` no existe para ese juego.
2. **`lib/games/types.ts`**: extender `EngineFactory` a `(canvas, callbacks, palette?) => Engine` (parámetro opcional, no rompe los 3 engines que aún no reciben paleta) y agregar `setPalette?: (palette: GamePalette) => void` opcional a `Engine`.
3. **`lib/games/asteroides/engine.ts`**: sustituir cada literal de color hoy hardcodeado por `palette.<rol>` correspondiente (lista exacta en la sección "Inventario de roles" abajo). `createAsteroidesEngine` recibe la paleta como tercer parámetro opcional, con `getPalette("asteroides", "clasico")` como valor por defecto si no se pasa. Implementa `setPalette` para poder cambiar de skin sin perder la partida en curso.
4. **`components/game-player.tsx`**: estado `skin` (`SkinId`), selector de 3 botones (`.btn`) junto a `PAUSA`/`FIN`/`SALIR`, persistencia en `localStorage` bajo la clave `av_skin` (mismo patrón que `av_user`/`av_scores` de `lib/session.tsx`), paso de `getPalette(game.id, skin)` al montar el engine vía registry. El selector solo se renderiza si `game.id` tiene entrada en `SKINS` (hoy, solo `asteroides`).
5. **Verificación manual**: Asteroides jugado en las 3 skins, confirmando legibilidad y que el cambio de skin no reinicia la partida.

**Fuera de alcance (para specs futuros):**

- Skins de Tetris, Arkanoid y Snake (cada uno su propio spec `NN-skins-<id>.md`, reutilizando `lib/games/skins.ts` y la extensión de tipos ya hecha aquí).
- Variantes de skin para `.cover-asteroides` en `app/globals.css` — la portada de biblioteca/detalle no cambia con la skin elegida en el reproductor.
- Sonido o efectos distintos por skin.
- Controles táctiles, autenticación real, Supabase Realtime — deuda ya documentada en specs previas, no se toca aquí.

---

## Inventario de roles de color (Asteroides)

Grep de `lib/games/asteroides/engine.ts`: todo el dibujo es vectorial (sin sprites ni grilla), por lo que el rol base `rejilla` **no aplica** a este juego.

| Rol (`GamePalette`)   | Uso en el engine actual                                               | Origen (línea aprox.) |
| --------------------- | --------------------------------------------------------------------- | --------------------- |
| `fondo`               | `fillRect` de limpieza de pantalla en `draw()`                        | L570                  |
| `entidadPrincipal`    | Contorno de la nave (`Ship.draw`)                                     | L265                  |
| `entidadSecundaria`   | Contorno de los asteroides (`Asteroid.draw`)                          | L127                  |
| `proyectil` _(extra)_ | Relleno de las balas (`Bullet.draw`)                                  | L67                   |
| `acento`              | Contorno + texto "3x" del power-up de disparo triple (`PowerUp.draw`) | L172, L177            |
| `peligro`             | Llama del propulsor cuando la nave acelera (`Ship.draw`, `thrusting`) | L284                  |
| `particula` _(extra)_ | Trazo de las partículas de explosión (`Particle.draw`)                | L322                  |
| `hud`                 | Texto principal del HUD: `SCORE`, `NIVEL`, ícono de vidas (`drawHUD`) | L541, L527            |
| `overlay`             | Título grande de fin de partida, `"GAME OVER"` (`drawOverlay`)        | L562                  |
| `textoHud`            | Subtítulo atenuado del overlay, `"PUNTAJE: X"` (`drawOverlay`)        | L565                  |

`rejilla`: N/A — no se declara en `GamePalette` de Asteroides (se documenta como comentario en `skins.ts` para que las 3 skins no la incluyan y `getPalette` no la exija).

---

## Las 3 skins

### `clasico` (default — idéntico al engine actual)

| Rol                 | Hex / valor                      |
| ------------------- | -------------------------------- |
| `fondo`             | `#000000`                        |
| `entidadPrincipal`  | `#ffffff`                        |
| `entidadSecundaria` | `#ffffff`                        |
| `proyectil`         | `#ffffff`                        |
| `acento`            | `#00ffff`                        |
| `peligro`           | `rgba(255, 130, 0, 0.85)`        |
| `particula`         | `#ffffff` (alpha decae por vida) |
| `hud`               | `#ffffff`                        |
| `overlay`           | `#ffffff`                        |
| `textoHud`          | `rgba(255, 255, 255, 0.65)`      |

**Desviación aceptada:** `fondo: #000000` es negro puro, lo cual la regla general de legibilidad prohíbe ("nada de negro puro choca con `.crt`"). Se mantiene así en `clasico` porque el mandato de esta skin es no cambiar nada de lo que el engine dibuja hoy — es la prueba de que el refactor de paletas no altera el comportamiento visual existente. Ver `Riesgos identificados`.

### `neon` (tokens del sitio + glow)

Fondo alineado a `--bg #0a0a0f` (no negro puro, evita el choque con `.crt`).

| Rol                 | Hex / valor                 | Notas                                                                                            |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `fondo`             | `#0a0a0f`                   | = `--bg` del sitio                                                                               |
| `entidadPrincipal`  | `#00f5ff` (`--cyan`)        | Nave, con `shadowBlur` ~12                                                                       |
| `entidadSecundaria` | `#ff006e` (`--magenta`)     | Asteroides, con `shadowBlur` ~10                                                                 |
| `proyectil`         | `#f5ff00` (`--yellow`)      | Balas brillantes                                                                                 |
| `acento`            | `#00ff88` (`--green`)       | Power-up 3x, distinto en tono y hue de la nave                                                   |
| `peligro`           | `#ff6a00`                   | Llama del propulsor; no es token del sitio, hex nuevo justificado por no haber naranja en `--*`  |
| `particula`         | `rgba(255, 255, 255, 0.9)`  | Chispas blancas, sin depender de animación para leerse                                           |
| `hud`               | `#00f5ff` (`--cyan`)        | Texto SCORE/NIVEL                                                                                |
| `overlay`           | `#f5ff00` (`--yellow`)      | Título "GAME OVER", máximo contraste                                                             |
| `textoHud`          | `rgba(255, 255, 255, 0.75)` | Subtítulo — blanco translúcido en vez de magenta para no bajar de 4.5:1 (ver tabla de contraste) |

El glow (`shadowBlur`) es decorativo: todos los roles ya cumplen el mínimo de contraste sin animación ni parpadeo, respetando `prefers-reduced-motion`.

### `retro` (CRT fósforo verde, sin glow, monocromo por brillo)

Distingue entidades por **brillo**, no solo por matiz, para que también se distingan en escala de grises.

| Rol                 | Hex / valor | Notas                                                                              |
| ------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `fondo`             | `#001505`   | Verde casi negro, no negro puro                                                    |
| `entidadPrincipal`  | `#33ff66`   | Nave — el verde más brillante junto al HUD                                         |
| `entidadSecundaria` | `#1f9a44`   | Asteroides — verde medio, claramente más oscuro que la nave                        |
| `proyectil`         | `#baffcb`   | Balas — casi blanco-menta, el tono más brillante de toda la paleta                 |
| `acento`            | `#ffb000`   | Power-up 3x — ámbar, segundo hue (contraste de matiz con el verde ambiente)        |
| `peligro`           | `#d92a00`   | Llama del propulsor — rojo-naranja oscuro, distinto en brillo del verde secundario |
| `particula`         | `#7dffb2`   | Chispas — verde claro, entre la nave y el asteroide en brillo                      |
| `hud`               | `#33ff66`   | Texto SCORE/NIVEL — igual de brillante que la nave (patrón de consola clásica)     |
| `overlay`           | `#ffb000`   | Título "GAME OVER" — ámbar, distinto del verde de juego                            |
| `textoHud`          | `#1f9a44`   | Subtítulo — mismo verde medio que el asteroide, más tenue que el HUD               |

`image-rendering: pixelated` no aplica a este motor porque no dibuja sprites/bitmaps (todo es vectorial vía `stroke`/`fill`); se documenta como decisión, no como omisión.

---

## Tabla de contraste (WCAG, luminancia relativa)

Umbral: **4.5:1** para texto de HUD (`hud`, `overlay`, `textoHud`), **3:1** para entidades jugables (`entidadPrincipal`, `entidadSecundaria`, `proyectil`, `acento`, `peligro`, `particula`). `--bg` del sitio es `#0a0a0f` (L = 0.00316).

| Skin      | Rol                 | Color                             | Fondo de referencia | Ratio      | ¿Pasa? |
| --------- | ------------------- | --------------------------------- | ------------------- | ---------- | ------ |
| `clasico` | `entidadPrincipal`  | `#ffffff`                         | `#000000`           | 21.0 : 1   | Sí     |
| `clasico` | `entidadSecundaria` | `#ffffff`                         | `#000000`           | 21.0 : 1   | Sí     |
| `clasico` | `proyectil`         | `#ffffff`                         | `#000000`           | 21.0 : 1   | Sí     |
| `clasico` | `acento`            | `#00ffff`                         | `#000000`           | 16.75 : 1  | Sí     |
| `clasico` | `peligro`           | `#ff8200` (85% alpha)             | `#000000`           | ≈ 7.9 : 1  | Sí     |
| `clasico` | `hud`               | `#ffffff`                         | `#000000`           | 21.0 : 1   | Sí     |
| `clasico` | `overlay`           | `#ffffff`                         | `#000000`           | 21.0 : 1   | Sí     |
| `clasico` | `textoHud`          | `#ffffff` (65% alpha s/negro)     | `#000000`           | ≈ 15.9 : 1 | Sí     |
| `neon`    | `entidadPrincipal`  | `#00f5ff`                         | `#0a0a0f`           | 14.59 : 1  | Sí     |
| `neon`    | `entidadSecundaria` | `#ff006e`                         | `#0a0a0f`           | 5.15 : 1   | Sí     |
| `neon`    | `proyectil`         | `#f5ff00`                         | `#0a0a0f`           | 18.05 : 1  | Sí     |
| `neon`    | `acento`            | `#00ff88`                         | `#0a0a0f`           | 14.73 : 1  | Sí     |
| `neon`    | `peligro`           | `#ff6a00`                         | `#0a0a0f`           | 6.88 : 1   | Sí     |
| `neon`    | `hud`               | `#00f5ff`                         | `#0a0a0f`           | 14.59 : 1  | Sí     |
| `neon`    | `overlay`           | `#f5ff00`                         | `#0a0a0f`           | 18.05 : 1  | Sí     |
| `neon`    | `textoHud`          | `#ffffff` (75% alpha s/`#0a0a0f`) | `#0a0a0f`           | 11.07 : 1  | Sí     |
| `retro`   | `entidadPrincipal`  | `#33ff66`                         | `#001505`           | 14.09 : 1  | Sí     |
| `retro`   | `entidadSecundaria` | `#1f9a44`                         | `#001505`           | 5.20 : 1   | Sí     |
| `retro`   | `proyectil`         | `#baffcb`                         | `#001505`           | 16.45 : 1  | Sí     |
| `retro`   | `acento`            | `#ffb000`                         | `#001505`           | 10.33 : 1  | Sí     |
| `retro`   | `peligro`           | `#d92a00`                         | `#001505`           | 3.86 : 1   | Sí     |
| `retro`   | `hud`               | `#33ff66`                         | `#001505`           | 14.09 : 1  | Sí     |
| `retro`   | `overlay`           | `#ffb000`                         | `#001505`           | 10.33 : 1  | Sí     |
| `retro`   | `textoHud`          | `#1f9a44`                         | `#001505`           | 5.20 : 1   | Sí     |

Todos los roles de `neon` y `retro` se verifican también contra `--bg #0a0a0f` (el fondo real del sitio detrás de `.crt`); en ambas skins `fondo` **es** ese color o uno más oscuro, por lo que el ratio contra `--bg` coincide o mejora el de la tabla. `clasico` se verifica contra `#000000` (su propio fondo, que es más oscuro que `--bg`, así que cualquier ratio que pase ahí también pasa contra `--bg`).

**Distinción en escala de grises (retro, roles adyacentes en pantalla):**

- Nave (`entidadPrincipal` L≈0.732) vs asteroide (`entidadSecundaria` L≈0.238): diferencia de luminancia amplia, se distinguen sin color.
- Asteroide (`entidadSecundaria` L≈0.238) vs llama del propulsor (`peligro` L≈0.164): ambos verdes/rojos oscuros pero con ~30% de diferencia de brillo; no aparecen superpuestos en el mismo trazo (la llama sale de la popa de la nave, no del asteroide), por lo que el solape visual es bajo. Documentado como riesgo menor abajo.
- Bala (`proyectil` L≈0.863) es el elemento más brillante de la escena — se distingue de cualquier otro rol incluso en escala de grises.

---

## Plan de implementación

### Paso 1 — `lib/games/skins.ts`

Crear el archivo (primer juego que pasa por este flujo). Exporta `SkinId`, `GameId`, `GamePalette` (con los 10 roles de Asteroides — sin `rejilla`), `SKINS` con solo la entrada `asteroides` poblada con las 3 tablas de arriba, `DEFAULT_SKIN = "clasico"` y `getPalette(gameId, skinId)`: si `SKINS[gameId]` no existe o `SKINS[gameId][skinId]` no existe, retorna `SKINS[gameId]?.clasico` o, si el juego tampoco tiene entrada, `undefined` (el llamador decide el fallback — en Asteroides siempre existe `clasico`).

### Paso 2 — Extender `lib/games/types.ts`

`EngineFactory` pasa a `(canvas: HTMLCanvasElement, callbacks: EngineCallbacks, palette?: GamePalette) => Engine`. `Engine` gana `setPalette?: (palette: GamePalette) => void`. Ambos cambios son aditivos/opcionales — Tetris, Arkanoid y Snake siguen compilando sin tocarlos porque ignoran el tercer parámetro y no implementan `setPalette`.

### Paso 3 — Migrar `lib/games/asteroides/engine.ts`

Sustituir cada literal de color por `palette.<rol>` según el inventario de roles. `createAsteroidesEngine(canvas, callbacks, palette = getPalette("asteroides", "clasico"))` guarda la paleta en una variable mutable del closure; `setPalette(next)` la reasigna sin tocar el estado de la partida (nave, asteroides, puntaje siguen igual — solo cambian los `fillStyle`/`strokeStyle` del próximo frame). Ningún otro engine se toca.

### Paso 4 — Selector de skin en `components/game-player.tsx`

Estado `const [skin, setSkin] = useState<SkinId>(...)` inicializado desde `localStorage.getItem("av_skin")` (fallback `DEFAULT_SKIN`), persistido en cada cambio (mismo patrón que `av_user`/`av_scores`). Tres botones `.btn` (`CLÁSICO` / `NEÓN` / `RETRO`) junto a `PAUSA`/`FIN`/`SALIR`, visibles solo si `SKINS[game.id]` existe. Al cambiar de skin con la partida activa, se llama `engineRef.current?.setPalette(getPalette(game.id, next))` si el método existe; si el engine aún no lo implementa (Tetris/Arkanoid/Snake en este momento), el selector no se muestra para esos juegos porque no tienen entrada en `SKINS`.

### Paso 5 — Verificación manual

`npm run dev`, jugar `/juegos/asteroides/jugar` en las 3 skins: confirmar que el cambio de skin no reinicia la partida ni el puntaje, que los colores coinciden con la tabla de este spec, y que `clasico` es visualmente idéntico al comportamiento previo a este spec (captura de referencia antes/después).

### Paso 6 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

- [x] `lib/games/skins.ts` exporta `SkinId`, `GameId`, `GamePalette`, `SKINS`, `DEFAULT_SKIN`, `getPalette`, con solo `asteroides` poblado en `SKINS`.
- [x] `lib/games/types.ts` acepta `palette?` en `EngineFactory` y `setPalette?` en `Engine` sin romper la compilación de Tetris/Arkanoid/Snake.
- [x] `lib/games/asteroides/engine.ts` no tiene ningún literal de color hardcodeado — todos vienen de `palette.<rol>`.
- [x] `createAsteroidesEngine` sin tercer argumento sigue funcionando exactamente igual que antes de este spec (paleta `clasico` por defecto).
- [x] `setPalette` cambia los colores del siguiente frame sin reiniciar nave/asteroides/puntaje.
- [x] El selector de skin aparece en `/juegos/asteroides/jugar` y **no** aparece en `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar`, `/juegos/snake/jugar`.
- [x] La skin elegida persiste en `localStorage` (`av_skin`) entre partidas y recargas.
- [x] Los 24 pares color/fondo de la tabla de contraste cumplen su umbral (4.5:1 texto, 3:1 entidad).
- [x] Ningún fondo de skin usa negro puro `#000000` excepto `clasico` (desviación documentada y aceptada).
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores nuevos.

---

## Decisiones tomadas y descartadas

### `fondo: #000000` se mantiene en `clasico` pese a la regla de "nada de negro puro"

- **Sí:** el mandato explícito de `clasico` es ser un cambio visualmente nulo respecto al engine actual — el engine hoy dibuja `#000` y cambiarlo sería alterar el comportamiento que esta skin existe para preservar.
- **No:** forzar `clasico` a `#0a0a0f` como las otras dos — hubiera sido más "correcto" según la regla general, pero rompe la garantía de que `clasico` prueba que el refactor no cambia nada visualmente.

### `proyectil` y `particula` como roles extra de `GamePalette`, fuera de los 9 roles base

- **Sí:** Asteroides dibuja balas y partículas de explosión con colores propios que no encajan limpiamente en ningún rol base (no son "entidad" jugable ni "acento"); agregarlos como roles explícitos evita forzar un mapeo artificial.
- **No:** reutilizar `entidadPrincipal` para las balas — habría acoplado el color de la nave al de sus propios disparos, quitando flexibilidad a `neon`/`retro` para diferenciarlos (como sí se hace: balas amarillas/menta vs. nave cian/verde).

### `peligro` mapeado a la llama del propulsor, no a un concepto de "vidas bajas" o similar

- **Sí:** es el único elemento del engine actual con connotación de "energía/riesgo" visual (fuego), y el rol base `peligro` no tenía un uso obvio en este juego sin inventar una mecánica nueva.
- **No:** dejar `peligro` sin uso en Asteroides — el spec exige que las 3 skins definan hex concretos para todos los roles declarados en `GamePalette`; omitirlo habría dejado un rol fantasma sin consumidor.

### Sin variante de skin para `.cover-asteroides`

- **Sí:** la portada es estática (biblioteca/detalle) y no refleja la skin elegida en el reproductor — extenderla habría requerido sincronizar `localStorage` con un server component, fuera del alcance de un cambio de paleta del motor.
- **No:** portada dinámica por skin — se declara explícitamente Fuera de alcance, disponible como spec futuro si se pide.

### `GameId` como unión cerrada de los 4 ids actuales, no `Game["id"]` (string)

- **Sí:** `Record<GameId, Record<SkinId, GamePalette>>` necesita claves conocidas en tiempo de compilación para que TypeScript exija completar `SKINS` a medida que se agregan juegos; un `string` genérico no daría ese chequeo.
- **No:** usar `string` y validar en runtime — perdería el chequeo estático que hace que agregar un juego nuevo sin su entrada en `SKINS` sea un error de compilación, no un bug silencioso.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                            | Mitigación                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clasico` con `fondo: #000000` sigue chocando visualmente con `.crt` según la regla general de legibilidad, aunque se documenta como desviación aceptada.                                                                                                         | Verificación manual del Paso 5 confirma que el efecto CRT (scanlines/glow del contenedor) sigue siendo legible sobre negro puro, igual que hoy antes de este spec — no es una regresión, es el estado actual.                                      |
| En `retro`, `peligro` (llama, L≈0.164) y `entidadSecundaria` (asteroide, L≈0.238) tienen luminancias relativamente cercanas (~30% de diferencia).                                                                                                                 | Ambos elementos rara vez se superponen en pantalla (la llama sale de la popa de la nave, no del cuerpo del asteroide); si en verificación manual se ve confuso, ajustar `peligro` a un tono aún más oscuro sin bajar de 3:1 contra `#001505`.      |
| `setPalette` cambia colores a mitad de partida — si algún componente (`Bullet`, `Asteroid`, `Particle`) cachea su propio color en el constructor en vez de leerlo de `palette` en cada `draw()`, el cambio de skin no se reflejaría hasta la siguiente instancia. | El Paso 3 exige leer `palette.<rol>` dentro de cada método `draw()`, nunca cachear el color en el constructor de las clases internas del engine.                                                                                                   |
| Doble montaje en desarrollo (React `StrictMode`) podría dejar un `setPalette` aplicado a un engine ya destruido si el efecto de `game-player.tsx` no limpia la referencia a tiempo.                                                                               | `engineRef.current` se pone en `null` en el cleanup del `useEffect` existente (ya implementado); el selector de skin debe usar optional chaining (`engineRef.current?.setPalette(...)`) para no fallar si el engine aún no montó o ya se desmontó. |
| Deuda conocida heredada (no se arregla en esta spec): `game.best`/`game.plays` no sincronizados con Supabase; sin `preventDefault()` en teclado; `insertScore` falla en silencio.                                                                                 | Aceptado como riesgo conocido, igual que en specs anteriores — no forma parte del alcance de este cambio de paletas.                                                                                                                               |

---

## Qué **no** está en esta spec

- Skins de Tetris, Arkanoid o Snake — cada uno tendrá su propio `specs/NN-skins-<id>.md` reutilizando `lib/games/skins.ts` y los tipos ya extendidos aquí.
- Variantes de `.cover-asteroides` por skin.
- Controles táctiles, autenticación real, Supabase Realtime.
- Sonido o efectos distintos por skin.
- Sincronizar `game.best`/`game.plays` con datos reales.
- Cualquier cambio a la lógica de juego de Asteroides (física, puntaje, power-ups, colisiones) — este spec toca únicamente color.

Cada uno de estos, si se necesita, va en su propia spec.
