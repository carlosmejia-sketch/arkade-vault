# SPEC 16 — Skins de Frogger (clasico / neon / retro)

> **Estado:** Aprobado
> **Depende de:** SPEC del motor real de Frogger (`specs/game-jam/frogger/01-frogger-core.md`), SPEC 11 (infraestructura genérica de skins: `lib/games/skins.ts`, extensión de `EngineFactory`/`Engine` con `palette?`/`setPalette?`, selector genérico en `components/game-player.tsx`)
> **Fecha:** 2026-08-20
> **Objetivo:** Agregar la entrada `frogger` a `lib/games/skins.ts` — extendiendo `GamePalette` con los roles propios de este motor (zonas de tablero, vehículos, río, meta, barra de tiempo) — y migrar `lib/games/frogger/engine.ts` para leer sus colores de `palette.<rol>`, habilitando las 3 paletas (`clasico`, `neon`, `retro`) en `/juegos/frogger/jugar` sin alterar su lógica de juego.

---

## Alcance

**Dentro:**

1. **`lib/games/skins.ts`**: agregar la entrada `frogger` a `SKINS` con sus 3 paletas. Frogger es el motor con más roles visuales de los 4 ya migrados (4 fondos de zona + vehículos + río + meta + barra de tiempo), así que este spec **extiende `GamePalette`** con 15 campos opcionales nuevos (mismo patrón que SPEC 13 agregó `tinteSprites`/`bloque*` para Arkanoid) — sin tocar los 10 campos base ni las entradas `asteroides`/`snake`/`arkanoid` ya existentes.
2. **`lib/games/frogger/engine.ts`**: sustituir cada literal de color hoy hardcodeado por `palette.<rol>` (lista exacta en "Inventario de roles" abajo). `createFroggerEngine` pasa a recibir `palette` como tercer parámetro opcional (`(canvas, callbacks, palette?)`, firma ya soportada por `EngineFactory` desde SPEC 11), con `getPalette("frogger", "clasico")` como valor por defecto. Implementa `setPalette` para cambiar de skin sin reiniciar la ronda en curso (sin tocar `frog`/`lanes`/`score`/`lives`/`level`/`roundTimer`).
3. **Verificación manual**: Frogger jugado en las 3 skins, confirmando legibilidad de cada zona/entidad, que `clasico` es visualmente idéntico al comportamiento previo a este spec, y que el cambio de skin no reinicia la partida.

**Fuera de alcance (ya resuelto por SPEC 11, no se repite aquí):**

- Crear `lib/games/skins.ts`, `SkinId`, `DEFAULT_SKIN`, `getPalette` o extender `EngineFactory`/`Engine` — ya existen. `GameId` ya incluye `"frogger"`.
- Selector de 3 botones en `components/game-player.tsx` — ya es genérico: se activa automáticamente para cualquier `game.id` con entrada en `SKINS` (`hasSkins = Boolean(SKINS[game.id as GameId])`, `components/game-player.tsx:29`). Agregar la entrada `frogger` a `SKINS` en este spec ya lo activa; **no se toca `game-player.tsx`**.
- Persistencia en `localStorage` (`av_skin`) — ya implementada de forma genérica.

**Fuera de alcance (para specs futuros):**

- Variantes de `.cover-frogger` por skin en `app/globals.css` — no se extiende la portada en este spec.
- Controles táctiles, autenticación real, Supabase Realtime — deuda ya documentada, no se toca aquí.
- Sonido o efectos distintos por skin.
- Cualquier cambio a la lógica de juego de Frogger (velocidad de carriles, tiempo por ronda, colisiones, puntaje, submersión de tortugas) — este spec toca únicamente color.
- Sincronizar `game.best`/`game.plays` con datos reales (deuda conocida, ver `mapa-integracion.md`).

---

## Inventario de roles de color (Frogger)

Grep de `lib/games/frogger/engine.ts`: a diferencia de Asteroides/Snake (vectoriales simples) y Arkanoid (sprites), Frogger dibuja **4 fondos de zona distintos** (`zoneColor()`, L434-440) más entidades por tipo de carril. Esto no encaja en los 10 campos base de `GamePalette` sin perder fidelidad, así que se agregan 15 roles opcionales nuevos.

| Rol (`GamePalette`)                       | Uso en el engine actual                                                                                                                               | Origen (línea) |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `entidadPrincipal`                        | Cuerpo de la rana (`drawFrog`)                                                                                                                        | L530           |
| `entidadSecundaria`                       | Cuerpo del camión (`drawEntities`, tipo `truck`)                                                                                                      | L485           |
| `peligro`                                 | Cuerpo del auto (`drawEntities`, tipo `car`)                                                                                                          | L477           |
| `acento`                                  | Marcador de meta ocupada, elipse verde (`drawBackground`)                                                                                             | L454           |
| `hud`                                     | Texto `SCORE`/`NIVEL`/corazones de vidas (`drawHUD`)                                                                                                  | L547           |
| `overlay`                                 | Título `"GAME OVER"` (`drawOverlay`)                                                                                                                  | L565           |
| `textoHud`                                | Subtítulo `"PUNTAJE: X"` (`drawOverlay`) — **hoy usa el mismo `#ffffff` que `overlay`, sin dimming** (deviación propia de este motor, ver Decisiones) | L565, L568     |
| `fondo` _(alias, sin consumidor directo)_ | Requerido por `GamePalette`; Frogger no tiene un único `fillRect` de limpieza — se fija al mismo valor que `zonaSegura`                               | N/A            |
| `proyectil` _(alias, sin uso)_            | Sin consumidor: Frogger no dibuja proyectiles. Fijado al valor de `peligro`.                                                                          | N/A            |
| `particula` _(alias, sin uso)_            | Sin consumidor: Frogger no dibuja partículas/explosiones. Fijado al valor de `acento`.                                                                | N/A            |
| `zonaMeta` _(nuevo)_                      | Fondo de la fila de metas, fila 0 (`zoneColor`)                                                                                                       | L435           |
| `zonaRio` _(nuevo)_                       | Fondo de las filas de río (`zoneColor`)                                                                                                               | L436           |
| `zonaSegura` _(nuevo)_                    | Fondo de la franja media segura y valor de retorno por defecto de `zoneColor`                                                                         | L437, L439     |
| `zonaCarretera` _(nuevo)_                 | Fondo de las filas de carretera (`zoneColor`)                                                                                                         | L438           |
| `casillaMetaFondo` _(nuevo)_              | Relleno de cada una de las 5 bocas de meta (`drawBackground`)                                                                                         | L448           |
| `casillaMetaBorde` _(nuevo)_              | Borde de cada boca de meta (`drawBackground`)                                                                                                         | L450-452       |
| `auto` _(nuevo, alias documentado)_       | Igual valor que `peligro` — cuerpo del auto; se declara aparte porque conceptualmente es "un tipo de entidad", no solo "el peligro genérico"          | L477           |
| `autoRueda` _(nuevo)_                     | Ruedas del auto (`drawEntities`, tipo `car`)                                                                                                          | L479-483       |
| `camionCabina` _(nuevo)_                  | Cabina/detalle oscuro del camión (`drawEntities`, tipo `truck`)                                                                                       | L487-488       |
| `tronco` _(nuevo)_                        | Cuerpo del tronco (`drawEntities`, tipo `log`)                                                                                                        | L490-491       |
| `troncoVeta` _(nuevo)_                    | Líneas de veta del tronco (`drawEntities`, tipo `log`)                                                                                                | L492-499       |
| `tortuga` _(nuevo)_                       | Cuerpo de la tortuga (`drawEntities`, tipo `turtle`; alpha de sumersión ya lo maneja la lógica de juego, no la paleta)                                | L500-511       |
| `barraTiempoSegura` _(nuevo)_             | Barra de tiempo cuando `ratio > 0.5` (`drawHUD`)                                                                                                      | L559           |
| `barraTiempoAlerta` _(nuevo)_             | Barra de tiempo cuando `0.2 < ratio ≤ 0.5` (`drawHUD`)                                                                                                | L559           |
| `barraTiempoPeligro` _(nuevo)_            | Barra de tiempo cuando `ratio ≤ 0.2` (`drawHUD`)                                                                                                      | L559           |

Roles **no** parametrizados por este spec (fijos en las 3 skins, detalle facial menor sin impacto temático):

- Ojos de la rana: blanco `#ffffff` y pupila `#000000` (`drawFrog`, L534-543). Son dos círculos de 3px/1.5px de radio — variarlos por skin no aporta legibilidad y complica el inventario sin beneficio visual perceptible a ese tamaño.

`GamePalette` gana **15 campos opcionales** (`zonaMeta`, `zonaRio`, `zonaSegura`, `zonaCarretera`, `casillaMetaFondo`, `casillaMetaBorde`, `auto`, `autoRueda`, `camionCabina`, `tronco`, `troncoVeta`, `tortuga`, `barraTiempoSegura`, `barraTiempoAlerta`, `barraTiempoPeligro`) — segunda extensión del tipo compartido desde SPEC 13 (Arkanoid), sin tocar los campos existentes.

---

## Las 3 skins

### `clasico` (default — idéntico al engine actual)

| Rol                          | Hex / valor                                           |
| ---------------------------- | ----------------------------------------------------- |
| `zonaMeta`                   | `#052a12`                                             |
| `zonaRio`                    | `#001d3d`                                             |
| `zonaSegura`                 | `#06331a`                                             |
| `zonaCarretera`              | `#0a0a0a`                                             |
| `casillaMetaFondo`           | `#0b4a22`                                             |
| `casillaMetaBorde`           | `#d4af37`                                             |
| `acento` (meta ocupada)      | `#33ff66`                                             |
| `entidadPrincipal` (rana)    | `#39ff5c`                                             |
| `peligro`/`auto`             | `#ff2d55`                                             |
| `autoRueda`                  | `#222222`                                             |
| `entidadSecundaria` (camión) | `#8c8c9c`                                             |
| `camionCabina`               | `#555555`                                             |
| `tronco`                     | `#7a4a1f`                                             |
| `troncoVeta`                 | `#5a3414`                                             |
| `tortuga`                    | `#2fbf5a`                                             |
| `hud`                        | `#ffffff`                                             |
| `overlay`                    | `#ffffff`                                             |
| `textoHud`                   | `#ffffff` (= `overlay`, sin dimming — ver Decisiones) |
| `barraTiempoSegura`          | `#33ff66`                                             |
| `barraTiempoAlerta`          | `#f5ff00`                                             |
| `barraTiempoPeligro`         | `#ff2d55`                                             |
| `fondo` _(alias)_            | `#06331a` (= `zonaSegura`, sin consumidor directo)    |
| `proyectil` _(alias)_        | `#ff2d55` (= `peligro`, sin uso)                      |
| `particula` _(alias)_        | `#33ff66` (= `acento`, sin uso)                       |

**Desviación aceptada:** ninguna de las 4 zonas usa negro puro `#000000` (la más oscura es `zonaCarretera: #0a0a0a`), así que `clasico` de Frogger **sí cumple** la regla de "sin negro puro", a diferencia de Asteroides/Snake/Arkanoid. Se documenta el contraste `tronco` vs `zonaRio` (2.27:1, bajo el mínimo de 3:1 para entidades) como deuda **preexistente del engine actual**, no introducida por este spec — ver Riesgos.

### `neon` (tokens del sitio, con esquema semi-cromático por zona para mantener el tablero legible)

| Rol                          | Hex / valor                      | Notas                                                                                                 |
| ---------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `zonaMeta`                   | `#001d17`                        | Verde-cian muy oscuro, distinto de `zonaSegura`                                                       |
| `zonaRio`                    | `#001522`                        | Azul-cian muy oscuro                                                                                  |
| `zonaSegura`                 | `#0a0a0f`                        | = `--bg` del sitio                                                                                    |
| `zonaCarretera`              | `#050507`                        | Más oscuro que `--bg`, sin llegar a negro puro                                                        |
| `casillaMetaFondo`           | `#003d2e`                        | Verde-cian oscuro, resalta contra `zonaMeta`                                                          |
| `casillaMetaBorde`           | `#00f5ff` (`--cyan`)             | Borde de meta con glow en vez del dorado clásico                                                      |
| `acento` (meta ocupada)      | `#00ff88` (`--green`)            | Marcador de éxito                                                                                     |
| `entidadPrincipal` (rana)    | `#00f5ff` (`--cyan`)             | Con `shadowBlur` ~10 decorativo, no requerido para legibilidad                                        |
| `peligro`/`auto`             | `#ff006e` (`--magenta`)          | Auto: peligro principal de carretera                                                                  |
| `autoRueda`                  | `#1a1a1f`                        | Rueda casi neutra, detalle menor                                                                      |
| `entidadSecundaria` (camión) | `#f5ff00` (`--yellow`)           | Hue muy distinto del auto — se distinguen por color y por brillo (ver tabla de grises)                |
| `camionCabina`               | `#b3b300`                        | Amarillo oscurecido para la cabina                                                                    |
| `tronco`                     | `#b35f1a`                        | Naranja quemado — hue "madera" distinto del cian/verde/magenta del resto                              |
| `troncoVeta`                 | `#7a3f10`                        | Naranja quemado más oscuro                                                                            |
| `tortuga`                    | `#00ff88` (`--green`)            | Mismo verde que `acento` — refuerzo temático "verde = seguro"                                         |
| `hud`                        | `#00f5ff` (`--cyan`)             | Texto SCORE/NIVEL/vidas                                                                               |
| `overlay`                    | `#f5ff00` (`--yellow`)           | Título "GAME OVER", máximo contraste                                                                  |
| `textoHud`                   | `rgba(255, 255, 255, 0.75)`      | Blanco translúcido — a diferencia de `clasico`, aquí sí se diferencia de `overlay` para dar jerarquía |
| `barraTiempoSegura`          | `#00ff88` (`--green`)            |                                                                                                       |
| `barraTiempoAlerta`          | `#f5ff00` (`--yellow`)           |                                                                                                       |
| `barraTiempoPeligro`         | `#ff006e` (`--magenta`)          |                                                                                                       |
| `fondo` _(alias)_            | `#0a0a0f` (= `zonaSegura`)       |                                                                                                       |
| `proyectil` _(alias)_        | `#ff006e` (= `peligro`, sin uso) |                                                                                                       |
| `particula` _(alias)_        | `#00ff88` (= `acento`, sin uso)  |                                                                                                       |

`shadowBlur` es decorativo: todos los roles cumplen el mínimo de contraste sin animación ni parpadeo, respetando `prefers-reduced-motion` (`app/globals.css`, bloque final).

### `retro` (esquema semáforo — ámbar/verde/rojo, sin glow, monocromo por brillo)

Frogger es, temáticamente, un juego de cruzar una vía — se aprovecha el código de colores de semáforo (verde = seguro, ámbar = jugador/HUD, rojo = peligro) en vez de un monocromo estricto de un solo hue, igual que `retro` de Arkanoid usó ámbar en vez del verde fósforo de Asteroides/Snake para diferenciarse.

| Rol                          | Hex / valor                      | Notas                                                                                                                                             |
| ---------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zonaMeta`                   | `#1a0f00`                        | Ámbar casi negro                                                                                                                                  |
| `zonaRio`                    | `#0d0a00`                        | Marrón casi negro                                                                                                                                 |
| `zonaSegura`                 | `#150d00`                        | Ámbar casi negro, intermedio                                                                                                                      |
| `zonaCarretera`              | `#0a0700`                        | El más oscuro de los 4, sin llegar a negro puro                                                                                                   |
| `casillaMetaFondo`           | `#2a1800`                        | Ámbar oscuro                                                                                                                                      |
| `casillaMetaBorde`           | `#ffb000`                        | Ámbar brillante                                                                                                                                   |
| `acento` (meta ocupada)      | `#33cc70`                        | Verde "seguro" — la meta llena es un éxito, coherente con el semáforo                                                                             |
| `entidadPrincipal` (rana)    | `#ffb000`                        | Ámbar brillante, el color más luminoso del tablero junto al HUD                                                                                   |
| `peligro`/`auto`             | `#ff3300`                        | Rojo — semáforo "alto"                                                                                                                            |
| `autoRueda`                  | `#402000`                        | Ámbar muy oscuro, detalle menor                                                                                                                   |
| `entidadSecundaria` (camión) | `#c9b382`                        | Tostado claro — se distingue del auto rojo por hue y por brillo, aunque el margen en escala de grises es más ajustado que en `neon` (ver Riesgos) |
| `camionCabina`               | `#8a7550`                        | Tostado oscurecido                                                                                                                                |
| `tronco`                     | `#8a5a1f`                        | Marrón-ámbar, "madera"                                                                                                                            |
| `troncoVeta`                 | `#5c3b14`                        | Marrón-ámbar más oscuro                                                                                                                           |
| `tortuga`                    | `#33cc70`                        | Verde — mismo verde que `acento`, "verde = seguro" también para el soporte flotante                                                               |
| `hud`                        | `#ffb000`                        | Texto SCORE/NIVEL/vidas                                                                                                                           |
| `overlay`                    | `#ffb000`                        | Título "GAME OVER"                                                                                                                                |
| `textoHud`                   | `#b3792a`                        | Ámbar apagado — sí se diferencia de `overlay`, igual criterio que `neon`                                                                          |
| `barraTiempoSegura`          | `#33cc70`                        | Verde — coherente con el semáforo                                                                                                                 |
| `barraTiempoAlerta`          | `#ffb000`                        | Ámbar                                                                                                                                             |
| `barraTiempoPeligro`         | `#ff3300`                        | Rojo                                                                                                                                              |
| `fondo` _(alias)_            | `#150d00` (= `zonaSegura`)       |                                                                                                                                                   |
| `proyectil` _(alias)_        | `#ff3300` (= `peligro`, sin uso) |                                                                                                                                                   |
| `particula` _(alias)_        | `#33cc70` (= `acento`, sin uso)  |                                                                                                                                                   |

`image-rendering: pixelated` no aplica: el motor es 100% vectorial (`fillRect`/`arc`/`ellipse`), sin sprites ni `<img>`.

---

## Tabla de contraste (WCAG, luminancia relativa)

Umbral: **4.5:1** para texto de HUD (`hud`, `overlay`, `textoHud`), **3:1** para entidades jugables y elementos gráficos de estado (`entidadPrincipal`, `entidadSecundaria`, `peligro`/`auto`, `tronco`, `tortuga`, `acento`, `casillaMetaBorde`, la barra de tiempo en sus 3 estados). `--bg` del sitio es `#0a0a0f` (L = 0.00316); en `neon`, `zonaSegura` **es** ese color.

| Skin      | Rol                          | Color                   | Fondo de referencia        | Ratio      | ¿Pasa?                             |
| --------- | ---------------------------- | ----------------------- | -------------------------- | ---------- | ---------------------------------- |
| `clasico` | `entidadPrincipal` (rana)    | `#39ff5c`               | `zonaSegura #06331a`       | 10.45:1    | Sí                                 |
| `clasico` | `entidadPrincipal` (rana)    | `#39ff5c`               | `zonaRio #001d3d`          | 12.58:1    | Sí                                 |
| `clasico` | `entidadPrincipal` (rana)    | `#39ff5c`               | `zonaMeta #052a12`         | 11.61:1    | Sí                                 |
| `clasico` | `entidadPrincipal` (rana)    | `#39ff5c`               | `zonaCarretera #0a0a0a`    | 14.74:1    | Sí                                 |
| `clasico` | `peligro`/`auto`             | `#ff2d55`               | `zonaCarretera #0a0a0a`    | 5.43:1     | Sí                                 |
| `clasico` | `entidadSecundaria` (camión) | `#8c8c9c`               | `zonaCarretera #0a0a0a`    | 5.98:1     | Sí                                 |
| `clasico` | `tronco`                     | `#7a4a1f`               | `zonaRio #001d3d`          | **2.27:1** | **No** (ver Riesgos)               |
| `clasico` | `tortuga`                    | `#2fbf5a`               | `zonaRio #001d3d`          | 7.02:1     | Sí                                 |
| `clasico` | `acento` (meta ocupada)      | `#33ff66`               | `casillaMetaFondo #0b4a22` | 7.75:1     | Sí                                 |
| `clasico` | `casillaMetaBorde`           | `#d4af37`               | `casillaMetaFondo #0b4a22` | 4.95:1     | Sí                                 |
| `clasico` | `hud`                        | `#ffffff`               | `zonaMeta #052a12`         | 15.60:1    | Sí                                 |
| `clasico` | `overlay`                    | `#ffffff`               | `zonaCarretera #0a0a0a`    | 19.80:1    | Sí                                 |
| `clasico` | `textoHud`                   | `#ffffff`               | `zonaCarretera #0a0a0a`    | 19.80:1    | Sí                                 |
| `clasico` | `barraTiempoSegura`          | `#33ff66`               | `zonaMeta #052a12`         | 11.61:1    | Sí                                 |
| `clasico` | `barraTiempoAlerta`          | `#f5ff00`               | `zonaMeta #052a12`         | 14.25:1    | Sí                                 |
| `clasico` | `barraTiempoPeligro`         | `#ff2d55`               | `zonaMeta #052a12`         | 4.28:1     | Sí (umbral 3:1, indicador gráfico) |
| `neon`    | `entidadPrincipal` (rana)    | `#00f5ff`               | `zonaSegura #0a0a0f`       | 14.58:1    | Sí                                 |
| `neon`    | `entidadPrincipal` (rana)    | `#00f5ff`               | `zonaRio #001522`          | 13.72:1    | Sí                                 |
| `neon`    | `entidadPrincipal` (rana)    | `#00f5ff`               | `zonaMeta #001d17`         | 13.05:1    | Sí                                 |
| `neon`    | `entidadPrincipal` (rana)    | `#00f5ff`               | `zonaCarretera #050507`    | 15.04:1    | Sí                                 |
| `neon`    | `peligro`/`auto`             | `#ff006e`               | `zonaCarretera #050507`    | 5.31:1     | Sí                                 |
| `neon`    | `entidadSecundaria` (camión) | `#f5ff00`               | `zonaCarretera #050507`    | 18.61:1    | Sí                                 |
| `neon`    | `tronco`                     | `#b35f1a`               | `zonaRio #001522`          | 4.04:1     | Sí                                 |
| `neon`    | `tortuga`                    | `#00ff88`               | `zonaRio #001522`          | 13.85:1    | Sí                                 |
| `neon`    | `acento` (meta ocupada)      | `#00ff88`               | `casillaMetaFondo #003d2e` | 9.17:1     | Sí                                 |
| `neon`    | `casillaMetaBorde`           | `#00f5ff`               | `casillaMetaFondo #003d2e` | 9.08:1     | Sí                                 |
| `neon`    | `hud`                        | `#00f5ff`               | `zonaMeta #001d17`         | 13.05:1    | Sí                                 |
| `neon`    | `overlay`                    | `#f5ff00`               | `zonaCarretera #050507`    | 18.61:1    | Sí                                 |
| `neon`    | `textoHud`                   | `rgba(255,255,255,.75)` | `zonaCarretera #050507`    | 12.06:1    | Sí                                 |
| `neon`    | `barraTiempoSegura`          | `#00ff88`               | `zonaMeta #001d17`         | 13.18:1    | Sí                                 |
| `neon`    | `barraTiempoAlerta`          | `#f5ff00`               | `zonaMeta #001d17`         | 16.15:1    | Sí                                 |
| `neon`    | `barraTiempoPeligro`         | `#ff006e`               | `zonaMeta #001d17`         | 4.61:1     | Sí                                 |
| `retro`   | `entidadPrincipal` (rana)    | `#ffb000`               | `zonaSegura #150d00`       | 10.52:1    | Sí                                 |
| `retro`   | `entidadPrincipal` (rana)    | `#ffb000`               | `zonaRio #0d0a00`          | 10.81:1    | Sí                                 |
| `retro`   | `entidadPrincipal` (rana)    | `#ffb000`               | `zonaMeta #1a0f00`         | 10.31:1    | Sí                                 |
| `retro`   | `entidadPrincipal` (rana)    | `#ffb000`               | `zonaCarretera #0a0700`    | 10.99:1    | Sí                                 |
| `retro`   | `peligro`/`auto`             | `#ff3300`               | `zonaCarretera #0a0700`    | 5.49:1     | Sí                                 |
| `retro`   | `entidadSecundaria` (camión) | `#c9b382`               | `zonaCarretera #0a0700`    | 9.83:1     | Sí                                 |
| `retro`   | `tronco`                     | `#8a5a1f`               | `zonaRio #0d0a00`          | 3.36:1     | Sí                                 |
| `retro`   | `tortuga`                    | `#33cc70`               | `zonaRio #0d0a00`          | 9.44:1     | Sí                                 |
| `retro`   | `acento` (meta ocupada)      | `#33cc70`               | `casillaMetaFondo #2a1800` | 8.15:1     | Sí                                 |
| `retro`   | `casillaMetaBorde`           | `#ffb000`               | `casillaMetaFondo #2a1800` | 9.33:1     | Sí                                 |
| `retro`   | `hud`                        | `#ffb000`               | `zonaMeta #1a0f00`         | 10.31:1    | Sí                                 |
| `retro`   | `overlay`                    | `#ffb000`               | `zonaCarretera #0a0700`    | 10.99:1    | Sí                                 |
| `retro`   | `textoHud`                   | `#b3792a`               | `zonaCarretera #0a0700`    | 5.45:1     | Sí                                 |
| `retro`   | `barraTiempoSegura`          | `#33cc70`               | `zonaMeta #1a0f00`         | 9.00:1     | Sí                                 |
| `retro`   | `barraTiempoAlerta`          | `#ffb000`               | `zonaMeta #1a0f00`         | 10.31:1    | Sí                                 |
| `retro`   | `barraTiempoPeligro`         | `#ff3300`               | `zonaMeta #1a0f00`         | 5.15:1     | Sí                                 |

Todos los roles de `neon` se verifican también contra `--bg #0a0a0f`: `zonaSegura` **es** ese color en `neon`, y las demás zonas son más oscuras, así que cualquier ratio que pasa en la tabla también pasa contra `--bg`. En `retro`, las 4 zonas son más oscuras que `--bg`, mismo razonamiento. `clasico` se verifica contra sus propios fondos de zona (ninguno es negro puro, así que no aplica la comparación adicional contra `--bg` como excepción).

**Distinción en escala de grises (pares adyacentes: auto/camión en carretera, tronco/tortuga en río):**

| Skin      | Par                                                   | L(a)  | L(b)  | Ratio      | Evaluación                                                                                                       |
| --------- | ----------------------------------------------------- | ----- | ----- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `clasico` | `tronco` vs `tortuga`                                 | 0.091 | 0.386 | 3.09:1     | Se distinguen                                                                                                    |
| `clasico` | `peligro`/auto vs `entidadSecundaria`/camión          | 0.238 | 0.267 | **1.10:1** | **No se distinguen bien en grises** — deuda preexistente del engine (ver Riesgos)                                |
| `neon`    | `tronco` vs `tortuga`                                 | 0.178 | 0.733 | 3.43:1     | Se distinguen con claridad                                                                                       |
| `neon`    | `peligro`/auto vs `entidadSecundaria`/camión          | 0.224 | 0.909 | 3.50:1     | Se distinguen con claridad                                                                                       |
| `retro`   | `tronco` vs `tortuga`                                 | 0.128 | 0.451 | 2.81:1     | Se distinguen, margen algo ajustado (ver Riesgos)                                                                |
| `retro`   | `peligro`/auto vs `entidadSecundaria`/camión          | 0.236 | 0.463 | 1.79:1     | Se distinguen por brillo de forma moderada; el hue (rojo vs tostado) es el diferenciador principal (ver Riesgos) |
| `retro`   | `entidadSecundaria`/camión vs `entidadPrincipal`/rana | 0.463 | 0.523 | 1.12:1     | Muy próximos en brillo; distinguibles por hue (tostado vs ámbar), riesgo menor (ver Riesgos)                     |

---

## Plan de implementación

### Paso 1 — Extender `GamePalette` y agregar `frogger` a `lib/games/skins.ts`

- Agregar los 15 campos opcionales nuevos al tipo `GamePalette` (`zonaMeta`, `zonaRio`, `zonaSegura`, `zonaCarretera`, `casillaMetaFondo`, `casillaMetaBorde`, `auto`, `autoRueda`, `camionCabina`, `tronco`, `troncoVeta`, `tortuga`, `barraTiempoSegura`, `barraTiempoAlerta`, `barraTiempoPeligro`), documentados con un comentario igual al que ya existe para los campos de Arkanoid ("Roles propios de Frogger: 4 fondos de zona + vehículos + río + meta + barra de tiempo. Ver `specs/16-skins-frogger.md`").
- Agregar la clave `frogger` a `SKINS` (`GameId` ya incluye `"frogger"` desde que se creó el archivo) con las 3 paletas de la sección anterior.
- No se toca `asteroides`, `snake`, `arkanoid`, el resto de campos de `GamePalette`, `DEFAULT_SKIN` ni `getPalette`.

### Paso 2 — Migrar `lib/games/frogger/engine.ts`

- Cambiar la firma a `createFroggerEngine(canvas, callbacks, palette = getPalette("frogger", "clasico"))`, guardando `palette` en una variable mutable del closure (mismo patrón que Asteroides/Snake/Arkanoid).
- `zoneColor(row)` (L434-440): sustituir los 4 literales por `palette.zonaMeta`/`palette.zonaRio`/`palette.zonaSegura`/`palette.zonaCarretera`.
- `drawBackground()` (L442-468): `#0b4a22` → `palette.casillaMetaFondo`, `#d4af37` → `palette.casillaMetaBorde`, `#33ff66` (elipse de meta ocupada) → `palette.acento`.
- `drawEntities()` (L470-515): auto (`#ff2d55` → `palette.auto`, `#222` → `palette.autoRueda`), camión (`#8c8c9c` → `palette.entidadSecundaria`, `#555` → `palette.camionCabina`), tronco (`#7a4a1f` → `palette.tronco`, `#5a3414` → `palette.troncoVeta`), tortuga (`#2fbf5a` → `palette.tortuga`; el `globalAlpha` de sumersión no cambia, es lógica de juego, no color).
- `drawFrog()` (L517-544): `#39ff5c` → `palette.entidadPrincipal`. Los círculos de ojos (`#fff`/`#000`) **no se parametrizan** (ver Inventario de roles).
- `drawHUD()` (L546-561): `#ffffff` del texto → `palette.hud`; los 3 literales de la barra de tiempo (`#33ff66`/`#f5ff00`/`#ff2d55`) → `palette.barraTiempoSegura`/`palette.barraTiempoAlerta`/`palette.barraTiempoPeligro`.
- `drawOverlay()` (L563-570): el único `#ffffff` que colorea tanto título como subtítulo se reemplaza por dos asignaciones separadas: `palette.overlay` antes de `fillText(title, ...)` y `palette.textoHud` antes de `fillText(sub, ...)` — esto es lo que permite que `neon`/`retro` diferencien overlay y subtítulo aunque `clasico` los mantenga iguales (ver Decisiones).
- Leer `palette.<rol>` dentro de cada función `draw*`/`zoneColor`, nunca cachear el color fuera del closure mutable — así `setPalette` se refleja en el siguiente frame sin reiniciar `frog`/`lanes`/`score`/`lives`/`level`/`roundTimer`.
- Implementar `setPalette(next: GamePalette)` que reasigna la variable de paleta del closure y se agrega al objeto retornado (`{ start, pause, resume, restart, destroy, setPalette }`).
- Sin cambios a `buildLanes`, `buildRoadLane`, `buildRiverLane`, `spawnFrog`, `initGame`, `onKeyDown`, `tryStartJump`, `resetFrogPosition`, `completeRound`, `killFrog`, `checkRoadCollision`, `getSupport`, `goalIndexForCol`, `resolveLanding`, `update`, `loop` — ningún literal de lógica de juego (velocidad, tiempo, colisión, puntaje) se toca.

### Paso 3 — Verificación manual

`npm run dev`, jugar `/juegos/frogger/jugar` en las 3 skins: confirmar que el selector de skin aparece automáticamente, que cambiar de skin a mitad de ronda no reinicia la posición de la rana, el temporizador, las bocas ya ocupadas ni el puntaje, que los colores coinciden con la tabla de este spec, que las 4 zonas del tablero (meta/río/franja segura/carretera) siguen siendo distinguibles entre sí en las 3 skins, y que `clasico` es visualmente idéntico al comportamiento de Frogger previo a este spec.

### Paso 4 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

- [ ] `lib/games/skins.ts` tiene los 15 campos opcionales nuevos en `GamePalette` y la entrada `frogger` en `SKINS` con las 3 skins de este spec; `asteroides`, `snake`, `arkanoid` y los campos existentes no cambian.
- [ ] `lib/games/frogger/engine.ts` no tiene ningún literal de color hardcodeado (salvo los ojos de la rana, documentados como fijos) — todos vienen de `palette.<rol>`.
- [ ] `createFroggerEngine(canvas, callbacks)` sin tercer argumento sigue funcionando exactamente igual que antes de este spec (paleta `clasico` por defecto).
- [ ] `setPalette` cambia los colores del siguiente frame sin reiniciar la ronda, la posición de la rana, las bocas ocupadas, el temporizador, el puntaje, las vidas ni el nivel.
- [ ] El selector de skin aparece automáticamente en `/juegos/frogger/jugar` sin ningún cambio en `components/game-player.tsx`.
- [ ] La skin elegida persiste en `localStorage` (`av_skin`) entre partidas y recargas (comportamiento genérico ya existente, verificado también para Frogger).
- [ ] Los 48 pares color/fondo de la tabla de contraste cumplen su umbral, salvo el caso documentado de `clasico`/`tronco` vs `zonaRio` (deuda preexistente aceptada explícitamente, no introducida por este spec).
- [ ] Ninguna de las 4 zonas de `neon` ni de `retro` usa negro puro `#000000`; `clasico` tampoco lo usa (a diferencia de Asteroides/Snake/Arkanoid, el engine actual de Frogger ya evita el negro puro).
- [ ] `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` (si ya implementado) siguen mostrando su comportamiento sin regresión; ningún otro engine se modifica.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores nuevos.

---

## Decisiones tomadas y descartadas

### Extender `GamePalette` con 15 campos opcionales propios de Frogger en vez de forzar sus 4 fondos de zona en los roles genéricos existentes

- **Sí:** Frogger es el primer motor con más de un color de "fondo" simultáneo en pantalla (meta/río/franja segura/carretera, todas visibles a la vez). Forzar eso en el único campo `fondo` de `GamePalette` habría perdido fidelidad visual o exigido lógica ad-hoc fuera de la paleta. El precedente de SPEC 13 (Arkanoid agregó `tinteSprites` + 7 `bloque*`) ya establece que extender el tipo con campos opcionales por juego es el patrón aceptado cuando un motor no encaja en el molde de Asteroides.
- **No:** mantener `GamePalette` cerrado a los 10 campos originales y resolver las 4 zonas con un solo color interpolado — se descarta porque degradaría la lectura del tablero (meta/río/carretera dejarían de ser visualmente distintos), rompiendo la mecánica central del juego (saber en qué franja está la rana).

### Esquema "semáforo" (verde/ámbar/rojo) para la skin `retro`, en vez de un monocromo fósforo puro

- **Sí:** Frogger trata sobre cruzar una vía; el código de colores de semáforo (verde = seguro, ámbar = jugador/HUD, rojo = peligro) es temáticamente coherente y ya tiene precedente de "retro no siempre es monocromo" en Arkanoid (ámbar en vez del verde fósforo de Asteroides/Snake). Reutilizar el mismo verde (`#33cc70`) para `acento`, `tortuga` y `barraTiempoSegura` refuerza la asociación "verde = seguro" en todo el tablero.
- **No:** verde fósforo monocromo puro (como Asteroides/Snake) — se descartó porque con 6+ tipos de entidad simultáneos (auto, camión, tronco, tortuga, rana, meta) un solo hue habría dependido en exceso de diferencias de brillo, con más riesgo de pares indistinguibles en escala de grises que el esquema semáforo de 3 hues.

### `overlay` y `textoHud` idénticos en `clasico` (ambos `#ffffff`), pero diferenciados en `neon`/`retro`

- **Sí:** `clasico` debe ser un cambio visualmente nulo respecto al engine actual — hoy `drawOverlay` usa el mismo `fillStyle` para título y subtítulo (a diferencia de Asteroides/Snake, que ya usaban blanco con alpha reducido para el subtítulo). Cambiar ese comportamiento en `clasico` violaría el mandato de "clasico = lo que el engine dibuja hoy, tal cual". En `neon`/`retro`, que son paletas nuevas sin ese mandato, sí se introduce la jerarquía título/subtítulo ya usada en los otros 3 juegos, por consistencia entre skins nuevas del catálogo.
- **No:** replicar el `#ffffff` sin dimming también en `neon`/`retro` — se descartó porque perdería la jerarquía visual título/subtítulo que sí tienen las otras 3 skins nuevas del sitio, sin ninguna razón de fidelidad que lo justifique (a diferencia de `clasico`, `neon`/`retro` no tienen que replicar nada existente).

### `auto` como alias explícito de `peligro` en vez de un solo rol

- **Sí:** conceptualmente el auto es tanto "el peligro genérico de la carretera" (rol heredado del `GamePalette` compartido) como "un tipo de entidad con su propio color de rueda" (`autoRueda`). Declarar `auto` aparte de `peligro` documenta la intención sin duplicar lógica: en `lib/games/skins.ts` ambos campos llevan el mismo hex por convención, y el engine puede leer cualquiera de los dos (se usa `palette.auto` en el `draw*` para que quede explícito qué se está pintando).
- **No:** usar únicamente `palette.peligro` sin el alias `auto` — válido y más simple, pero se prefiere el alias documentado porque mejora la legibilidad del propio código del engine (`palette.auto` es más claro que `palette.peligro` dentro de `if (entity.type === "car")`).

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                                           | Mitigación                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clasico`/`tronco` (`#7a4a1f`) vs `zonaRio` (`#001d3d`) da 2.27:1, bajo el mínimo de 3:1 para entidades. Es un color real del engine hoy en producción, no introducido por este spec.                                                                                            | Se documenta como deuda preexistente aceptada (mismo tratamiento que el `fondo: #000000` de Asteroides/Snake/Arkanoid en sus respectivos specs). No se cambia el hex de `clasico` porque su mandato es ser visualmente nulo. Si se quiere corregir, requiere un spec de "ajuste de balance visual de Frogger" fuera de este flujo de skins. |
| `clasico`: `peligro`/auto (`#ff2d55`, L≈0.238) y `entidadSecundaria`/camión (`#8c8c9c`, L≈0.267) casi no se distinguen en escala de grises (1.10:1), aunque el hue (rojo vs gris) sí es muy distinto en visión de color normal.                                                  | Mismo tratamiento que el riesgo anterior: deuda preexistente del engine, documentada, no corregida en `clasico`. `neon` y `retro` sí resuelven este par con mayor margen (3.50:1 y 1.79:1 respectivamente).                                                                                                                                 |
| `retro`: `entidadSecundaria`/camión (`#c9b382`, L≈0.463) y `entidadPrincipal`/rana (`#ffb000`, L≈0.523) quedan muy próximos en brillo (1.12:1); si ambos aparecen cerca en pantalla (rana saltando junto a un camión) podrían confundirse en escala de grises.                   | El hue es claramente distinto (tostado vs ámbar) en visión de color normal, y ambos elementos rara vez ocupan la misma celda simultáneamente (la rana muere o se mueve al chocar). Riesgo menor, aceptado y documentado; no bloquea la skin.                                                                                                |
| `retro`: `tronco` (`#8a5a1f`, L≈0.128) vs `tortuga` (`#33cc70`, L≈0.451) da 2.81:1, ligeramente por debajo del heurístico interno de ~3:1 usado para pares adyacentes en este spec (aunque ambos individualmente sí superan 3:1 contra `zonaRio`).                               | Hue muy distinto (marrón vs verde) mitiga el riesgo en visión de color normal; verificación manual del Paso 3 debe confirmar que tronco y tortuga se distinguen a simple vista sobre el río en la skin `retro`.                                                                                                                             |
| Si algún `draw*` cachea `palette` en una variable local capturada antes de la reasignación de `setPalette` (en vez de leer la variable mutable del closure en cada llamada), el cambio de skin no se reflejaría hasta reiniciar.                                                 | El Paso 2 exige leer la variable de paleta del closure dentro de cada función `draw*`/`zoneColor`, nunca capturarla en un valor fijo al momento de crear el engine.                                                                                                                                                                         |
| `GamePalette` gana 15 campos opcionales nuevos (la extensión más grande hasta ahora, más que los 8 de Arkanoid) — riesgo de que el tipo se vuelva difícil de mantener a medida que se agregan más juegos con roles propios.                                                      | Aceptado como costo de mantener fidelidad visual completa por motor; si un quinto juego necesita otra extensión grande, evaluar en ese spec si conviene refactorizar `GamePalette` a un tipo genérico + extensión tipada por juego (fuera de alcance aquí).                                                                                 |
| Doble montaje en desarrollo (React `StrictMode`) podría dejar un `setPalette` aplicado a un engine ya destruido si el efecto de `game-player.tsx` no limpia la referencia a tiempo — mismo riesgo ya mitigado en Asteroides/Snake/Arkanoid.                                      | `engineRef.current` ya se pone en `null` en el cleanup existente; el selector de skin (genérico, sin cambios en este spec) ya usa optional chaining (`engineRef.current?.setPalette?.(...)`).                                                                                                                                               |
| Deuda conocida heredada (no se arregla en esta spec): `game.best`/`game.plays` no sincronizados con Supabase; sin `preventDefault()` completo fuera de flechas/WASD ya cubiertas (Frogger sí llama `preventDefault()` en su `onKeyDown`, L256); `insertScore` falla en silencio. | Aceptado como riesgo conocido, igual que en specs anteriores — fuera del alcance de un cambio de paletas.                                                                                                                                                                                                                                   |

---

## Qué **no** está en esta spec

- Cambios a `lib/games/skins.ts` más allá de agregar la entrada `frogger` y los 15 campos opcionales nuevos de `GamePalette` (`SkinId`, `GameId`, `DEFAULT_SKIN`, `getPalette`, ni las entradas `asteroides`/`snake`/`arkanoid` se tocan).
- Cambios a `lib/games/types.ts` o `components/game-player.tsx` — ya resueltos de forma genérica en SPEC 11.
- Variantes de `.cover-frogger` por skin en `app/globals.css`.
- Corregir el contraste `tronco`/`zonaRio` de `clasico` (2.27:1) — es una deuda preexistente del engine, no de este spec de skins; requeriría cambiar un color que hoy se juega en producción, fuera del mandato de "clasico = visualmente nulo".
- Controles táctiles, autenticación real, Supabase Realtime.
- Sonido o efectos distintos por skin.
- Sincronizar `game.best`/`game.plays` con datos reales.
- Cualquier cambio a la lógica de juego de Frogger (velocidad de carriles, tiempo por ronda, colisiones, puntaje, ciclo de sumersión de tortugas) — este spec toca únicamente color.

Cada uno de estos, si se necesita, va en su propia spec.
