// Motor del juego Snake: grilla 20x15 (40px/celda) sobre canvas 800x600,
// movimiento por turnos (tick de velocidad, no por frame de física continua).
//
// Reglas propias de esta spec (ver specs/09-juego-snake.md):
// - Wrap en los 4 bordes: la serpiente reaparece del lado opuesto, nunca muere
//   contra la pared.
// - Colisión contra la propia cola es la única causa de game over.
// - Fruta actual elegida al azar entre el atlas FRUIT_SPRITES cada vez que se
//   come una, dibujada con drawImage recortando fruits.png.
// - El canvas se recibe por parámetro; los listeners de teclado se agregan en
//   start() y se quitan en destroy(), nunca a nivel de módulo.
// - onScore/onLives/onLevel se invocan solo cuando el valor cambia
//   (emitIfChanged), igual que Asteroides/Tetris/Arkanoid.
// - Sin reinicio interno por teclado en game over: el único reinicio es
//   restart().

import type { Engine, EngineCallbacks } from "../types";
import { FRUIT_SPRITES, FRUIT_SHEET_SRC } from "./sprites";

const W = 800;
const H = 600;
const COLS = 20;
const ROWS = 15;
const CELL = 40;

const FRUIT_NAMES = Object.keys(FRUIT_SPRITES);
const FRUITS_PER_LEVEL = 5;
const TICK_START = 140; // ms por turno al iniciar
const TICK_MIN = 60; // ms por turno en velocidad máxima
const TICK_STEP = 6; // ms que baja el tick por cada level-up

type Dir = { x: number; y: number };
type Cell = { x: number; y: number };

const UP: Dir = { x: 0, y: -1 };
const DOWN: Dir = { x: 0, y: 1 };
const LEFT: Dir = { x: -1, y: 0 };
const RIGHT: Dir = { x: 1, y: 0 };

const isOpposite = (a: Dir, b: Dir) => a.x === -b.x && a.y === -b.y;

export type { EngineCallbacks };
export type SnakeEngine = Engine;

export function createSnakeEngine(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
): SnakeEngine {
  const ctx = canvas.getContext("2d")!;

  const fruitSheet = new Image();
  fruitSheet.src = FRUIT_SHEET_SRC;

  let snake: Cell[];
  let dir: Dir;
  let pendingDir: Dir;
  let fruit: Cell;
  let fruitName: string;
  let score: number;
  let level: number;
  let eatenCount: number;
  let tickMs: number;
  let state: "playing" | "gameover";

  let lastScore: number;
  let lastLives: number;
  let lastLevel: number;

  function emitIfChanged() {
    if (score !== lastScore) {
      lastScore = score;
      callbacks.onScore(score);
    }
    const lives = state === "gameover" ? 0 : 1;
    if (lives !== lastLives) {
      lastLives = lives;
      callbacks.onLives(lives);
    }
    if (level !== lastLevel) {
      lastLevel = level;
      callbacks.onLevel(level);
    }
  }

  function randomFreeCell(): Cell {
    const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
    let x: number, y: number;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
    } while (occupied.has(`${x},${y}`));
    return { x, y };
  }

  function spawnFruit() {
    fruit = randomFreeCell();
    fruitName = FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)];
  }

  function initGame() {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    snake = [
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
      { x: cx - 3, y: cy },
    ];
    dir = RIGHT;
    pendingDir = RIGHT;
    score = 0;
    level = 1;
    eatenCount = 0;
    tickMs = TICK_START;
    state = "playing";
    lastScore = -1;
    lastLives = -1;
    lastLevel = -1;
    spawnFruit();
    emitIfChanged();
  }

  function setDirection(next: Dir) {
    if (isOpposite(next, dir)) return;
    pendingDir = next;
  }

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        setDirection(UP);
        break;
      case "ArrowDown":
      case "KeyS":
        setDirection(DOWN);
        break;
      case "ArrowLeft":
      case "KeyA":
        setDirection(LEFT);
        break;
      case "ArrowRight":
      case "KeyD":
        setDirection(RIGHT);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  function step() {
    if (state !== "playing") return;

    dir = pendingDir;
    const head = snake[0];
    const newHead: Cell = {
      x: (head.x + dir.x + COLS) % COLS,
      y: (head.y + dir.y + ROWS) % ROWS,
    };

    const hitsTail = snake.some((s) => s.x === newHead.x && s.y === newHead.y);
    if (hitsTail) {
      state = "gameover";
      return;
    }

    snake.unshift(newHead);

    if (newHead.x === fruit.x && newHead.y === fruit.y) {
      score += 10;
      eatenCount++;
      if (eatenCount % FRUITS_PER_LEVEL === 0) {
        level++;
        tickMs = Math.max(TICK_MIN, tickMs - TICK_STEP);
      }
      spawnFruit();
    } else {
      snake.pop();
    }
  }

  function drawFruit() {
    const rect = FRUIT_SPRITES[fruitName];
    const dx = fruit.x * CELL;
    const dy = fruit.y * CELL;
    if (fruitSheet.complete && fruitSheet.naturalWidth > 0) {
      ctx.drawImage(
        fruitSheet,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        dx + 2,
        dy + 2,
        CELL - 4,
        CELL - 4,
      );
    } else {
      ctx.fillStyle = "#ff2d55";
      ctx.fillRect(dx + 4, dy + 4, CELL - 8, CELL - 8);
    }
  }

  function drawSnake() {
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#00ff88" : "rgba(0, 255, 136, 0.75)";
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  function drawHUD() {
    ctx.fillStyle = "#fff";
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${score}`, 14, 22);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${level}`, W / 2, 22);
  }

  function drawOverlay(title: string, sub: string) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, W / 2, H / 2 - 18);
    ctx.font = "18px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    drawFruit();
    drawSnake();
    drawHUD();

    if (state === "gameover") drawOverlay("GAME OVER", `PUNTAJE: ${score}`);
  }

  let timerId: ReturnType<typeof setInterval> | null = null;
  let running = false;
  let gameOverEmitted = false;

  function tick() {
    if (!running) return;
    step();
    emitIfChanged();
    if (state === "gameover" && !gameOverEmitted) {
      gameOverEmitted = true;
      callbacks.onGameOver(score);
    }
    draw();
  }

  function scheduleTimer() {
    if (timerId !== null) clearInterval(timerId);
    timerId = setInterval(tick, tickMs);
  }

  function start() {
    window.addEventListener("keydown", onKeyDown);
    initGame();
    gameOverEmitted = false;
    running = true;
    scheduleTimer();
    draw();
  }

  function pause() {
    running = false;
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function resume() {
    if (running) return;
    running = true;
    scheduleTimer();
  }

  function restart() {
    initGame();
    gameOverEmitted = false;
    running = true;
    scheduleTimer();
    draw();
  }

  function destroy() {
    pause();
    window.removeEventListener("keydown", onKeyDown);
  }

  return { start, pause, resume, restart, destroy };
}
