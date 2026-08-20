# Registro de porte a móvil

Memoria del agente `mobile-porter`. No se borra historia — solo se actualiza estado y se agrega
la razón. Cada fila es un objetivo (juego o pantalla); cada ficha debajo documenta lo encontrado
en su auditoría.

## Estado

| Objetivo                                  | Táctil (SPEC 14) | Responsivo (SPEC 15) | Spec    | Fecha      |
| ----------------------------------------- | ---------------- | -------------------- | ------- | ---------- |
| asteroides / tetris / arkanoid / snake    | portado          | portado              | 14 / 15 | 2026-08-14 |
| 7 pantallas + Nav                         | n/a              | portado              | 15      | 2026-08-14 |
| frogger                                   | en-spec          | en-spec              | 17      | 2026-08-20 |
| juegos futuros (aún no en `lib/games.ts`) | pendiente        | pendiente            | —       | —          |

Notas:

- No existe hoy ningún breakpoint `@media (max-width: 480px)` dedicado en `app/globals.css` — las
  reglas móviles de SPEC 15 se apoyaron en los breakpoints existentes (520/600/720/820/840/900/
  980/1100px) más el bloque `pointer: coarse`. Cerrar ese hueco explícito queda a criterio de cada
  ficha nueva que agregue `mobile-porter`.
- `lib/games/touch-config.ts` tipa `TOUCH_CONFIG: Record<GameId, TouchControlConfig>` — cualquier
  juego nuevo debe pasar por este agente (o por su spec) antes de compilar sin errores de tipo.

## Fichas

### frogger (`specs/17-movil-frogger.md`, 2026-08-20)

Motor real de paso discreto por salto (`lib/games/frogger/engine.ts`): cada `keydown` de flecha
asigna `pendingDir` una única vez y cualquier evento que llegue mientras `frog.animating` es
`true` (120 ms) se descarta — mismo patrón de Tetris, no un booleano continuo por frame como
Asteroides/Arkanoid/Snake.

Entrada `TOUCH_CONFIG.frogger` ya existía (mínima, solo para que `TouchControls` no rompiera el
tipado), pero con `repeatCodes: []`, lo cual limitaba el D-pad táctil a "un toque = un salto".
Este spec la corrige:

| Slot    | `code`       | `repeatCodes` |
| ------- | ------------ | ------------- |
| up      | `ArrowUp`    | sí            |
| down    | `ArrowDown`  | sí            |
| left    | `ArrowLeft`  | sí            |
| right   | `ArrowRight` | sí            |
| buttonA | `null`       | n/a           |
| buttonB | `null`       | n/a           |

Auditoría estática de desborde 360–428px (Paso 3 del spec): **sin hallazgos** atribuibles a
Frogger. `.frogger-canvas` (`app/globals.css:1131-1141`) ya sigue el patrón fluido de
`.tetris-canvas` (altura 100%, ancho auto, sin `px` fijo); `.cover-frogger`
(`app/globals.css:808-831`) no fija anchos propios; el HUD con 3 botones de skin + 3 acciones ya
lo cubre el fix genérico de SPEC 15 (`.hud-actions`, `flex-wrap`); `.touch-controls` sin botones
de acción (solo D-pad, 160px de ancho total) no genera overflow. Único trabajo real: la
corrección de `repeatCodes` arriba.

_(próxima ficha se agrega aquí cuando `mobile-porter` complete su Paso 5 sobre otro objetivo)_
