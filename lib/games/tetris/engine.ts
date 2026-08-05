// Motor del juego Tetris, portado desde
// references/started-games/03-tetris/game.js.
//
// Diferencias respecto al original (ver specs/07-juego-tetris.md):
// - El canvas se recibe por parámetro, no se busca con document.getElementById.
// - Los listeners de teclado se agregan en start() y se quitan en destroy(),
//   no viven a nivel de módulo.
// - Se removió el toggle de pausa por tecla P y su overlay propio: el motor
//   solo expone pause()/resume(), controlados desde el botón PAUSA de React.
// - onLives(1) se emite en start()/restart() y onLives(0) al entrar en
//   game over — Tetris no tiene vidas múltiples, game over es un solo golpe.
// - onLevel(level) refleja el nivel real de velocidad (sube cada 10 líneas);
//   no hay callback ni HUD para "líneas", queda como dato interno.
// - Sin panel de "siguiente pieza" (next-canvas del original) — fuera de
//   alcance de esta spec.
// - pause()/resume() congelan/reanudan el loop (dt no avanza en pausa).

import type { Engine, EngineCallbacks } from "../types";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const W = COLS * BLOCK;
const H = ROWS * BLOCK;

const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

type Piece = { type: number; shape: number[][]; x: number; y: number };
type GameState = "playing" | "gameover";

export function createTetrisEngine(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
): Engine {
  const ctx = canvas.getContext("2d")!;

  let board: number[][];
  let current: Piece;
  let next: Piece;
  let score: number;
  let lines: number;
  let level: number;
  let dropInterval: number;
  let dropAccum: number;
  let state: GameState;

  let lastScore: number;
  let lastLevel: number;

  function createBoard(): number[][] {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function randomPiece(): Piece {
    const type = Math.floor(Math.random() * 8) + 1;
    const shape = PIECES[type]!.map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  function collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateCW(shape: number[][]): number[][] {
    const rows = shape.length;
    const cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) {
      state = "gameover";
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function drawBlock(x: number, y: number, colorIndex: number, alpha?: number) {
    if (!colorIndex) return;
    ctx.globalAlpha = alpha ?? 1;
    ctx.fillStyle = COLORS[colorIndex] as string;
    ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, 4);
    ctx.globalAlpha = 1;
  }

  function drawGrid() {
    ctx.strokeStyle = "#22222e";
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
  }

  function draw() {
    ctx.fillStyle = "#1a1a25";
    ctx.fillRect(0, 0, W, H);
    drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(c, r, board[r][c]);

    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(current.x + c, gy + r, current.shape[r][c], 0.2);

    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(current.x + c, current.y + r, current.shape[r][c]);

    if (state === "gameover") {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px monospace";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 10);
      ctx.font = "14px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(`PUNTAJE: ${score}`, W / 2, H / 2 + 16);
    }
  }

  function emitIfChanged() {
    if (score !== lastScore) {
      lastScore = score;
      callbacks.onScore(score);
    }
    if (level !== lastLevel) {
      lastLevel = level;
      callbacks.onLevel(level);
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (state !== "playing") return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        e.preventDefault();
        hardDrop();
        break;
    }
  };

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropAccum = 0;
    state = "playing";
    lastScore = -1;
    lastLevel = -1;
    next = randomPiece();
    spawn();
  }

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let running = false;
  let gameOverEmitted = false;

  function loop(ts: number) {
    if (!running) return;
    const dt = lastTime === null ? 0 : ts - lastTime;
    lastTime = ts;

    if (state === "playing") {
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece();
        }
      }
    }

    emitIfChanged();
    if (state === "gameover" && !gameOverEmitted) {
      gameOverEmitted = true;
      callbacks.onLives(0);
      callbacks.onGameOver(score);
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    window.addEventListener("keydown", onKeyDown);
    initGame();
    gameOverEmitted = false;
    callbacks.onLives(1);
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function resume() {
    if (running) return;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function restart() {
    initGame();
    gameOverEmitted = false;
    callbacks.onLives(1);
    resume();
  }

  function destroy() {
    pause();
    window.removeEventListener("keydown", onKeyDown);
  }

  return { start, pause, resume, restart, destroy };
}
