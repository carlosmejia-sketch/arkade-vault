// Tipos compartidos por todos los motores de juego reales (canvas + rAF).
// Extraído de lib/games/asteroides/engine.ts al agregar el segundo motor real (Tetris).

import type { GamePalette } from "./skins";

export type EngineCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type Engine = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  destroy: () => void;
  setPalette?: (palette: GamePalette) => void;
};

export type EngineFactory = (
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  palette?: GamePalette,
) => Engine;
