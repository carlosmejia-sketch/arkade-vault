# Juegos con skins — registro

Estados: `pendiente` · `en-spec` · `implementado`

| Juego      | ID           | clasico | neon | retro | Estado    | Spec                           | Fecha      |
| ---------- | ------------ | ------- | ---- | ----- | --------- | ------------------------------ | ---------- |
| Asteroides | `asteroides` | ✓       | ✓    | ✓     | en-spec   | `specs/11-skins-asteroides.md` | 2026-08-14 |
| Tetris     | `tetris`     | —       | —    | —     | pendiente | —                              | —          |
| Arkanoid   | `arkanoid`   | —       | —    | —     | pendiente | —                              | —          |
| Snake      | `snake`      | —       | —    | —     | pendiente | —                              | —          |

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
