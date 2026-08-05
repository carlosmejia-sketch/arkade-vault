// Motor del juego Arkanoid, portado desde
// references/started-games/04-arkanoid/game.js (+ levels.js, assets/spritesheet.js).
//
// Diferencias respecto al original (ver specs/08-juego-arkanoid.md):
// - El canvas se recibe por parámetro, no se busca con document.getElementById.
// - Los listeners de teclado, mousemove y click se agregan en start() y se
//   quitan en destroy(), no viven a nivel de módulo.
// - Rutas de assets apuntan a /arkanoid/... (servidos desde public/), no a
//   rutas relativas del HTML original.
// - Se removió el toggle de pausa por tecla P/Escape: el motor solo expone
//   pause()/resume(), controlados desde el botón PAUSA de React. El overlay
//   de pausa (con selector de nivel) se sigue dibujando internamente.
// - Al hacer clic en un botón de nivel durante la pausa, el motor salta a ese
//   nivel pero permanece en pausa (a diferencia del original, que reanudaba
//   el juego automáticamente) — decisión explícita de la spec.
// - update() invoca los callbacks (onScore/onLives/onLevel) cuando el valor
//   correspondiente cambia. onGameOver(score) se dispara tanto en 'gameover'
//   como en 'win' — un solo modal de "FIN DEL JUEGO" para ambos casos.
// - No existe reinicio por teclado: el único reinicio es restart(), llamado
//   desde el modal de React.
// - pause()/resume() congelan/reanudan el loop (dt no avanza en pausa).

import type { Engine, EngineCallbacks } from "../types";
import type { BlockColor } from "./levels";
import { LEVELS } from "./levels";
import {
  drawBallSprite,
  drawBlockSprite,
  drawExplosionFrame,
  drawPaddleSprite,
  EXPLOSION_DURATION,
  loadSpritesheet,
} from "./sprites";

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

const PAUSE_BTN_W = 60;
const PAUSE_BTN_H = 40;
const PAUSE_BTN_GAP = 12;
const PAUSE_BTN_Y = 340;
const PAUSE_BTN_ROW_X = (W - (5 * PAUSE_BTN_W + 4 * PAUSE_BTN_GAP)) / 2;

type Paddle = { x: number; y: number; w: number; h: number };
type Ball = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};
type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};
type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
};
type GameState = "playing" | "gameover" | "win";

export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
): Engine {
  const ctx = canvas.getContext("2d")!;

  const bounceSound = new Audio("/arkanoid/sounds/ball-bounce.mp3");
  const breakSound = new Audio("/arkanoid/sounds/break-sound.mp3");

  function playSound(audio: HTMLAudioElement) {
    const clone = audio.cloneNode(true) as HTMLAudioElement;
    clone.play().catch(() => {});
  }

  const paddle: Paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball: Ball = {
    x: 0,
    y: 0,
    w: 16,
    h: 16,
    vx: BASE_BALL_VX,
    vy: BASE_BALL_VY,
  };

  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = 3;
  let score = 0;
  let currentLevel = 1;
  let state: GameState = "playing";
  let paused = false;

  let lastScore = -1;
  let lastLives = -1;
  let lastLevel = -1;

  const keys: Record<string, boolean> = { ArrowLeft: false, ArrowRight: false };

  function emitIfChanged() {
    if (score !== lastScore) {
      lastScore = score;
      callbacks.onScore(score);
    }
    if (lives !== lastLives) {
      lastLives = lives;
      callbacks.onLives(lives);
    }
    if (currentLevel !== lastLevel) {
      lastLevel = currentLevel;
      callbacks.onLevel(currentLevel);
    }
  }

  function initPaddle() {
    paddle.x = (W - paddle.w) / 2;
  }

  function initBall() {
    const speed = LEVELS[currentLevel - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    currentLevel = n;
    const level = LEVELS[n - 1];
    blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * level.speed;
    ball.vy = BASE_BALL_VY * level.speed;
  }

  function collideAABB(block: Block): boolean {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  function initGame() {
    lives = 3;
    score = 0;
    state = "playing";
    paused = false;
    lastScore = -1;
    lastLives = -1;
    lastLevel = -1;
    initPaddle();
    loadLevel(1);
    emitIfChanged();
  }

  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  };

  const onClick = (e: MouseEvent) => {
    if (!paused) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    for (let i = 0; i < 5; i++) {
      const bx = PAUSE_BTN_ROW_X + i * (PAUSE_BTN_W + PAUSE_BTN_GAP);
      if (
        mx >= bx &&
        mx <= bx + PAUSE_BTN_W &&
        my >= PAUSE_BTN_Y &&
        my <= PAUSE_BTN_Y + PAUSE_BTN_H
      ) {
        loadLevel(i + 1);
        draw();
        return;
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key in keys) keys[e.key] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key in keys) keys[e.key] = false;
  };

  function update(dt: number) {
    if (state !== "playing") return;

    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      playSound(bounceSound);
    }

    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      playSound(bounceSound);
    }

    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(block)) {
        block.alive = false;
        explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        score += 10;
        ball.vy = -ball.vy;
        playSound(breakSound);
        if (blocks.every((b) => !b.alive)) {
          if (currentLevel < 5) loadLevel(currentLevel + 1);
          else state = "win";
        }
        break; // un bloque por frame, fiel al original
      }
    }

    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        state = "gameover";
      } else {
        initBall();
      }
    }
  }

  function drawOverlay(message: string) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, W / 2, H / 2);
  }

  function drawPauseOverlay() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 56px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSA", W / 2, 260);

    ctx.font = "bold 16px monospace";
    ctx.fillText("Saltar al nivel:", W / 2, 310);

    for (let i = 0; i < 5; i++) {
      const bx = PAUSE_BTN_ROW_X + i * (PAUSE_BTN_W + PAUSE_BTN_GAP);
      const isActive = i + 1 === currentLevel;
      ctx.fillStyle = isActive ? "#f0c040" : "#444";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, PAUSE_BTN_Y, PAUSE_BTN_W, PAUSE_BTN_H, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isActive ? "#000" : "#fff";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        String(i + 1),
        bx + PAUSE_BTN_W / 2,
        PAUSE_BTN_Y + PAUSE_BTN_H / 2,
      );
    }
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    for (const block of blocks) {
      if (block.alive)
        drawBlockSprite(ctx, block.color, block.x, block.y, block.w, block.h);
    }

    for (const exp of explosions) {
      drawExplosionFrame(
        ctx,
        exp.color,
        exp.elapsed,
        exp.x,
        exp.y,
        exp.w,
        exp.h,
      );
    }

    drawPaddleSprite(ctx, paddle.x, paddle.y, paddle.w, paddle.h);
    drawBallSprite(ctx, ball.x, ball.y, ball.w, ball.h);

    if (state === "playing") {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`Score: ${score}`, 10, 10);
      ctx.textAlign = "center";
      ctx.fillText(`Nivel: ${currentLevel}`, W / 2, 10);
      const ballSize = 16;
      const ballSpacing = 4;
      for (let i = 0; i < lives; i++) {
        const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
        drawBallSprite(ctx, bx, 10, ballSize, ballSize);
      }
    }

    if (state === "gameover") drawOverlay("GAME OVER");
    if (state === "win") drawOverlay("¡Completaste el juego!");
    if (paused) drawPauseOverlay();
  }

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let running = false;
  let gameOverEmitted = false;

  function loop(ts: number) {
    if (!running) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    update(dt);
    emitIfChanged();
    if ((state === "gameover" || state === "win") && !gameOverEmitted) {
      gameOverEmitted = true;
      callbacks.onGameOver(score);
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);

    gameOverEmitted = false;
    running = true;
    lastTime = null;

    loadSpritesheet(() => {
      initGame();
      rafId = requestAnimationFrame(loop);
    });
  }

  function pause() {
    paused = true;
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    draw();
  }

  function resume() {
    if (running) return;
    paused = false;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function restart() {
    initGame();
    gameOverEmitted = false;
    resume();
  }

  function destroy() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("click", onClick);
  }

  return { start, pause, resume, restart, destroy };
}
