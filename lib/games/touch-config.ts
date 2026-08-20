import type { GameId } from "@/lib/games/skins";

export type TouchButton = { code: string; label: string } | null;

export type TouchControlConfig = {
  up: string | null;
  down: string | null;
  left: string;
  right: string;
  buttonA: TouchButton;
  buttonB: TouchButton;
  repeatCodes: string[];
};

export const TOUCH_CONFIG: Record<GameId, TouchControlConfig> = {
  asteroides: {
    up: "ArrowUp",
    down: null,
    left: "ArrowLeft",
    right: "ArrowRight",
    buttonA: { code: "Space", label: "DISPARAR" },
    buttonB: null,
    repeatCodes: [],
  },
  tetris: {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    buttonA: { code: "Space", label: "CAÍDA RÁPIDA" },
    buttonB: null,
    repeatCodes: ["ArrowLeft", "ArrowRight", "ArrowDown"],
  },
  arkanoid: {
    up: null,
    down: null,
    left: "ArrowLeft",
    right: "ArrowRight",
    buttonA: null,
    buttonB: null,
    repeatCodes: [],
  },
  snake: {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    buttonA: null,
    buttonB: null,
    repeatCodes: [],
  },
  // Config mínima para que TouchControls no truene con Frogger — el diseño
  // táctil fino (tamaño de hitbox, layout) se cubre en el spec de mobile-porter.
  frogger: {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    buttonA: null,
    buttonB: null,
    repeatCodes: [],
  },
};
