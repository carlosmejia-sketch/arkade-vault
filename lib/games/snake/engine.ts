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
import type { GamePalette } from "../skins";
import { getPalette } from "../skins";
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
  initialPalette: GamePalette = getPalette("snake", "clasico")!,
): SnakeEngine {
  const ctx = canvas.getContext("2d")!;
  let palette = initialPalette;

  // El canvas se escala por CSS al tamaño del contenedor `.crt-screen`
  // (comparte la clase `.asteroides-canvas`, `width:100%; height:100%`); sin
  // ajustar por devicePixelRatio, el backing store queda fijo en 800x600 y el
  // navegador reescala esos píxeles al tamaño real de pantalla, difuminando
  // los bordes de las celdas en monitores de alta densidad (checklist de
  // performance, regla 18). Se agranda el backing store por el DPR una sola
  // vez al crear el motor y se escala el contexto para que el resto del
  // código siga dibujando en las coordenadas lógicas 800x600 sin cambios.
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (dpr !== 1) {
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }

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
    // Límite de intentos explícito (checklist de performance, regla 16): el
    // bucle de rechazo original no tenía cota y podía girar indefinidamente
    // si la serpiente llegara a ocupar casi toda la grilla. Bajo juego normal
    // se resuelve en el primer o segundo intento, igual que antes.
    const MAX_ATTEMPTS = COLS * ROWS;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
    // Fallback determinista: solo se alcanza si no quedó ninguna celda libre
    // al azar tras agotar los intentos (serpiente ocupando casi toda la
    // grilla).
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!occupied.has(`${x},${y}`)) return { x, y };
      }
    }
    return { x: 0, y: 0 };
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
      ctx.fillStyle = palette.acento;
      ctx.fillRect(dx + 4, dy + 4, CELL - 8, CELL - 8);
    }
  }

  function drawSnake() {
    snake.forEach((s, i) => {
      ctx.fillStyle =
        i === 0 ? palette.entidadPrincipal : palette.entidadSecundaria;
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  // Cache de texto de HUD (checklist de performance, regla 8): evita construir
  // un template literal nuevo en cada tick solo para pintar el mismo texto
  // cuando el puntaje/nivel no cambiaron entre un draw() y el siguiente.
  let hudScoreValue = -1;
  let hudScoreText = "";
  let hudLevelValue = -1;
  let hudLevelText = "";

  function drawHUD() {
    ctx.fillStyle = palette.hud;
    ctx.font = "15px monospace";
    if (score !== hudScoreValue) {
      hudScoreValue = score;
      hudScoreText = `SCORE  ${score}`;
    }
    ctx.textAlign = "left";
    ctx.fillText(hudScoreText, 14, 22);
    if (level !== hudLevelValue) {
      hudLevelValue = level;
      hudLevelText = `NIVEL ${level}`;
    }
    ctx.textAlign = "center";
    ctx.fillText(hudLevelText, W / 2, 22);
  }

  function drawOverlay(title: string, sub: string) {
    ctx.textAlign = "center";
    ctx.fillStyle = palette.overlay;
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, W / 2, H / 2 - 18);
    ctx.font = "18px monospace";
    ctx.fillStyle = palette.textoHud;
    ctx.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw() {
    ctx.fillStyle = palette.fondo;
    ctx.fillRect(0, 0, W, H);

    drawFruit();
    drawSnake();
    drawHUD();

    if (state === "gameover") drawOverlay("GAME OVER", `PUNTAJE: ${score}`);
  }

  let timerId: ReturnType<typeof setInterval> | null = null;
  let running = false;
  let gameOverEmitted = false;
  // Distingue una detención automática (game over, o pestaña oculta) de una
  // pausa/reanudación explícita pedida por game-player.tsx — solo la primera
  // se auto-reanuda sola (checklist de performance, regla 5).
  let pausedByVisibility = false;

  function stopTimer() {
    running = false;
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function tick() {
    if (!running) return;
    step();
    emitIfChanged();
    if (state === "gameover" && !gameOverEmitted) {
      gameOverEmitted = true;
      callbacks.onGameOver(score);
    }
    draw();
    // El estado "gameover" es terminal: no hay nada más que animar, así que
    // el timer se detiene en vez de seguir llamando a step()/draw() para
    // siempre sobre la pantalla de fin de partida (checklist de performance,
    // regla 5). La pantalla queda estática con el último frame dibujado.
    if (state === "gameover") {
      stopTimer();
    }
  }

  function scheduleTimer() {
    if (timerId !== null) clearInterval(timerId);
    timerId = setInterval(tick, tickMs);
  }

  const onVisibilityChange = () => {
    if (typeof document === "undefined") return;
    if (document.hidden) {
      if (running) {
        pausedByVisibility = true;
        stopTimer();
      }
    } else if (pausedByVisibility) {
      pausedByVisibility = false;
      running = true;
      scheduleTimer();
    }
  };

  function start() {
    // Idempotente (checklist de performance, regla 3): evita listeners
    // duplicados y un timer huérfano si se llamara dos veces sin destroy()
    // intermedio.
    if (running) return;
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibilityChange);
    initGame();
    gameOverEmitted = false;
    pausedByVisibility = false;
    running = true;
    scheduleTimer();
    draw();
  }

  function pause() {
    pausedByVisibility = false;
    stopTimer();
  }

  function resume() {
    if (running) return;
    pausedByVisibility = false;
    running = true;
    scheduleTimer();
  }

  function restart() {
    initGame();
    gameOverEmitted = false;
    pausedByVisibility = false;
    running = true;
    scheduleTimer();
    draw();
  }

  function destroy() {
    pause();
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  function setPalette(next: GamePalette) {
    palette = next;
  }

  return { start, pause, resume, restart, destroy, setPalette };
}
