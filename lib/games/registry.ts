// Registry id -> factory de motor. Un juego del catálogo (lib/games.ts) con
// `engine` seteado a una key presente acá tiene motor real y leaderboard real;
// sin esa key, GamePlayer/detalle/Salón de la Fama caen al mock existente.

import { createArkanoidEngine } from "./arkanoid/engine";
import { createAsteroidesEngine } from "./asteroides/engine";
import { createFroggerEngine } from "./frogger/engine";
import { createSnakeEngine } from "./snake/engine";
import { createTetrisEngine } from "./tetris/engine";
import type { EngineFactory } from "./types";

export const ENGINE_REGISTRY: Record<string, EngineFactory> = {
  asteroides: createAsteroidesEngine,
  tetris: createTetrisEngine,
  arkanoid: createArkanoidEngine,
  snake: createSnakeEngine,
  frogger: createFroggerEngine,
};
