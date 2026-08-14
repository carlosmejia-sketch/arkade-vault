# Registro de porte a móvil

Memoria del agente `mobile-porter`. No se borra historia — solo se actualiza estado y se agrega
la razón. Cada fila es un objetivo (juego o pantalla); cada ficha debajo documenta lo encontrado
en su auditoría.

## Estado

| Objetivo                                  | Táctil (SPEC 14) | Responsivo (SPEC 15) | Spec    | Fecha      |
| ----------------------------------------- | ---------------- | -------------------- | ------- | ---------- |
| asteroides / tetris / arkanoid / snake    | portado          | portado              | 14 / 15 | 2026-08-14 |
| 7 pantallas + Nav                         | n/a              | portado              | 15      | 2026-08-14 |
| juegos futuros (aún no en `lib/games.ts`) | pendiente        | pendiente            | —       | —          |

Notas:

- No existe hoy ningún breakpoint `@media (max-width: 480px)` dedicado en `app/globals.css` — las
  reglas móviles de SPEC 15 se apoyaron en los breakpoints existentes (520/600/720/820/840/900/
  980/1100px) más el bloque `pointer: coarse`. Cerrar ese hueco explícito queda a criterio de cada
  ficha nueva que agregue `mobile-porter`.
- `lib/games/touch-config.ts` tipa `TOUCH_CONFIG: Record<GameId, TouchControlConfig>` — cualquier
  juego nuevo debe pasar por este agente (o por su spec) antes de compilar sin errores de tipo.

## Fichas

_(sin fichas todavía — se agregan aquí, una por objetivo, cuando `mobile-porter` complete su
Paso 5 sobre un objetivo nuevo o pendiente)_
