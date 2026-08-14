# Juegos con skins — registro

Estados: `pendiente` · `en-spec` · `implementado`

| Juego      | ID           | clasico | neon | retro | Estado    | Spec                           | Fecha      |
| ---------- | ------------ | ------- | ---- | ----- | --------- | ------------------------------ | ---------- |
| Asteroides | `asteroides` | ✓       | ✓    | ✓     | en-spec   | `specs/11-skins-asteroides.md` | 2026-08-14 |
| Tetris     | `tetris`     | —       | —    | —     | pendiente | —                              | —          |
| Arkanoid   | `arkanoid`   | ✓       | ✓    | ✓     | en-spec   | `specs/13-skins-arkanoid.md`   | 2026-08-14 |
| Snake      | `snake`      | ✓       | ✓    | ✓     | en-spec   | `specs/12-skins-snake.md`      | 2026-08-14 |

## Fichas

### `asteroides` — Asteroides · `en-spec` · 2026-08-14

**Roles de color detectados:**

- fondo, entidadPrincipal (nave), entidadSecundaria (asteroides), acento (power-up 3x), peligro (llama del propulsor), hud (texto SCORE/NIVEL), overlay (título fin de partida), textoHud (subtítulo atenuado)
- Roles extra propios del juego: `proyectil` (balas), `particula` (chispas de explosión)
- `rejilla` no aplica (motor vectorial sin grilla)

**Paleta `clasico` (default, igual al engine actual):**

| Rol               | Hex                      |
| ----------------- | ------------------------ |
| fondo             | `#000000`                |
| entidadPrincipal  | `#ffffff`                |
| entidadSecundaria | `#ffffff`                |
| proyectil         | `#ffffff`                |
| acento            | `#00ffff`                |
| peligro           | `rgba(255,130,0,0.85)`   |
| particula         | `#ffffff` (alpha decae)  |
| hud               | `#ffffff`                |
| overlay           | `#ffffff`                |
| textoHud          | `rgba(255,255,255,0.65)` |

**Paleta `neon`:**

| Rol               | Hex                      |
| ----------------- | ------------------------ |
| fondo             | `#0a0a0f`                |
| entidadPrincipal  | `#00f5ff`                |
| entidadSecundaria | `#ff006e`                |
| proyectil         | `#f5ff00`                |
| acento            | `#00ff88`                |
| peligro           | `#ff6a00`                |
| particula         | `rgba(255,255,255,0.9)`  |
| hud               | `#00f5ff`                |
| overlay           | `#f5ff00`                |
| textoHud          | `rgba(255,255,255,0.75)` |

**Paleta `retro`:**

| Rol               | Hex       |
| ----------------- | --------- |
| fondo             | `#001505` |
| entidadPrincipal  | `#33ff66` |
| entidadSecundaria | `#1f9a44` |
| proyectil         | `#baffcb` |
| acento            | `#ffb000` |
| peligro           | `#d92a00` |
| particula         | `#7dffb2` |
| hud               | `#33ff66` |
| overlay           | `#ffb000` |
| textoHud          | `#1f9a44` |

**Contraste (WCAG, contra fondo de la skin y contra `--bg #0a0a0f`):**

| Skin    | Rol                                                                 | Ratio   | ¿Pasa? |
| ------- | ------------------------------------------------------------------- | ------- | ------ |
| clasico | entidadPrincipal/Secundaria/proyectil/hud/overlay (`#fff` s/`#000`) | 21.0:1  | Sí     |
| clasico | acento (`#0ff` s/`#000`)                                            | 16.75:1 | Sí     |
| clasico | peligro (`#ff8200`@85% s/`#000`)                                    | ≈7.9:1  | Sí     |
| clasico | textoHud (`#fff`@65% s/`#000`)                                      | ≈15.9:1 | Sí     |
| neon    | entidadPrincipal/hud (`#00f5ff` s/`#0a0a0f`)                        | 14.59:1 | Sí     |
| neon    | entidadSecundaria (`#ff006e` s/`#0a0a0f`)                           | 5.15:1  | Sí     |
| neon    | proyectil/overlay (`#f5ff00` s/`#0a0a0f`)                           | 18.05:1 | Sí     |
| neon    | acento (`#00ff88` s/`#0a0a0f`)                                      | 14.73:1 | Sí     |
| neon    | peligro (`#ff6a00` s/`#0a0a0f`)                                     | 6.88:1  | Sí     |
| neon    | textoHud (`#fff`@75% s/`#0a0a0f`)                                   | 11.07:1 | Sí     |
| retro   | entidadPrincipal/hud (`#33ff66` s/`#001505`)                        | 14.09:1 | Sí     |
| retro   | entidadSecundaria/textoHud (`#1f9a44` s/`#001505`)                  | 5.20:1  | Sí     |
| retro   | proyectil (`#baffcb` s/`#001505`)                                   | 16.45:1 | Sí     |
| retro   | acento/overlay (`#ffb000` s/`#001505`)                              | 10.33:1 | Sí     |
| retro   | peligro (`#d92a00` s/`#001505`)                                     | 3.86:1  | Sí     |

**Pendientes / riesgos:**

- `clasico` mantiene `fondo: #000000` (negro puro) como desviación aceptada y documentada — es lo que dibuja el engine hoy; regla general de "sin negro puro" no aplica a esta skin por diseño.
- En `retro`, `peligro` (L≈0.164) y `entidadSecundaria` (L≈0.238) tienen luminancias cercanas; riesgo menor documentado en el spec, mitigado porque rara vez se superponen en pantalla.
- Implementación (`lib/games/skins.ts`, extensión de `EngineFactory`/`Engine`, migración del engine, selector en `game-player.tsx`) todavía no ejecutada — spec en estado Borrador, pendiente de `/spec-impl specs/11-skins-asteroides.md`.

### `snake` — Snake · `en-spec` · 2026-08-14

**Roles de color detectados:**

- fondo, entidadPrincipal (cabeza), entidadSecundaria (cuerpo, con alpha), acento (relleno de respaldo de la fruta antes de cargar `fruits.png`), hud (texto SCORE/NIVEL), overlay (título fin de partida), textoHud (subtítulo atenuado)
- `rejilla` no aplica (fondo plano, sin líneas de grilla dibujadas)
- `proyectil`, `particula`, `peligro`: campos requeridos por el `GamePalette` compartido pero sin literal correspondiente en este motor — fijados al mismo valor que `acento` en las 3 skins (alias documentado, sin consumidor visual)

**Paleta `clasico` (default, igual al engine actual):**

| Rol                         | Hex                           |
| --------------------------- | ----------------------------- |
| fondo                       | `#000000`                     |
| entidadPrincipal            | `#00ff88`                     |
| entidadSecundaria           | `rgba(0,255,136,0.75)`        |
| acento                      | `#ff2d55`                     |
| hud                         | `#ffffff`                     |
| overlay                     | `#ffffff`                     |
| textoHud                    | `rgba(255,255,255,0.65)`      |
| proyectil/particula/peligro | `#ff2d55` (= acento, sin uso) |

**Paleta `neon`:**

| Rol                         | Hex                           |
| --------------------------- | ----------------------------- |
| fondo                       | `#0a0a0f`                     |
| entidadPrincipal            | `#00f5ff`                     |
| entidadSecundaria           | `rgba(0,245,255,0.55)`        |
| acento                      | `#ff006e`                     |
| hud                         | `#00f5ff`                     |
| overlay                     | `#f5ff00`                     |
| textoHud                    | `rgba(255,255,255,0.75)`      |
| proyectil/particula/peligro | `#ff006e` (= acento, sin uso) |

**Paleta `retro`:**

| Rol                         | Hex                           |
| --------------------------- | ----------------------------- |
| fondo                       | `#001505`                     |
| entidadPrincipal            | `#33ff66`                     |
| entidadSecundaria           | `#1f9a44`                     |
| acento                      | `#ffb000`                     |
| hud                         | `#33ff66`                     |
| overlay                     | `#ffb000`                     |
| textoHud                    | `#1f9a44`                     |
| proyectil/particula/peligro | `#ffb000` (= acento, sin uso) |

**Contraste (WCAG, contra fondo de la skin y contra `--bg #0a0a0f`):**

| Skin    | Rol                                                   | Ratio   | ¿Pasa? |
| ------- | ----------------------------------------------------- | ------- | ------ |
| clasico | entidadPrincipal (`#00ff88` s/`#000`)                 | 15.66:1 | Sí     |
| clasico | entidadSecundaria (`rgba(0,255,136,.75)` s/`#000`)    | 8.64:1  | Sí     |
| clasico | acento (`#ff2d55` s/`#000`)                           | 5.76:1  | Sí     |
| clasico | hud/overlay (`#fff` s/`#000`)                         | 21.0:1  | Sí     |
| clasico | textoHud (`#fff`@65% s/`#000`)                        | 8.63:1  | Sí     |
| neon    | entidadPrincipal/hud (`#00f5ff` s/`#0a0a0f`)          | 14.59:1 | Sí     |
| neon    | entidadSecundaria (`rgba(0,245,255,.55)` s/`#0a0a0f`) | 4.82:1  | Sí     |
| neon    | acento (`#ff006e` s/`#0a0a0f`)                        | 5.15:1  | Sí     |
| neon    | overlay (`#f5ff00` s/`#0a0a0f`)                       | 18.05:1 | Sí     |
| neon    | textoHud (`#fff`@75% s/`#0a0a0f`)                     | 11.07:1 | Sí     |
| retro   | entidadPrincipal/hud (`#33ff66` s/`#001505`)          | 14.09:1 | Sí     |
| retro   | entidadSecundaria/textoHud (`#1f9a44` s/`#001505`)    | 5.20:1  | Sí     |
| retro   | acento/overlay (`#ffb000` s/`#001505`)                | 10.33:1 | Sí     |

**Pendientes / riesgos:**

- `clasico` mantiene `fondo: #000000` (negro puro) como desviación aceptada, misma razón que Asteroides.
- El fallback de `acento` (fruta antes de cargar `fruits.png`) solo se ve durante la carga inicial; verificación manual debe forzar ese estado al menos una vez.
- Cabeza y cuerpo en `neon` usan el mismo hue (cian) con alpha reducido en el cuerpo — decisión explícita para evitar que cian/verde opacos tuvieran luminancia casi idéntica en escala de grises (documentado en el spec).
- `proyectil`/`particula`/`peligro` son alias sin consumidor de `acento` en las 3 skins — deuda de diseño del `GamePalette` compartido (pensado para Asteroides en SPEC 11), no de este spec.
- Implementación (`lib/games/skins.ts` entrada `snake`, migración de `lib/games/snake/engine.ts`) todavía no ejecutada — spec en estado Borrador, pendiente de `/spec-impl specs/12-skins-snake.md`.

### `arkanoid` — Arkanoid · `en-spec` · 2026-08-14

**Roles de color detectados:**

- fondo (limpieza de pantalla), entidadPrincipal (paleta), entidadSecundaria (pelota + íconos de vidas), acento (botón de nivel activo en pausa), hud (texto Score/Nivel), overlay (títulos "GAME OVER"/"PAUSA"), textoHud (subtítulo "Saltar al nivel:")
- `rejilla` no aplica (bloques son sprites individuales, no una grilla de fondo)
- `peligro`, `proyectil`, `particula`: campos requeridos por el `GamePalette` compartido (heredados de Asteroides) pero **sin consumidor** en este motor — se declaran con valores heredados de las paletas de Asteroides, documentados como "no consumidos"
- Roles extra propios del juego (a diferencia de Asteroides, que es 100% vectorial, Arkanoid dibuja paleta/pelota/bloques desde un spritesheet): `tinteSprites` (`boolean`, interruptor de recoloreo) + 7 roles de bloque (`bloqueRojo`, `bloqueAmarillo`, `bloqueCyan`, `bloqueMagenta`, `bloqueRosa`, `bloqueVerde`, `bloqueGris`), uno por cada `BlockColor` de `lib/games/arkanoid/levels.ts`

**Paleta `clasico` (default, igual al engine actual — sprites sin tinte):**

| Rol                                              | Hex                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| fondo                                            | `#000000`                                                                                              |
| entidadPrincipal                                 | `#e6e6e6` (referencia visual del sprite, no aplicado)                                                  |
| entidadSecundaria                                | `#c9c9c9` (referencia visual del sprite, no aplicado)                                                  |
| acento                                           | `#f0c040`                                                                                              |
| hud                                              | `#ffffff`                                                                                              |
| overlay                                          | `#ffffff`                                                                                              |
| textoHud                                         | `#ffffff`                                                                                              |
| peligro/proyectil/particula                      | `#ff8200`/`#ffffff`/`#ffffff` (heredados, sin uso)                                                     |
| tinteSprites                                     | `false`                                                                                                |
| bloqueRojo/Amarillo/Cyan/Magenta/Rosa/Verde/Gris | `#e63946`/`#e8a33d`/`#4a90d9`/`#7b68c9`/`#e069a6`/`#5cb85c`/`#8c8c9c` (referencia visual, no aplicado) |

**Paleta `neon`:**

| Rol                                              | Hex                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| fondo                                            | `#0a0a0f`                                                             |
| entidadPrincipal                                 | `#00f5ff`                                                             |
| entidadSecundaria                                | `#f5ff00`                                                             |
| acento                                           | `#00ff88`                                                             |
| hud                                              | `#00f5ff`                                                             |
| overlay                                          | `#f5ff00`                                                             |
| textoHud                                         | `rgba(255,255,255,0.75)`                                              |
| peligro/proyectil/particula                      | `#ff6a00`/`#f5ff00`/`rgba(255,255,255,0.9)` (heredados, sin uso)      |
| tinteSprites                                     | `true`                                                                |
| bloqueRojo/Amarillo/Cyan/Magenta/Rosa/Verde/Gris | `#ff5a3a`/`#ffcc00`/`#1499a6`/`#ff006e`/`#ff8fbf`/`#7dffb2`/`#5c5c70` |

**Paleta `retro` (fósforo ámbar, no verde — diferenciación deliberada de Asteroides):**

| Rol                                              | Hex                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| fondo                                            | `#150a00`                                                             |
| entidadPrincipal                                 | `#ffb000`                                                             |
| entidadSecundaria                                | `#fff2c2`                                                             |
| acento                                           | `#ff7a00`                                                             |
| hud                                              | `#ffb000`                                                             |
| overlay                                          | `#ffb000`                                                             |
| textoHud                                         | `#b3792a`                                                             |
| peligro/proyectil/particula                      | `#b34700`/`#fff2c2`/`#ffe9b3` (heredados, sin uso)                    |
| tinteSprites                                     | `true`                                                                |
| bloqueRojo/Amarillo/Cyan/Magenta/Rosa/Verde/Gris | `#ff5030`/`#ffb000`/`#ffe9b3`/`#a05a2a`/`#ff7a52`/`#5c8a35`/`#7a5a3a` |

**Contraste (WCAG, contra el fondo propio de cada skin):**

| Skin    | Rol                                                     | Ratio             | ¿Pasa? |
| ------- | ------------------------------------------------------- | ----------------- | ------ |
| clasico | entidadPrincipal/Secundaria/acento/hud/overlay/textoHud | 12.3:1 – 21.0:1   | Sí     |
| clasico | bloqueRojo/Amarillo/Cyan/Magenta/Rosa/Verde/Gris        | 4.67:1 – 9.74:1   | Sí     |
| neon    | entidadPrincipal/entidadSecundaria/acento/hud/overlay   | 14.58:1 – 18.05:1 | Sí     |
| neon    | textoHud (`#fff`@75%)                                   | 11.07:1           | Sí     |
| neon    | bloqueRojo/Amarillo/Cyan/Magenta/Rosa/Verde/Gris        | 3.03:1 – 15.82:1  | Sí     |
| retro   | entidadPrincipal/entidadSecundaria/acento/hud/overlay   | 7.47:1 – 17.42:1  | Sí     |
| retro   | textoHud                                                | 5.29:1            | Sí     |
| retro   | bloqueRojo/Amarillo/Cyan/Magenta/Rosa/Verde/Gris        | 3.12:1 – 16.33:1  | Sí     |

**Pendientes / riesgos:**

- `clasico` mantiene `fondo: #000000` (negro puro), misma desviación aceptada que Asteroides/Snake.
- En `retro`, `bloqueAmarillo` comparte hex exacto (`#ffb000`) con `entidadPrincipal`/`hud`/`overlay`; riesgo menor, bloques y paleta no comparten región de pantalla.
- En `neon`, `bloqueCyan` (L≈0.257) y `bloqueRojo` (L≈0.289) quedan a ~12% de diferencia de luminancia; se distinguen por matiz, riesgo limitado a escala de grises.
- `peligro`/`proyectil`/`particula` heredados sin consumidor — misma deuda de diseño del `GamePalette` compartido ya señalada en la ficha de `snake`.
- `GamePalette` gana 8 campos opcionales propios de Arkanoid (`tinteSprites` + 7 `bloque*`) — primera extensión del tipo compartido desde SPEC 11, sin tocar los 10 campos existentes de Asteroides.
- Técnica de recoloreo: tinte sobre sprite (`globalCompositeOperation: "source-atop"`) con cacheo por `(sprite, color)`, no sprites alternos por skin — ver spec para detalle y riesgo de rendimiento si no se cachea.
- Implementación (`lib/games/skins.ts` entrada `arkanoid` + campos nuevos de `GamePalette`, migración de `lib/games/arkanoid/engine.ts`) todavía no ejecutada — spec en estado Borrador, pendiente de `/spec-impl specs/13-skins-arkanoid.md`.

<!--
Plantilla de ficha — copiar por cada juego procesado:

### `<id>` — <Título> · `en-spec` · <fecha>

**Roles de color detectados:**
- fondo, rejilla, entidadPrincipal, entidadSecundaria, acento, peligro, hud, overlay, textoHud
- (roles extra propios del juego, si aplica)

**Paleta `clasico` (default, igual al engine actual):**
| Rol | Hex |
| --- | --- |

**Paleta `neon`:**
| Rol | Hex |
| --- | --- |

**Paleta `retro`:**
| Rol | Hex |
| --- | --- |

**Contraste (WCAG, contra fondo de la skin y contra `--bg #0a0a0f`):**
| Skin | Rol | Ratio | ¿Pasa? |
| --- | --- | --- | --- |

**Pendientes / riesgos:**
-
-->
