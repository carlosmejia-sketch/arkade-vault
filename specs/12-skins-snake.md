# SPEC 12 — Skins de Snake (clasico / neon / retro)

> **Estado:** Implementado
> **Depende de:** SPEC 09 (motor real de Snake), SPEC 11 (infraestructura genérica de skins: `lib/games/skins.ts`, extensión de `EngineFactory`/`Engine`, selector genérico en `components/game-player.tsx`)
> **Fecha:** 2026-08-14
> **Objetivo:** Agregar la entrada `snake` a la infraestructura de skins ya existente (`lib/games/skins.ts`) y migrar `lib/games/snake/engine.ts` para leer sus colores de `palette.<rol>`, habilitando las 3 paletas (`clasico`, `neon`, `retro`) en `/juegos/snake/jugar` sin alterar su lógica de juego.

---

## Alcance

**Dentro:**

1. **`lib/games/skins.ts`**: agregar la entrada `snake` a `SKINS` con sus 3 paletas (`clasico`/`neon`/`retro`), reutilizando el tipo `GamePalette` ya existente (`fondo`, `entidadPrincipal`, `entidadSecundaria`, `proyectil`, `acento`, `peligro`, `particula`, `hud`, `overlay`, `textoHud`) — **sin** modificar el tipo ni el resto del archivo (`asteroides` no se toca).
2. **`lib/games/snake/engine.ts`**: sustituir cada literal de color hoy hardcodeado por `palette.<rol>` (lista exacta en "Inventario de roles" abajo). `createSnakeEngine` pasa a recibir `palette` como tercer parámetro opcional (`(canvas, callbacks, palette?)`, firma ya soportada por `EngineFactory` desde SPEC 11), con `getPalette("snake", "clasico")` como valor por defecto. Implementa `setPalette` para cambiar de skin sin reiniciar la partida (sin tocar `snake`/`fruit`/`score`/`level` en curso).
3. **Verificación manual**: Snake jugado en las 3 skins, confirmando legibilidad, que `clasico` es visualmente idéntico al comportamiento previo a este spec, y que el cambio de skin no reinicia la partida.

**Fuera de alcance (ya resuelto por SPEC 11, no se repite aquí):**

- Crear `lib/games/skins.ts` o extender `EngineFactory`/`Engine` — ya existen.
- Selector de 3 botones en `components/game-player.tsx` — ya es genérico: se activa automáticamente para cualquier `game.id` con entrada en `SKINS` (`hasSkins = Boolean(SKINS[game.id])`, `components/game-player.tsx:24`). Agregar la entrada `snake` a `SKINS` en este spec ya lo activa; **no se toca `game-player.tsx`**.
- Persistencia en `localStorage` (`av_skin`) — ya implementada de forma genérica.

**Fuera de alcance (para specs futuros):**

- Skins de Tetris y Arkanoid (cada uno su propio `specs/NN-skins-<id>.md`).
- Variantes de skin para `.cover-snake-real` en `app/globals.css`.
- Sonido o efectos distintos por skin.
- Recolorear el atlas `fruits.png` por skin — las frutas siguen siendo el sprite real (`FRUIT_SPRITES`/`drawImage`) en las 3 skins; solo cambia el color de fondo, serpiente, HUD y overlay. El único literal de color de fruta que este spec migra es el **fallback** que se dibuja si `fruitSheet` todavía no cargó (`engine.ts:199`), no el sprite en sí.
- Controles táctiles, autenticación real, Supabase Realtime — deuda ya documentada, no se toca aquí.

---

## Inventario de roles de color (Snake)

Grep de `lib/games/snake/engine.ts`: el motor dibuja sobre grilla pero **no** traza líneas de rejilla (el fondo es un `fillRect` plano), por lo que el rol base `rejilla` **no aplica**, igual que en Asteroides.

| Rol (`GamePalette`)     | Uso en el engine actual                                                        | Origen (línea) |
| ----------------------- | ------------------------------------------------------------------------------ | -------------- |
| `fondo`                 | `fillRect` de limpieza de pantalla en `draw()`                                 | L231           |
| `entidadPrincipal`      | Cabeza de la serpiente (`drawSnake`, `i === 0`)                                | L206           |
| `entidadSecundaria`     | Cuerpo de la serpiente (`drawSnake`, resto de segmentos, con alpha)            | L206           |
| `acento`                | Relleno de respaldo de la fruta cuando `fruitSheet` aún no cargó (`drawFruit`) | L199           |
| `hud`                   | Texto `SCORE`/`NIVEL` (`drawHUD`)                                              | L212           |
| `overlay`               | Título grande de fin de partida, `"GAME OVER"` (`drawOverlay`)                 | L223           |
| `textoHud`              | Subtítulo atenuado del overlay, `"PUNTAJE: X"` (`drawOverlay`)                 | L226           |
| `proyectil` _(sin uso)_ | Sin consumidor: Snake no dibuja proyectiles.                                   | N/A            |
| `particula` _(sin uso)_ | Sin consumidor: Snake no dibuja partículas/explosiones.                        | N/A            |
| `peligro` _(sin uso)_   | Sin consumidor: no hay elemento de "peligro" visual distinto en este motor.    | N/A            |

`rejilla`: N/A — no forma parte de `GamePalette` (igual tratamiento que Asteroides).

`proyectil`, `particula` y `peligro` son campos requeridos por el `GamePalette` compartido (definido en SPEC 11 pensando en Asteroides) pero **sin literal correspondiente en el motor de Snake**. En vez de dejarlos con un color arbitrario sin relación visual, se fijan en cada skin al mismo valor que `acento` — no se renderizan nunca, así que no hay riesgo de contraste, y evita introducir un hex "huérfano" que nadie ve. Documentado también en Decisiones tomadas y descartadas.

---

## Las 3 skins

### `clasico` (default — idéntico al engine actual)

| Rol                 | Hex / valor                     |
| ------------------- | ------------------------------- |
| `fondo`             | `#000000`                       |
| `entidadPrincipal`  | `#00ff88`                       |
| `entidadSecundaria` | `rgba(0, 255, 136, 0.75)`       |
| `acento`            | `#ff2d55`                       |
| `hud`               | `#ffffff`                       |
| `overlay`           | `#ffffff`                       |
| `textoHud`          | `rgba(255, 255, 255, 0.65)`     |
| `proyectil`         | `#ff2d55` (= `acento`, sin uso) |
| `particula`         | `#ff2d55` (= `acento`, sin uso) |
| `peligro`           | `#ff2d55` (= `acento`, sin uso) |

**Desviación aceptada:** `fondo: #000000` es negro puro, igual desviación aceptada que en Asteroides (SPEC 11) y por la misma razón: el mandato de `clasico` es ser un cambio visualmente nulo respecto a lo que el engine dibuja hoy.

### `neon` (tokens del sitio, cabeza/cuerpo distinguibles también en brillo)

Fondo alineado a `--bg #0a0a0f` (no negro puro).

| Rol                 | Hex / valor                     | Notas                                                                                                       |
| ------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `fondo`             | `#0a0a0f`                       | = `--bg` del sitio                                                                                          |
| `entidadPrincipal`  | `#00f5ff` (`--cyan`)            | Cabeza, opaca, con `shadowBlur` ~10                                                                         |
| `entidadSecundaria` | `rgba(0, 245, 255, 0.55)`       | Cuerpo: mismo cian que la cabeza pero con alpha reducido — mismo hue, brillo bastante menor (ver contraste) |
| `acento`            | `#ff006e` (`--magenta`)         | Relleno de respaldo de la fruta, hue distinto de la serpiente                                               |
| `hud`               | `#00f5ff` (`--cyan`)            | Texto SCORE/NIVEL                                                                                           |
| `overlay`           | `#f5ff00` (`--yellow`)          | Título "GAME OVER", máximo contraste                                                                        |
| `textoHud`          | `rgba(255, 255, 255, 0.75)`     | Subtítulo — blanco translúcido, no magenta, para no bajar de 4.5:1                                          |
| `proyectil`         | `#ff006e` (= `acento`, sin uso) |                                                                                                             |
| `particula`         | `#ff006e` (= `acento`, sin uso) |                                                                                                             |
| `peligro`           | `#ff006e` (= `acento`, sin uso) |                                                                                                             |

`shadowBlur` es decorativo: todos los roles cumplen el mínimo de contraste sin animación ni parpadeo, respetando `prefers-reduced-motion` (`app/globals.css:2789`).

### `retro` (CRT fósforo verde, sin glow, monocromo por brillo)

Misma familia de verde fósforo que la skin `retro` de Asteroides (identidad visual consistente entre juegos), con hex idénticos donde el rol coincide.

| Rol                 | Hex / valor                     | Notas                                                                    |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `fondo`             | `#001505`                       | Verde casi negro, no negro puro                                          |
| `entidadPrincipal`  | `#33ff66`                       | Cabeza — el verde más brillante junto al HUD                             |
| `entidadSecundaria` | `#1f9a44`                       | Cuerpo — verde medio, claramente más oscuro que la cabeza                |
| `acento`            | `#ffb000`                       | Relleno de respaldo de la fruta — ámbar, hue distinto del verde ambiente |
| `hud`               | `#33ff66`                       | Texto SCORE/NIVEL — igual de brillante que la cabeza                     |
| `overlay`           | `#ffb000`                       | Título "GAME OVER" — ámbar                                               |
| `textoHud`          | `#1f9a44`                       | Subtítulo — mismo verde medio que el cuerpo, más tenue que el HUD        |
| `proyectil`         | `#ffb000` (= `acento`, sin uso) |                                                                          |
| `particula`         | `#ffb000` (= `acento`, sin uso) |                                                                          |
| `peligro`           | `#ffb000` (= `acento`, sin uso) |                                                                          |

`image-rendering: pixelated` no aplica al canvas del motor en su conjunto (los `fillRect` de cabeza/cuerpo son vectoriales), pero si se decide aplicarlo al `<img>`/`drawImage` de `fruits.png` para reforzar la estética retro en los sprites de fruta, queda **fuera de alcance** de este spec (cambio de renderizado de imagen, no de paleta).

---

## Tabla de contraste (WCAG, luminancia relativa)

Umbral: **4.5:1** para texto de HUD (`hud`, `overlay`, `textoHud`), **3:1** para entidades jugables (`entidadPrincipal`, `entidadSecundaria`, `acento`). `--bg` del sitio es `#0a0a0f` (L = 0.00316). Los roles sin consumidor (`proyectil`, `particula`, `peligro`) no se renderizan nunca en Snake, así que no requieren verificación de contraste, pero comparten hex con `acento` (ya verificado).

| Skin      | Rol                 | Color                              | Fondo de referencia | Ratio     | ¿Pasa? |
| --------- | ------------------- | ---------------------------------- | ------------------- | --------- | ------ |
| `clasico` | `entidadPrincipal`  | `#00ff88`                          | `#000000`           | 15.66 : 1 | Sí     |
| `clasico` | `entidadSecundaria` | `rgba(0,255,136,0.75)` s/negro     | `#000000`           | 8.64 : 1  | Sí     |
| `clasico` | `acento`            | `#ff2d55`                          | `#000000`           | 5.76 : 1  | Sí     |
| `clasico` | `hud`               | `#ffffff`                          | `#000000`           | 21.0 : 1  | Sí     |
| `clasico` | `overlay`           | `#ffffff`                          | `#000000`           | 21.0 : 1  | Sí     |
| `clasico` | `textoHud`          | `#ffffff` (65% alpha s/negro)      | `#000000`           | 8.63 : 1  | Sí     |
| `neon`    | `entidadPrincipal`  | `#00f5ff`                          | `#0a0a0f`           | 14.59 : 1 | Sí     |
| `neon`    | `entidadSecundaria` | `rgba(0,245,255,0.55)` s/`#0a0a0f` | `#0a0a0f`           | 4.82 : 1  | Sí     |
| `neon`    | `acento`            | `#ff006e`                          | `#0a0a0f`           | 5.15 : 1  | Sí     |
| `neon`    | `hud`               | `#00f5ff`                          | `#0a0a0f`           | 14.59 : 1 | Sí     |
| `neon`    | `overlay`           | `#f5ff00`                          | `#0a0a0f`           | 18.05 : 1 | Sí     |
| `neon`    | `textoHud`          | `#ffffff` (75% alpha s/`#0a0a0f`)  | `#0a0a0f`           | 11.07 : 1 | Sí     |
| `retro`   | `entidadPrincipal`  | `#33ff66`                          | `#001505`           | 14.09 : 1 | Sí     |
| `retro`   | `entidadSecundaria` | `#1f9a44`                          | `#001505`           | 5.20 : 1  | Sí     |
| `retro`   | `acento`            | `#ffb000`                          | `#001505`           | 10.33 : 1 | Sí     |
| `retro`   | `hud`               | `#33ff66`                          | `#001505`           | 14.09 : 1 | Sí     |
| `retro`   | `overlay`           | `#ffb000`                          | `#001505`           | 10.33 : 1 | Sí     |
| `retro`   | `textoHud`          | `#1f9a44`                          | `#001505`           | 5.20 : 1  | Sí     |

Todos los roles de `neon` y `retro` se verifican también contra `--bg #0a0a0f`: en `neon` el fondo **es** ese color (ratio idéntico al de la tabla); en `retro`, `#001505` es más oscuro que `--bg`, así que el ratio contra `--bg` mejora el mostrado. `clasico` se verifica contra `#000000` (su propio fondo, más oscuro que `--bg`, por lo que cualquier ratio que pase ahí también pasa contra `--bg`).

**Distinción en escala de grises (cabeza vs. cuerpo, el par adyacente en pantalla):**

- `clasico`: cabeza (`entidadPrincipal` L≈0.733) vs. cuerpo (`entidadSecundaria`, compuesto sobre negro, L≈0.382) — casi el doble de luminancia, se distinguen sin color.
- `neon`: cabeza (`#00f5ff` opaco, L≈0.726) vs. cuerpo (`rgba(0,245,255,0.55)` compuesto sobre `#0a0a0f`, L≈0.206) — mismo hue (cian) pero brillo muy distinto gracias al alpha reducido; en escala de grises se distinguen con claridad (evita el problema de usar cian vs. verde con luminancias casi idénticas, que se descartó — ver Decisiones).
- `retro`: cabeza (`#33ff66` L≈0.732 según cálculo heredado de Asteroides) vs. cuerpo (`#1f9a44` L≈0.238) — diferencia amplia, se distinguen sin color.
- Fruta (`acento`, solo visible como respaldo antes de que cargue `fruits.png`) tiene hue distinto del verde/cian de la serpiente en las 3 skins, y solo coincide en pantalla brevemente durante la carga inicial — riesgo bajo, documentado abajo.

---

## Plan de implementación

### Paso 1 — Agregar `snake` a `lib/games/skins.ts`

Agregar la clave `snake` a `SKINS` (ya tipado `Record<GameId, Record<SkinId, GamePalette>>` desde SPEC 11 — `GameId` ya incluye `"snake"`) con las 3 paletas de la sección anterior. No se toca `asteroides` ni el resto del archivo (tipo `GamePalette`, `DEFAULT_SKIN`, `getPalette`).

### Paso 2 — Migrar `lib/games/snake/engine.ts`

- Cambiar la firma a `createSnakeEngine(canvas, callbacks, palette = getPalette("snake", "clasico"))`, guardando `palette` en una variable mutable del closure (mismo patrón que Asteroides en SPEC 11).
- Sustituir en `draw()`/`drawFruit()`/`drawSnake()`/`drawHUD()`/`drawOverlay()` cada literal de color por `palette.<rol>` según la tabla de "Inventario de roles": `#000` → `palette.fondo`, `#00ff88`/`rgba(0,255,136,0.75)` → `palette.entidadPrincipal`/`palette.entidadSecundaria`, `#ff2d55` (fallback de `drawFruit`) → `palette.acento`, `#fff` de `drawHUD`/`drawOverlay` (título) → `palette.hud`/`palette.overlay`, `rgba(255,255,255,0.65)` del subtítulo → `palette.textoHud`.
- Leer `palette.<rol>` dentro de cada función `draw*`, nunca cachear el color fuera del closure mutable — así `setPalette` se refleja en el siguiente frame sin reiniciar `snake`/`fruit`/`score`/`level`/`tickMs`.
- Implementar `setPalette(next: GamePalette)` que reasigna la variable de paleta del closure y se agrega al objeto retornado (`{ start, pause, resume, restart, destroy, setPalette }`).
- Sin cambios a `initGame`, `step`, `spawnFruit`, `onKeyDown`, `tick`, `scheduleTimer` — ningún literal de lógica de juego (velocidad, colisión, wrap, puntaje) se toca.

### Paso 3 — Verificación manual

`npm run dev`, jugar `/juegos/snake/jugar` en las 3 skins: confirmar que el selector de skin aparece automáticamente (ya generalizado desde SPEC 11), que cambiar de skin a mitad de partida no reinicia la serpiente ni el puntaje, que los colores coinciden con la tabla de este spec, y que `clasico` es visualmente idéntico al comportamiento de Snake previo a este spec.

### Paso 4 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

- [ ] `lib/games/skins.ts` tiene la entrada `snake` en `SKINS` con las 3 skins de este spec; `asteroides` y el resto del archivo no cambian.
- [ ] `lib/games/snake/engine.ts` no tiene ningún literal de color hardcodeado — todos vienen de `palette.<rol>`.
- [ ] `createSnakeEngine(canvas, callbacks)` sin tercer argumento sigue funcionando exactamente igual que antes de este spec (paleta `clasico` por defecto).
- [ ] `setPalette` cambia los colores del siguiente frame sin reiniciar la serpiente, la fruta actual, el puntaje ni el nivel.
- [ ] El selector de skin aparece automáticamente en `/juegos/snake/jugar` sin ningún cambio en `components/game-player.tsx`.
- [ ] La skin elegida persiste en `localStorage` (`av_skin`) entre partidas y recargas (comportamiento genérico ya existente, verificado también para Snake).
- [ ] Los 18 pares color/fondo de la tabla de contraste cumplen su umbral (4.5:1 texto, 3:1 entidad).
- [ ] Ningún fondo de skin usa negro puro `#000000` excepto `clasico` (desviación documentada y aceptada, igual que en Asteroides).
- [ ] `/juegos/tetris/jugar` y `/juegos/arkanoid/jugar` siguen sin mostrar selector de skin (no tienen entrada en `SKINS` todavía).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores nuevos.

---

## Decisiones tomadas y descartadas

### Cuerpo de la serpiente en `neon` como el mismo cian que la cabeza, con alpha reducido, en vez de un segundo hue (p. ej. verde)

- **Sí:** un cian opaco (`#00f5ff`, L≈0.726) y un verde opaco (`#00ff88`, L≈0.733) tienen luminancia casi idéntica — no se distinguirían en escala de grises, violando la regla de legibilidad. Reducir el alpha del mismo hue baja la luminancia compuesta a L≈0.206, manteniendo la identidad visual "cabeza brillante / cuerpo translúcido" que ya usa `clasico`.
- **No:** usar verde `--green` opaco para el cuerpo — se descartó justamente por el conflicto de luminancia calculado arriba; se documenta acá para que una futura skin no reintroduzca el mismo error sin verificar el ratio en escala de grises.

### `proyectil`, `particula` y `peligro` fijados al mismo valor que `acento` en vez de hex propios sin uso

- **Sí:** estos 3 roles son parte del `GamePalette` compartido (pensado para Asteroides en SPEC 11) pero Snake no los consume en ningún `draw*`. Inventar un hex "de relleno" sin ningún pixel que lo muestre sería ruido en el spec y en `skins.ts`; igualarlos a `acento` documenta explícitamente que son alias sin consumidor, sin agregar una cuarta paleta de colores fantasma.
- **No:** dejar el tipo `GamePalette` con campos opcionales por juego (p. ej. `Partial<...>` o un tipo específico para Snake) — se descarta porque este spec no toca `lib/games/skins.ts` más allá de agregar la entrada `snake`; ese refactor de tipos, si se necesita, es un cambio a la infraestructura compartida y le corresponde a un spec de skins futuro (o retroactivo a SPEC 11), no a este.

### Sin recoloreo del atlas `fruits.png` por skin

- **Sí:** las frutas son sprites reales (fotografías estilizadas), no formas vectoriales — aplicarles un tinte por skin (`neon`/`retro`) requeriría procesamiento de imagen (canvas offscreen con `globalCompositeOperation`) fuera del alcance de "sustituir literales de color por roles de paleta".
- **No:** generar variantes del atlas por skin — trabajo de asset pipeline no solicitado, declarado explícitamente Fuera de alcance.

### Reutilizar los hex exactos de la skin `retro` de Asteroides en vez de una paleta retro distinta para Snake

- **Sí:** mantiene una identidad "retro" consistente en toda la plataforma (fósforo verde + ámbar), y los ratios de contraste ya están verificados en SPEC 11 — reutilizarlos evita recalcular desde cero sin ganar nada distinto.
- **No:** una paleta retro distinta (p. ej. ámbar monocromo tipo Game Boy) — válida como alternativa futura, pero no aporta valor adicional para este spec y hubiera obligado a recalcular toda la tabla de contraste sin necesidad.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                                | Mitigación                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clasico` con `fondo: #000000` sigue chocando visualmente con `.crt` según la regla general de legibilidad, aunque se documenta como desviación aceptada (mismo caso que Asteroides).                                                                                 | Verificación manual del Paso 3 confirma que el efecto CRT sigue siendo legible sobre negro puro, igual que hoy antes de este spec — no es una regresión.                                          |
| El relleno de respaldo de la fruta (`palette.acento`) solo se ve durante la carga inicial de `fruits.png` (`fruitSheet.complete` falso); si la verificación manual no fuerza ese estado, el rol queda sin probarse visualmente aunque el contraste ya esté calculado. | En el Paso 3, verificar el fallback simulando carga lenta (throttling de red en devtools) o revisando el color en el primer frame antes de que la imagen termine de cargar, en al menos una skin. |
| Si algún `draw*` cachea `palette` en una variable local capturada antes de la reasignación de `setPalette` (en vez de leer la variable mutable del closure en cada llamada), el cambio de skin no se reflejaría hasta reiniciar.                                      | El Paso 2 exige leer la variable de paleta del closure dentro de cada función `draw*`, nunca capturarla en un valor fijo al momento de crear el engine.                                           |
| Doble montaje en desarrollo (React `StrictMode`) podría dejar un `setPalette` aplicado a un engine ya destruido si el efecto de `game-player.tsx` no limpia la referencia a tiempo — mismo riesgo que en Asteroides.                                                  | `engineRef.current` ya se pone en `null` en el cleanup existente; el selector de skin (genérico, sin cambios en este spec) ya usa optional chaining (`engineRef.current?.setPalette?.(...)`).     |
| Deuda conocida heredada (no se arregla en esta spec): `game.best`/`game.plays` no sincronizados con Supabase; sin `preventDefault()` completo en teclado fuera de flechas/WASD ya cubiertas; `insertScore` falla en silencio.                                         | Aceptado como riesgo conocido, igual que en specs anteriores — fuera del alcance de un cambio de paletas.                                                                                         |

---

## Qué **no** está en esta spec

- Skins de Tetris o Arkanoid — cada uno su propio `specs/NN-skins-<id>.md`.
- Cambios a `lib/games/skins.ts` más allá de agregar la entrada `snake` (tipo `GamePalette`, `DEFAULT_SKIN`, `getPalette` no se tocan).
- Cambios a `lib/games/types.ts` o `components/game-player.tsx` — ya resueltos de forma genérica en SPEC 11.
- Variantes de `.cover-snake-real` por skin.
- Recoloreo o generación de variantes del atlas `fruits.png`.
- Controles táctiles, autenticación real, Supabase Realtime.
- Sonido o efectos distintos por skin.
- Sincronizar `game.best`/`game.plays` con datos reales.
- Cualquier cambio a la lógica de juego de Snake (velocidad, wrap, colisión, puntaje, niveles) — este spec toca únicamente color.

Cada uno de estos, si se necesita, va en su propia spec.
