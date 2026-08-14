# SPEC 13 — Skins de Arkanoid (clasico / neon / retro)

> **Estado:** Implementado
> **Depende de:** SPEC 08 (motor real de Arkanoid), SPEC 11 (infraestructura genérica de skins — `lib/games/skins.ts`, extensión de `EngineFactory`/`Engine`)
> **Fecha:** 2026-08-14
> **Objetivo:** Permitir elegir entre 3 paletas visuales (`clasico`, `neon`, `retro`) para el motor de Arkanoid sin alterar su lógica de juego, reutilizando la infraestructura de skins ya creada en SPEC 11 y extendiendo `GamePalette` con los roles propios de un juego basado en sprites (paleta, pelota y 7 colores de bloque) en vez de dibujo vectorial.

---

## Alcance

**Dentro:**

1. **`lib/games/skins.ts` (existente, se extiende, no se recrea)**: agregar a `GamePalette` 8 campos **opcionales** propios de Arkanoid (`tinteSprites?`, `bloqueRojo?`, `bloqueAmarillo?`, `bloqueCyan?`, `bloqueMagenta?`, `bloqueRosa?`, `bloqueVerde?`, `bloqueGris?`) sin tocar los 10 campos existentes (siguen siendo obligatorios, Asteroides no se toca). Agregar la entrada `arkanoid` a `SKINS` con las 3 paletas de este spec.
2. **`lib/games/types.ts`**: sin cambios — `EngineFactory`/`Engine` ya aceptan `palette?`/`setPalette?` desde SPEC 11.
3. **`lib/games/arkanoid/engine.ts`**: sustituir cada literal de color por `palette.<rol>` según el inventario de roles de este spec. Los bloques y explosiones, al venir de un spritesheet (`sprites.ts`), no se recolorean cambiando literales de `fillStyle` sino aplicando un **tinte sobre sprite** (técnica descrita en el Paso 3) cuando `palette.tinteSprites` es `true`; en `clasico` (`tinteSprites: false`) el sprite se dibuja igual que hoy, sin tinte. `createArkanoidEngine` recibe la paleta como tercer parámetro opcional, con `getPalette("arkanoid", "clasico")` como valor por defecto. Implementa `setPalette` para cambiar de skin sin perder la partida en curso.
4. **`components/game-player.tsx`**: **sin cambios** — el selector de skin, la persistencia en `localStorage` (`av_skin`) y el paso de `getPalette(game.id, skin)` al motor ya son genéricos desde SPEC 11 (`hasSkins = Boolean(SKINS[game.id as GameId])`); en cuanto `SKINS.arkanoid` exista, el selector aparece automáticamente en `/juegos/arkanoid/jugar` sin tocar este archivo.
5. **Verificación manual**: Arkanoid jugado en las 3 skins (paleta, pelota, los 7 colores de bloque, HUD, overlays de fin de partida y pausa con selector de nivel), confirmando legibilidad y que el cambio de skin no reinicia la partida.

**Fuera de alcance (para specs futuros o ya declarado fuera desde SPEC 11):**

- Skins de Tetris y Snake — specs propios `NN-skins-tetris.md` / `NN-skins-snake.md`.
- Variantes de `.cover-arkanoid` en `app/globals.css` — la portada de biblioteca/detalle no cambia con la skin elegida en el reproductor (ya declarado fuera de alcance en SPEC 11, se reafirma aquí).
- Recolorear el velo de atenuación (`rgba(0,0,0,0.6)`/`rgba(0,0,0,0.65)`) de los overlays de fin de partida y pausa — se mantiene fijo en negro para las 3 skins (ver "Decisiones tomadas y descartadas").
- Recolorear los botones de selección de nivel del overlay de pausa salvo el resaltado del nivel activo (`palette.acento`) — el resto de su cromática (relleno inactivo, borde, texto) se mantiene fija, es UI de control, no identidad visual del juego.
- Sonido o efectos distintos por skin.
- Controles táctiles, autenticación real, Supabase Realtime — deuda ya documentada en specs previas.
- Cualquier cambio a la lógica de juego de Arkanoid (física, puntaje, niveles, colisiones) — este spec toca únicamente color.

---

## Inventario de roles de color (Arkanoid)

Grep de `lib/games/arkanoid/engine.ts`: a diferencia de Asteroides (dibujo 100% vectorial), Arkanoid dibuja paleta, pelota, bloques y explosiones **desde un spritesheet** (`lib/games/arkanoid/sprites.ts` + `public/arkanoid/spritesheet-breakout.png`), por lo que esos 3 elementos no tienen un `fillStyle`/`strokeStyle` que sustituir directamente — se recolorean con la técnica de tinte del Paso 3. `rejilla` no aplica (el tablero de bloques no es una grilla de fondo dibujada; los bloques son sprites individuales posicionados).

| Rol (`GamePalette`)                                                                                                      | Uso en el engine actual                                                                                                                                                       | Origen (línea aprox.)                              |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `fondo`                                                                                                                  | `fillRect` de limpieza de pantalla en `draw()` (`ctx.fillStyle = "#000"`)                                                                                                     | L342                                               |
| `entidadPrincipal`                                                                                                       | Tinte de la paleta (`drawPaddleSprite`) cuando `tinteSprites` es `true`                                                                                                       | L362                                               |
| `entidadSecundaria`                                                                                                      | Tinte de la pelota (`drawBallSprite`), incluidos los íconos de vidas del HUD que reusan el mismo sprite                                                                       | L363, L377                                         |
| `acento`                                                                                                                 | Relleno del botón de nivel **activo** en el selector del overlay de pausa (antes `"#f0c040"` fijo)                                                                            | L322                                               |
| `peligro`                                                                                                                | **Declarado, no consumido** por el motor de Arkanoid (ver Decisiones) — heredado de `GamePalette` porque Asteroides lo requiere como campo obligatorio                        | —                                                  |
| `hud`                                                                                                                    | Texto `Score:` / `Nivel:` del HUD en pantalla                                                                                                                                 | L366, L372                                         |
| `overlay`                                                                                                                | Título `"GAME OVER"` / `"¡Completaste el juego!"` y título `"PAUSA"`                                                                                                          | L299, L314                                         |
| `textoHud`                                                                                                               | Subtítulo `"Saltar al nivel:"` del overlay de pausa                                                                                                                           | L317                                               |
| `proyectil`                                                                                                              | **Declarado, no consumido** — heredado de `GamePalette`                                                                                                                       | —                                                  |
| `particula`                                                                                                              | **Declarado, no consumido** — heredado de `GamePalette`                                                                                                                       | —                                                  |
| `tinteSprites` _(extra, `boolean`)_                                                                                      | Interruptor: si es `true`, paleta/pelota/bloques/explosiones se dibujan con tinte de color; si es `false` (caso `clasico`), se dibujan igual que hoy, sin ningún tinte        | —                                                  |
| `bloqueRojo` / `bloqueAmarillo` / `bloqueCyan` / `bloqueMagenta` / `bloqueRosa` / `bloqueVerde` / `bloqueGris` _(extra)_ | Tinte de cada bloque y de su explosión, mapeados 1:1 a `BlockColor` (`red`/`yellow`/`cyan`/`magenta`/`hotpink`/`green`/`gray` de `levels.ts`) cuando `tinteSprites` es `true` | `drawBlockSprite`/`drawExplosionFrame`, L346, L351 |

---

## Las 3 skins

### `clasico` (default — idéntico al engine actual)

| Rol                 | Hex / valor | Notas                                                                                                                                      |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `fondo`             | `#000000`   | Igual al `"#000"` que dibuja hoy el motor                                                                                                  |
| `entidadPrincipal`  | `#e6e6e6`   | Referencia visual del sprite de la paleta (blanco/plateado); `tinteSprites: false` → **no se aplica**, el sprite se dibuja tal cual el PNG |
| `entidadSecundaria` | `#c9c9c9`   | Referencia visual del sprite de la pelota (gris claro); tampoco se aplica                                                                  |
| `acento`            | `#f0c040`   | Igual al `"#f0c040"` del botón de nivel activo hoy                                                                                         |
| `peligro`           | `#ff8200`   | Heredado de la paleta `clasico` de Asteroides, no consumido por Arkanoid                                                                   |
| `hud`               | `#ffffff`   | Igual al `"#fff"` del HUD hoy                                                                                                              |
| `overlay`           | `#ffffff`   | Igual al `"#fff"` de los títulos hoy                                                                                                       |
| `textoHud`          | `#ffffff`   | Igual al `"#fff"` del subtítulo hoy (a diferencia de Asteroides, el engine actual de Arkanoid no atenúa este texto con alpha)              |
| `proyectil`         | `#ffffff`   | Heredado, no consumido                                                                                                                     |
| `particula`         | `#ffffff`   | Heredado, no consumido                                                                                                                     |
| `tinteSprites`      | `false`     | Los sprites se dibujan sin recolorear — comportamiento idéntico al actual                                                                  |
| `bloqueRojo`        | `#e63946`   | Referencia visual del sprite rojo del spritesheet; no se aplica (`tinteSprites: false`)                                                    |
| `bloqueAmarillo`    | `#e8a33d`   | Referencia visual del sprite amarillo/naranja                                                                                              |
| `bloqueCyan`        | `#4a90d9`   | Referencia visual del sprite cian (tiende a azul)                                                                                          |
| `bloqueMagenta`     | `#7b68c9`   | Referencia visual del sprite magenta (tiende a violeta)                                                                                    |
| `bloqueRosa`        | `#e069a6`   | Referencia visual del sprite `hotpink`                                                                                                     |
| `bloqueVerde`       | `#5cb85c`   | Referencia visual del sprite verde                                                                                                         |
| `bloqueGris`        | `#8c8c9c`   | Referencia visual del sprite gris                                                                                                          |

**Nota sobre las referencias de `clasico`:** como `tinteSprites` es `false`, estos hex **no se leen** en el frame dibujado — documentan el color aproximado que ya produce el PNG (`public/arkanoid/spritesheet-breakout.png`), muestreado visualmente, para que la tabla de contraste de abajo tenga un valor concreto que verificar y para dejar un valor de referencia por si un futuro spec necesita un fallback en flat-color (p. ej. si el spritesheet no carga).

### `neon` (tokens del sitio + tinte de sprites)

Fondo alineado a `--bg #0a0a0f` (no negro puro, evita el choque con `.crt`). `tinteSprites: true` en las 3 skins salvo `clasico`.

| Rol                 | Hex / valor                 | Notas                                                                                                     |
| ------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `fondo`             | `#0a0a0f`                   | = `--bg` del sitio                                                                                        |
| `entidadPrincipal`  | `#00f5ff` (`--cyan`)        | Paleta, con tinte + `shadowBlur` ~10                                                                      |
| `entidadSecundaria` | `#f5ff00` (`--yellow`)      | Pelota (e íconos de vidas), tono distinto de la paleta                                                    |
| `acento`            | `#00ff88` (`--green`)       | Botón de nivel activo en la pausa                                                                         |
| `peligro`           | `#ff6a00`                   | Heredado de la paleta `neon` de Asteroides, no consumido                                                  |
| `hud`               | `#00f5ff` (`--cyan`)        | Texto `Score`/`Nivel`                                                                                     |
| `overlay`           | `#f5ff00` (`--yellow`)      | Títulos "GAME OVER"/"PAUSA", máximo contraste                                                             |
| `textoHud`          | `rgba(255, 255, 255, 0.75)` | Subtítulo "Saltar al nivel:"                                                                              |
| `proyectil`         | `#f5ff00`                   | Heredado, no consumido                                                                                    |
| `particula`         | `rgba(255, 255, 255, 0.9)`  | Heredado, no consumido                                                                                    |
| `tinteSprites`      | `true`                      | Paleta, pelota, bloques y explosiones se recolorean (Paso 3)                                              |
| `bloqueRojo`        | `#ff5a3a`                   |                                                                                                           |
| `bloqueAmarillo`    | `#ffcc00`                   |                                                                                                           |
| `bloqueCyan`        | `#1499a6`                   | Teal oscuro, deliberadamente distinto del cian brillante de la paleta para no confundir bloque con paleta |
| `bloqueMagenta`     | `#ff006e` (`--magenta`)     |                                                                                                           |
| `bloqueRosa`        | `#ff8fbf`                   |                                                                                                           |
| `bloqueVerde`       | `#7dffb2`                   |                                                                                                           |
| `bloqueGris`        | `#5c5c70`                   |                                                                                                           |

El tinte (`shadowBlur` decorativo) no es necesario para la legibilidad: todos los roles ya cumplen el mínimo de contraste sin animación ni parpadeo, respetando `prefers-reduced-motion`.

### `retro` (CRT fósforo ámbar, sin glow, distinguible por brillo)

Fósforo ámbar en vez del verde usado en Asteroides — diferencia visual entre juegos del catálogo dentro de la misma convención CRT. Fondo `#150a00` (ámbar casi negro, no negro puro).

| Rol                 | Hex / valor | Notas                                                                                                                                                                                 |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fondo`             | `#150a00`   | Ámbar casi negro                                                                                                                                                                      |
| `entidadPrincipal`  | `#ffb000`   | Paleta — ámbar brillante                                                                                                                                                              |
| `entidadSecundaria` | `#fff2c2`   | Pelota — el elemento más brillante de la escena                                                                                                                                       |
| `acento`            | `#ff7a00`   | Botón de nivel activo — naranja, segundo tono distinguible del ámbar ambiente                                                                                                         |
| `peligro`           | `#b34700`   | Heredado de la paleta `retro` de Asteroides (adaptado a ámbar), no consumido                                                                                                          |
| `hud`               | `#ffb000`   | Texto `Score`/`Nivel`                                                                                                                                                                 |
| `overlay`           | `#ffb000`   | Títulos "GAME OVER"/"PAUSA"                                                                                                                                                           |
| `textoHud`          | `#b3792a`   | Subtítulo, ámbar más tenue que el HUD                                                                                                                                                 |
| `proyectil`         | `#fff2c2`   | Heredado, no consumido                                                                                                                                                                |
| `particula`         | `#ffe9b3`   | Heredado, no consumido                                                                                                                                                                |
| `tinteSprites`      | `true`      |                                                                                                                                                                                       |
| `bloqueRojo`        | `#ff5030`   |                                                                                                                                                                                       |
| `bloqueAmarillo`    | `#ffb000`   | Comparte tono con la paleta/HUD — ver "Riesgos identificados"                                                                                                                         |
| `bloqueCyan`        | `#ffe9b3`   | El bloque "frío" se resuelve como crema pálido (el tono más brillante de los 7 bloques) dentro de la familia ámbar                                                                    |
| `bloqueMagenta`     | `#a05a2a`   |                                                                                                                                                                                       |
| `bloqueRosa`        | `#ff7a52`   |                                                                                                                                                                                       |
| `bloqueVerde`       | `#5c8a35`   | Verde oliva desaturado — única desviación de la familia ámbar pura, necesaria para que el bloque "verde" siga siendo identificable como tal sin colisionar en brillo con `bloqueRojo` |
| `bloqueGris`        | `#7a5a3a`   |                                                                                                                                                                                       |

`image-rendering: pixelated` sí aplica aquí (a diferencia de Asteroides): Arkanoid ya dibuja sprites de un PNG; el canvas conserva su tratamiento pixelado actual, el tinte no lo altera.

---

## Tabla de contraste (WCAG, luminancia relativa)

Umbral: **4.5:1** para texto de HUD (`hud`, `overlay`, `textoHud`), **3:1** para entidades jugables (`entidadPrincipal`, `entidadSecundaria`, `acento`, y los 7 `bloque*`). `--bg` del sitio es `#0a0a0f` (L = 0.00316); cada skin se verifica contra su propio `fondo`, que es igual o más oscuro que `--bg`.

| Skin      | Rol                        | Color                             | Fondo de referencia | Ratio     | ¿Pasa? |
| --------- | -------------------------- | --------------------------------- | ------------------- | --------- | ------ |
| `clasico` | `entidadPrincipal` (ref.)  | `#e6e6e6`                         | `#000000`           | 16.83 : 1 | Sí     |
| `clasico` | `entidadSecundaria` (ref.) | `#c9c9c9`                         | `#000000`           | 12.68 : 1 | Sí     |
| `clasico` | `acento`                   | `#f0c040`                         | `#000000`           | 12.32 : 1 | Sí     |
| `clasico` | `hud`                      | `#ffffff`                         | `#000000`           | 21.0 : 1  | Sí     |
| `clasico` | `overlay`                  | `#ffffff`                         | `#000000`           | 21.0 : 1  | Sí     |
| `clasico` | `textoHud`                 | `#ffffff`                         | `#000000`           | 21.0 : 1  | Sí     |
| `clasico` | `bloqueRojo` (ref.)        | `#e63946`                         | `#000000`           | 5.04 : 1  | Sí     |
| `clasico` | `bloqueAmarillo` (ref.)    | `#e8a33d`                         | `#000000`           | 9.74 : 1  | Sí     |
| `clasico` | `bloqueCyan` (ref.)        | `#4a90d9`                         | `#000000`           | 6.28 : 1  | Sí     |
| `clasico` | `bloqueMagenta` (ref.)     | `#7b68c9`                         | `#000000`           | 4.67 : 1  | Sí     |
| `clasico` | `bloqueRosa` (ref.)        | `#e069a6`                         | `#000000`           | 6.74 : 1  | Sí     |
| `clasico` | `bloqueVerde` (ref.)       | `#5cb85c`                         | `#000000`           | 8.47 : 1  | Sí     |
| `clasico` | `bloqueGris` (ref.)        | `#8c8c9c`                         | `#000000`           | 6.35 : 1  | Sí     |
| `neon`    | `entidadPrincipal`         | `#00f5ff`                         | `#0a0a0f`           | 14.58 : 1 | Sí     |
| `neon`    | `entidadSecundaria`        | `#f5ff00`                         | `#0a0a0f`           | 18.05 : 1 | Sí     |
| `neon`    | `acento`                   | `#00ff88`                         | `#0a0a0f`           | 14.73 : 1 | Sí     |
| `neon`    | `hud`                      | `#00f5ff`                         | `#0a0a0f`           | 14.58 : 1 | Sí     |
| `neon`    | `overlay`                  | `#f5ff00`                         | `#0a0a0f`           | 18.05 : 1 | Sí     |
| `neon`    | `textoHud`                 | `#ffffff` (75% alpha s/`#0a0a0f`) | `#0a0a0f`           | 11.07 : 1 | Sí     |
| `neon`    | `bloqueRojo`               | `#ff5a3a`                         | `#0a0a0f`           | 6.37 : 1  | Sí     |
| `neon`    | `bloqueAmarillo`           | `#ffcc00`                         | `#0a0a0f`           | 13.06 : 1 | Sí     |
| `neon`    | `bloqueCyan`               | `#1499a6`                         | `#0a0a0f`           | 5.77 : 1  | Sí     |
| `neon`    | `bloqueMagenta`            | `#ff006e`                         | `#0a0a0f`           | 5.15 : 1  | Sí     |
| `neon`    | `bloqueRosa`               | `#ff8fbf`                         | `#0a0a0f`           | 9.34 : 1  | Sí     |
| `neon`    | `bloqueVerde`              | `#7dffb2`                         | `#0a0a0f`           | 15.82 : 1 | Sí     |
| `neon`    | `bloqueGris`               | `#5c5c70`                         | `#0a0a0f`           | 3.03 : 1  | Sí     |
| `retro`   | `entidadPrincipal`         | `#ffb000`                         | `#150a00`           | 10.66 : 1 | Sí     |
| `retro`   | `entidadSecundaria`        | `#fff2c2`                         | `#150a00`           | 17.42 : 1 | Sí     |
| `retro`   | `acento`                   | `#ff7a00`                         | `#150a00`           | 7.47 : 1  | Sí     |
| `retro`   | `hud`                      | `#ffb000`                         | `#150a00`           | 10.66 : 1 | Sí     |
| `retro`   | `overlay`                  | `#ffb000`                         | `#150a00`           | 10.66 : 1 | Sí     |
| `retro`   | `textoHud`                 | `#b3792a`                         | `#150a00`           | 5.29 : 1  | Sí     |
| `retro`   | `bloqueRojo`               | `#ff5030`                         | `#150a00`           | 5.99 : 1  | Sí     |
| `retro`   | `bloqueAmarillo`           | `#ffb000`                         | `#150a00`           | 10.66 : 1 | Sí     |
| `retro`   | `bloqueCyan`               | `#ffe9b3`                         | `#150a00`           | 16.33 : 1 | Sí     |
| `retro`   | `bloqueMagenta`            | `#a05a2a`                         | `#150a00`           | 3.71 : 1  | Sí     |
| `retro`   | `bloqueRosa`               | `#ff7a52`                         | `#150a00`           | 7.59 : 1  | Sí     |
| `retro`   | `bloqueVerde`              | `#5c8a35`                         | `#150a00`           | 4.78 : 1  | Sí     |
| `retro`   | `bloqueGris`               | `#7a5a3a`                         | `#150a00`           | 3.12 : 1  | Sí     |

Los overlays de fin de partida y de pausa dibujan su texto sobre un velo `rgba(0,0,0,0.6)`/`rgba(0,0,0,0.65)` que **no cambia por skin** (ver Decisiones); el caso realista (velo sobre el `fondo` propio de la escena, ya mayormente oscuro) da los mismos ratios de `overlay`/`textoHud` de la tabla de arriba (`clasico` 21.0:1, `neon` 18.05:1/11.07:1, `retro` 10.66:1/5.29:1) — todos por encima de 4.5:1.

**Distinción en escala de grises (roles adyacentes en pantalla, los 7 bloques pueden coexistir en un mismo nivel):**

- `neon`: orden de luminancia de menor a mayor — `bloqueGris` (0.111) → `bloqueMagenta` (0.224) → `bloqueCyan` (0.257) → `bloqueRojo` (0.289) → `bloqueRosa` (0.447) → `bloqueAmarillo` (0.645) → `bloqueVerde` (0.791). El paso más cerrado es `bloqueCyan`/`bloqueRojo` (~12% de diferencia relativa); ambos tienen matices muy distintos (teal vs. naranja-rojo) por lo que en color se distinguen con claridad, y el riesgo se limita a un eventual modo de escala de grises. Documentado como riesgo menor abajo.
- `retro`: orden de luminancia — `bloqueGris` (0.118) → `bloqueMagenta` (0.150, +27%) → `bloqueVerde` (0.207, +38%) → `bloqueRojo` (0.272, +31%) → `bloqueRosa` (0.358, +32%) → `bloqueAmarillo`/`entidadPrincipal`/`hud` (0.523, +46%) → `bloqueCyan` (0.828, +58%). Todos los pasos superan el 25% de diferencia relativa, buena distinción incluso en escala de grises.
- `retro`: `bloqueAmarillo` comparte el hex exacto de `entidadPrincipal`/`hud`/`overlay` (`#ffb000`). Es un riesgo menor: bloques y paleta no ocupan la misma región de pantalla simultáneamente (bloques arriba, paleta abajo), así que el solape visual real es bajo. Documentado abajo.
- `clasico`: no se evalúa la distinción en escala de grises de los bloques porque los hex documentados son referencias visuales del PNG, no colores aplicados por el motor; el spritesheet original ya distingue sus 7 franjas de color en producción (juego existente, sin regresión introducida por este spec).

---

## Plan de implementación

### Paso 1 — Extender `lib/games/skins.ts`

Agregar a `GamePalette` los 8 campos opcionales de Arkanoid (`tinteSprites?: boolean`, `bloqueRojo?: string`, `bloqueAmarillo?: string`, `bloqueCyan?: string`, `bloqueMagenta?: string`, `bloqueRosa?: string`, `bloqueVerde?: string`, `bloqueGris?: string`). Los 10 campos existentes (`fondo`…`textoHud`, `proyectil`, `particula`) **no se tocan** — Asteroides sigue compilando igual. Agregar la entrada `arkanoid: { clasico: {...}, neon: {...}, retro: {...} }` a `SKINS` con las 3 tablas de arriba. `getPalette("arkanoid", skinId)` ya funciona sin cambios adicionales (misma función genérica de SPEC 11).

### Paso 2 — `lib/games/types.ts`

Sin cambios: `EngineFactory`/`Engine` ya soportan `palette?`/`setPalette?` desde SPEC 11.

### Paso 3 — Migrar `lib/games/arkanoid/engine.ts`

1. `createArkanoidEngine(canvas, callbacks, palette = getPalette("arkanoid", "clasico")!)` guarda la paleta en una variable mutable del closure; `setPalette(next)` la reasigna sin tocar el estado de la partida (paleta, pelota, bloques vivos, puntaje siguen igual — solo cambia el `fillStyle`/tinte del próximo frame).
2. Sustituir literales directos:
   - `draw()`: `ctx.fillStyle = "#000"` → `ctx.fillStyle = palette.fondo`.
   - HUD (`Score:`/`Nivel:`): `"#fff"` → `palette.hud`.
   - `drawOverlay()`: título `"#fff"` → `palette.overlay` (el velo `rgba(0,0,0,0.6)` no cambia, ver Decisiones).
   - `drawPauseOverlay()`: título "PAUSA" `"#fff"` → `palette.overlay`; subtítulo "Saltar al nivel:" `"#fff"` → `palette.textoHud`; relleno del botón de nivel **activo** `"#f0c040"` → `palette.acento` (el resto de la cromática del selector de nivel —relleno inactivo `#444`, borde `#fff`, texto `#000`/`#fff`— se mantiene fija, ver Decisiones); el velo `rgba(0,0,0,0.65)` no cambia.
3. Agregar un helper `drawTinted(ctx, drawFn, color, w, h, x, y)` en `sprites.ts` o directamente en `engine.ts`: dibuja el sprite en un canvas offscreen del tamaño del destino, aplica `globalCompositeOperation = "source-atop"` con `fillStyle = color` y `globalAlpha = 0.6` (recolorea preservando la silueta y el sombreado propio del sprite), y copia el resultado al canvas principal con `drawImage`. Si `palette.tinteSprites` es falso (`clasico`) o `color` es `undefined`, se omite el tinte y se llama directamente a `drawPaddleSprite`/`drawBallSprite`/`drawBlockSprite`/`drawExplosionFrame` como hoy — comportamiento idéntico al actual.
4. Envolver las 4 llamadas a sprites con la lógica de tinte:
   - `drawPaddleSprite` → tinte con `palette.entidadPrincipal`.
   - `drawBallSprite` (paleta y también los íconos de vidas del HUD) → tinte con `palette.entidadSecundaria`.
   - `drawBlockSprite(color, ...)` → tinte con `palette[<bloqueRol correspondiente a BlockColor>]` (mapeo `red→bloqueRojo`, `yellow→bloqueAmarillo`, `cyan→bloqueCyan`, `magenta→bloqueMagenta`, `hotpink→bloqueRosa`, `green→bloqueVerde`, `gray→bloqueGris`).
   - `drawExplosionFrame(color, ...)` → mismo mapeo que el bloque que explotó, para que la partícula de ruptura coincida con el color del bloque destruido.

### Paso 4 — `components/game-player.tsx`

Sin cambios. `hasSkins`/selector/persistencia/`getPalette` ya son genéricos desde SPEC 11; en cuanto `SKINS.arkanoid` exista (Paso 1), el selector `CLÁSICO`/`NEÓN`/`RETRO` aparece automáticamente en `/juegos/arkanoid/jugar`.

### Paso 5 — Verificación manual

`npm run dev`, jugar `/juegos/arkanoid/jugar` en las 3 skins: confirmar que el cambio de skin no reinicia la partida ni el puntaje, que paleta/pelota/los 7 colores de bloque/HUD/overlays coinciden con la tabla de este spec, que `clasico` es visualmente idéntico al comportamiento previo a este spec (captura de referencia antes/después), y que el selector de nivel del overlay de pausa sigue siendo clicable con el resaltado de `acento` en el nivel activo.

### Paso 6 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

- [ ] `GamePalette` en `lib/games/skins.ts` gana los 8 campos opcionales de Arkanoid sin volver opcional ni tocar ninguno de los 10 campos existentes de Asteroides.
- [ ] `SKINS.arkanoid` queda poblado con `clasico`/`neon`/`retro` según las tablas de este spec; `SKINS.asteroides` no se modifica.
- [ ] `lib/games/arkanoid/engine.ts` no tiene ningún literal de color hardcodeado en `fondo`/HUD/overlays/botón activo de nivel — todos vienen de `palette.<rol>`.
- [ ] Paleta, pelota, los 7 colores de bloque y sus explosiones se recolorean vía tinte cuando `palette.tinteSprites` es `true`, y se dibujan sin ningún cambio cuando es `false` (`clasico`).
- [ ] `createArkanoidEngine` sin tercer argumento sigue funcionando exactamente igual que antes de este spec (paleta `clasico` por defecto, `tinteSprites: false`).
- [ ] `setPalette` cambia los colores del siguiente frame sin reiniciar paleta/pelota/bloques vivos/puntaje/nivel.
- [ ] El selector de skin aparece en `/juegos/arkanoid/jugar` sin ningún cambio en `components/game-player.tsx` (ya era genérico desde SPEC 11).
- [ ] La skin elegida persiste en `localStorage` (`av_skin`) entre partidas y recargas, compartiendo la misma clave que Asteroides.
- [ ] Los 33 pares color/fondo de la tabla de contraste cumplen su umbral (4.5:1 texto, 3:1 entidad/bloque).
- [ ] Ningún `fondo` de skin usa negro puro `#000000` excepto `clasico` (misma desviación aceptada que en SPEC 11).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores nuevos.

---

## Decisiones tomadas y descartadas

### Tinte sobre sprite (`source-atop` + `globalAlpha`) en vez de sprites alternos por skin

- **Sí:** el spritesheet actual (`public/arkanoid/spritesheet-breakout.png`) ya tiene sombreado/highlights propios; recolorear con `globalCompositeOperation: "source-atop"` preserva esa forma y solo cambia el matiz, sin necesitar 3 PNGs distintos (uno por skin) ni tocar `public/`.
- **No:** generar/incluir spritesheets alternos por skin (`spritesheet-neon.png`, `spritesheet-retro.png`) — más fiel visualmente pero exige arte nuevo (fuera del alcance de un cambio de paleta) y triplica el peso de assets servidos por juego.

### `GamePalette` se extiende con campos opcionales en vez de un tipo genérico por juego

- **Sí:** mantiene un único tipo compartido y simple, consistente con `Record<GameId, Record<SkinId, GamePalette>>` de SPEC 11, sin generics ni variance de TypeScript en el registry (`ENGINE_REGISTRY: Record<string, EngineFactory>`). Cada motor ignora los campos que no le corresponden.
- **No:** un tipo `GamePalette<G extends GameId>` por juego — más estricto (obligaría a completar exactamente los roles de cada juego) pero requeriría que `EngineFactory`/`ENGINE_REGISTRY` fueran genéricos, con problemas de contravarianza de parámetros de función en un registry heterogéneo (`Record<string, EngineFactory<...>>` no es sencillo de tipar sin `any`). Se pospone esa refactorización a un spec futuro si el número de roles por juego sigue creciendo (p. ej. cuando Tetris agregue sus 7 colores de pieza + `tuerca`).

### `peligro`, `proyectil` y `particula` se declaran en las 3 paletas de Arkanoid aunque el motor no los consume

- **Sí:** son campos obligatorios heredados de `GamePalette` (Asteroides los requiere); no declararlos rompería la compilación de `SKINS.arkanoid` contra el tipo compartido. Se documentan explícitamente como "no consumidos" en vez de dejarlos como un valor arbitrario sin explicación.
- **No:** volverlos opcionales en el tipo — rompería la garantía de tipos de Asteroides (que sí los usa como `string` sin chequeo de `undefined`) y obligaría a tocar `lib/games/asteroides/engine.ts`, violando la regla de "ningún otro engine se toca".

### El velo de atenuación (`rgba(0,0,0,0.6)`/`0.65`) y la cromática de los botones de nivel (salvo el activo) no cambian por skin

- **Sí:** son UI de control superpuesta al juego (pausa, selector de nivel), no parte de la identidad visual jugable — mismo criterio que ya aplican los botones `.btn` de React (`PAUSA`/`FIN`/`SALIR`), que tampoco cambian de color según la skin elegida. Simplifica el inventario de roles y evita introducir 3-4 roles nuevos (`overlayFondo`, `botonInactivo`, `botonBorde`, `botonTexto`) para elementos de bajo valor visual.
- **No:** palletizar también el velo y el resto de la cromática del selector — más "completo" pero agrega roles de bajo impacto visual (grises neutros) que no aportan identidad de skin, a cambio de más superficie de mantenimiento.

### Fósforo ámbar en `retro` en vez de reutilizar el verde de Asteroides

- **Sí:** diferencia visualmente los dos juegos dentro de la misma convención CRT del catálogo (ambos "retro" pero no idénticos), evita que el jugador confunda capturas de un juego con otro, y es una paleta CRT igual de válida (ámbar es un estándar de monitores retro, igual que el verde fósforo).
- **No:** reutilizar el verde `#001505`/`#33ff66` de Asteroides — habría sido más simple pero menos distintivo; con 4 juegos en el catálogo, dos "retro verde" idénticos hubiera sido una oportunidad perdida de variedad.

### `bloqueVerde` en `retro` es un verde oliva desaturado en vez de un ámbar puro

- **Sí:** con 7 bloques simultáneos posibles en un mismo nivel (ver `levels.ts`, nivel 1 usa 6 colores en filas distintas), un esquema 100% monocromático ámbar no deja suficiente separación de matiz/brillo entre 7 valores; introducir un segundo hue (verde oliva, de baja saturación para no romper la estética CRT) resuelve el bloque "verde" sin sacrificar la identidad ámbar del resto de la paleta.
- **No:** mantener los 7 bloques estrictamente dentro de la familia ámbar — se intentó (ver iteraciones en el cálculo de contraste) y dejaba `bloqueVerde` a menos de 3:1 de contraste o demasiado cerca en luminancia de `bloqueRojo`/`bloqueGris`.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                                                                     | Mitigación                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| En `retro`, `bloqueAmarillo` comparte el hex exacto de `entidadPrincipal`/`hud`/`overlay` (`#ffb000`).                                                                                                                                                                                                     | Bloques y paleta no comparten región de pantalla (bloques arriba, paleta abajo); si en verificación manual se ve confuso, ajustar `bloqueAmarillo` a un tono ligeramente distinto sin bajar de 3:1 contra `#150a00`.                                                                            |
| En `neon`, `bloqueCyan` (L≈0.257) y `bloqueRojo` (L≈0.289) tienen luminancias relativamente cercanas (~12% de diferencia), aunque de matices muy distintos (teal vs. naranja-rojo).                                                                                                                        | Ambos se distinguen con claridad por color; el riesgo se limita a un hipotético modo de escala de grises. Si se detecta confusión en verificación manual, separar aún más su brillo sin salir de la familia teal/naranja.                                                                       |
| La técnica de tinte (`source-atop` + `globalAlpha`) depende de crear un canvas offscreen por sprite dibujado, en cada frame, para paleta/pelota/cada bloque vivo/cada explosión activa — con hasta 60 bloques en pantalla (nivel 1: 6×10) esto son hasta ~60 canvas offscreen por frame en `neon`/`retro`. | Cachear el canvas offscreen tintado por `(sprite, color)` en un `Map` y solo regenerarlo cuando cambia la paleta (`setPalette`) o la primera vez que se dibuja ese `(sprite, color)`, en vez de recrearlo en cada frame — el Paso 3 del plan debe implementarlo así, no ingenuamente por frame. |
| `clasico` con `fondo: #000000` sigue chocando visualmente con `.crt` según la regla general de legibilidad, aunque se documenta como desviación aceptada (mismo caso que SPEC 11).                                                                                                                         | Verificación manual del Paso 5 confirma que el efecto CRT sigue siendo legible sobre negro puro, igual que hoy antes de este spec.                                                                                                                                                              |
| Deuda conocida heredada (no se arregla en esta spec): `game.best`/`game.plays` no sincronizados con Supabase; sin `preventDefault()` en teclado; `insertScore` falla en silencio.                                                                                                                          | Aceptado como riesgo conocido, igual que en specs anteriores.                                                                                                                                                                                                                                   |

---

## Qué **no** está en esta spec

- Skins de Tetris o Snake — cada uno su propio `specs/NN-skins-<id>.md`.
- Variantes de `.cover-arkanoid` por skin.
- Recoloreo del velo de atenuación de los overlays ni de la cromática del selector de nivel (salvo el resaltado del nivel activo).
- Sprites alternos por skin (arte nuevo) — se usa tinte sobre el spritesheet existente.
- Controles táctiles, autenticación real, Supabase Realtime.
- Sonido o efectos distintos por skin.
- Sincronizar `game.best`/`game.plays` con datos reales.
- Cualquier cambio a la lógica de juego de Arkanoid (física, puntaje, niveles, colisiones) — este spec toca únicamente color.
- Refactorizar `GamePalette`/`EngineFactory` a un esquema genérico por juego — pospuesto hasta que la cantidad de roles específicos por motor lo justifique (ver Decisiones).

Cada uno de estos, si se necesita, va en su propia spec.
