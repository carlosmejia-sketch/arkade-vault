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
import type { GamePalette } from "../skins";
import { getPalette } from "../skins";
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

// Mapeo 1:1 de BlockColor (asset del spritesheet) al rol de tinte de GamePalette.
const BLOCK_TINT_ROLE: Record<BlockColor, keyof GamePalette> = {
  red: "bloqueRojo",
  yellow: "bloqueAmarillo",
  cyan: "bloqueCyan",
  magenta: "bloqueMagenta",
  hotpink: "bloqueRosa",
  green: "bloqueVerde",
  gray: "bloqueGris",
};

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
  initialPalette: GamePalette = getPalette("arkanoid", "clasico")!,
): Engine {
  const ctx = canvas.getContext("2d")!;
  let palette = initialPalette;

  // El canvas se escala por CSS al tamaño del contenedor `.crt-screen`
  // (clase `.asteroides-canvas`, compartida con Asteroides — ver
  // `components/game-player.tsx`); sin ajustar por devicePixelRatio, el
  // backing store queda fijo en 800x600 y el navegador reescala esos
  // píxeles al tamaño real de pantalla, difuminando sprites en monitores de
  // alta densidad (checklist de performance, regla 18). Se agranda el
  // backing store por el DPR una sola vez al crear el motor y se escala el
  // contexto para que el resto del código siga dibujando en las coordenadas
  // lógicas 800x600 sin cambios. Contenido en este archivo, sin tocar
  // app/globals.css (esa clase también la usa Asteroides).
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (dpr !== 1) {
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }

  // Cachea el sprite tintado por (elemento, color, tamaño) para no recrear
  // el canvas offscreen en cada frame (hasta ~60 bloques vivos en el nivel
  // 1). La clave incluye w/h (checklist de performance, regla 12): hoy
  // paddle/pelota nunca cambian de tamaño en runtime, pero una clave que
  // ignore las dimensiones invalidaría mal el cache si eso cambiara.
  const tintCache = new Map<string, HTMLCanvasElement>();

  function getTinted(
    cacheKey: string,
    w: number,
    h: number,
    color: string,
    drawSprite: (offscreenCtx: CanvasRenderingContext2D) => void,
  ): HTMLCanvasElement {
    const cached = tintCache.get(cacheKey);
    if (cached) return cached;
    const oc = document.createElement("canvas");
    oc.width = w;
    oc.height = h;
    const octx = oc.getContext("2d")!;
    drawSprite(octx);
    octx.globalCompositeOperation = "source-atop";
    octx.globalAlpha = 0.6;
    octx.fillStyle = color;
    octx.fillRect(0, 0, w, h);
    tintCache.set(cacheKey, oc);
    return oc;
  }

  function drawPaddleTinted(x: number, y: number, w: number, h: number) {
    if (!palette.tinteSprites) {
      drawPaddleSprite(ctx, x, y, w, h);
      return;
    }
    const canvas = getTinted(
      `paddle:${w}x${h}`,
      w,
      h,
      palette.entidadPrincipal,
      (octx) => drawPaddleSprite(octx, 0, 0, w, h),
    );
    ctx.drawImage(canvas, x, y);
  }

  function drawBallTinted(x: number, y: number, w: number, h: number) {
    if (!palette.tinteSprites) {
      drawBallSprite(ctx, x, y, w, h);
      return;
    }
    const canvas = getTinted(
      `ball:${w}x${h}`,
      w,
      h,
      palette.entidadSecundaria,
      (octx) => drawBallSprite(octx, 0, 0, w, h),
    );
    ctx.drawImage(canvas, x, y);
  }

  function drawBlockTinted(
    color: BlockColor,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const tint = palette[BLOCK_TINT_ROLE[color]] as string | undefined;
    if (!palette.tinteSprites || !tint) {
      drawBlockSprite(ctx, color, x, y, w, h);
      return;
    }
    const canvas = getTinted(`block:${color}`, w, h, tint, (octx) =>
      drawBlockSprite(octx, color, 0, 0, w, h),
    );
    ctx.drawImage(canvas, x, y);
  }

  function drawExplosionTinted(
    color: BlockColor,
    elapsed: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const tint = palette[BLOCK_TINT_ROLE[color]] as string | undefined;
    if (!palette.tinteSprites || !tint) {
      drawExplosionFrame(ctx, color, elapsed, x, y, w, h);
      return;
    }
    const idx = Math.min(Math.floor((elapsed / EXPLOSION_DURATION) * 4), 3);
    const canvas = getTinted(`explosion:${color}:${idx}`, w, h, tint, (octx) =>
      drawExplosionFrame(octx, color, elapsed, 0, 0, w, h),
    );
    ctx.drawImage(canvas, x, y);
  }

  // Pool fijo de instancias por sonido (en vez de `cloneNode` por evento,
  // checklist de performance regla 10): se crean una sola vez al construir
  // el motor y se recorren en round-robin, preservando sonidos superpuestos
  // (varios rebotes rápidos no se cortan entre sí) sin crear un nodo DOM
  // nuevo por rebote/rotura.
  const AUDIO_POOL_SIZE = 4;
  function createAudioPool(src: string): HTMLAudioElement[] {
    return Array.from({ length: AUDIO_POOL_SIZE }, () => new Audio(src));
  }
  const bouncePool = createAudioPool("/arkanoid/sounds/ball-bounce.mp3");
  const breakPool = createAudioPool("/arkanoid/sounds/break-sound.mp3");
  const bounceRef = { i: 0 };
  const breakRef = { i: 0 };

  function playFromPool(pool: HTMLAudioElement[], idxRef: { i: number }) {
    const audio = pool[idxRef.i];
    idxRef.i = (idxRef.i + 1) % pool.length;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function playBounce() {
    playFromPool(bouncePool, bounceRef);
  }
  function playBreak() {
    playFromPool(breakPool, breakRef);
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
  let aliveBlocks = 0;
  let explosions: Explosion[] = [];
  let lives = 3;
  let score = 0;
  let currentLevel = 1;
  let state: GameState = "playing";
  let paused = false;

  let lastScore = -1;
  let lastLives = -1;
  let lastLevel = -1;

  // Cache de las cadenas del HUD (checklist de performance regla 8): evita
  // el template literal `Score: ${score}` / `Nivel: ${currentLevel}` en cada
  // frame de draw() — solo se recalculan cuando el valor subyacente cambia.
  let hudScoreCache = "";
  let hudScoreCacheValue = -1;
  let hudLevelCache = "";
  let hudLevelCacheValue = -1;

  function hudScoreText(): string {
    if (score !== hudScoreCacheValue) {
      hudScoreCacheValue = score;
      hudScoreCache = `Score: ${score}`;
    }
    return hudScoreCache;
  }

  function hudLevelText(): string {
    if (currentLevel !== hudLevelCacheValue) {
      hudLevelCacheValue = currentLevel;
      hudLevelCache = `Nivel: ${currentLevel}`;
    }
    return hudLevelCache;
  }

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
    aliveBlocks = blocks.length;
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
      playBounce();
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      playBounce();
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      playBounce();
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
      playBounce();
    }

    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(block)) {
        block.alive = false;
        aliveBlocks--;
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
        playBreak();
        // Contador decrementado en vez de `blocks.every()` dentro de este
        // `for` (checklist de performance regla 14): evita un recorrido O(n)
        // extra sobre `blocks` cada vez que se destruye un bloque.
        if (aliveBlocks <= 0) {
          if (currentLevel < 5) loadLevel(currentLevel + 1);
          else state = "win";
        }
        break; // un bloque por frame, fiel al original
      }
    }

    // Compactación in-place en vez de `.filter()` por frame (checklist de
    // performance regla 7): evita crear un arreglo nuevo cada frame incluso
    // cuando no hay explosiones que remover.
    let writeIdx = 0;
    for (let i = 0; i < explosions.length; i++) {
      const exp = explosions[i];
      exp.elapsed += dt * 1000;
      if (exp.elapsed < EXPLOSION_DURATION) {
        explosions[writeIdx++] = exp;
      }
    }
    explosions.length = writeIdx;

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
    ctx.fillStyle = palette.overlay;
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, W / 2, H / 2);
  }

  function drawPauseOverlay() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = palette.overlay;
    ctx.font = "bold 56px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSA", W / 2, 260);

    ctx.font = "bold 16px monospace";
    ctx.fillStyle = palette.textoHud;
    ctx.fillText("Saltar al nivel:", W / 2, 310);

    for (let i = 0; i < 5; i++) {
      const bx = PAUSE_BTN_ROW_X + i * (PAUSE_BTN_W + PAUSE_BTN_GAP);
      const isActive = i + 1 === currentLevel;
      ctx.fillStyle = isActive ? palette.acento : "#444";
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
    ctx.fillStyle = palette.fondo;
    ctx.fillRect(0, 0, W, H);

    for (const block of blocks) {
      if (block.alive)
        drawBlockTinted(block.color, block.x, block.y, block.w, block.h);
    }

    for (const exp of explosions) {
      drawExplosionTinted(exp.color, exp.elapsed, exp.x, exp.y, exp.w, exp.h);
    }

    drawPaddleTinted(paddle.x, paddle.y, paddle.w, paddle.h);
    drawBallTinted(ball.x, ball.y, ball.w, ball.h);

    if (state === "playing") {
      ctx.fillStyle = palette.hud;
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(hudScoreText(), 10, 10);
      ctx.textAlign = "center";
      ctx.fillText(hudLevelText(), W / 2, 10);
      const ballSize = 16;
      const ballSpacing = 4;
      for (let i = 0; i < lives; i++) {
        const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
        drawBallTinted(bx, 10, ballSize, ballSize);
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
  let destroyed = false;
  // El spritesheet carga de forma asíncrona: hasta que resuelve, `running`
  // ya es `true` (para que start() sea idempotente) pero el loop real
  // todavía no arrancó. Sin esta bandera, ocultar la pestaña durante la
  // carga inicial podría disparar un `requestAnimationFrame(loop)` desde
  // `onVisibilityChange` antes de que `initGame()` haya corrido.
  let assetsReady = false;
  // Distingue una detención automática (pestaña oculta) de una pausa
  // explícita pedida por game-player.tsx — solo la primera se auto-reanuda
  // sola al volver a la pestaña.
  let pausedByVisibility = false;

  function stopLoop() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

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
    // "gameover"/"win" son estados terminales: no hay nada más que animar,
    // así que el loop se detiene en vez de seguir reprogramando rAF (y por
    // lo tanto draw()) indefinidamente sobre la pantalla de fin de partida
    // (checklist de performance, regla 5). La pantalla queda estática con el
    // último frame ya dibujado (overlay incluido).
    if (state === "gameover" || state === "win") {
      stopLoop();
      return;
    }
    rafId = requestAnimationFrame(loop);
  }

  const onVisibilityChange = () => {
    if (typeof document === "undefined") return;
    if (document.hidden) {
      if (running) {
        pausedByVisibility = true;
        stopLoop();
      }
    } else if (pausedByVisibility) {
      pausedByVisibility = false;
      if (assetsReady && !paused && state === "playing") {
        running = true;
        lastTime = null;
        rafId = requestAnimationFrame(loop);
      }
    }
  };

  function start() {
    if (running) return;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    document.addEventListener("visibilitychange", onVisibilityChange);

    gameOverEmitted = false;
    pausedByVisibility = false;
    running = true;
    lastTime = null;

    // El spritesheet se carga de forma asíncrona (loadSpritesheet); si
    // destroy() se llama antes de que resuelva (ej. el jugador navega a
    // SALIR durante la carga inicial), este callback no debe arrancar
    // initGame()/rAF sobre un motor ya desmontado (checklist de
    // performance, regla 4).
    loadSpritesheet(() => {
      if (destroyed) return;
      assetsReady = true;
      initGame();
      // Si la pestaña ya está oculta cuando el spritesheet termina de
      // cargar, no arrancar el loop: `onVisibilityChange` lo hará al volver
      // a la pestaña (mismo criterio que una pausa por visibilidad normal).
      if (typeof document !== "undefined" && document.hidden) {
        running = false;
        pausedByVisibility = true;
        return;
      }
      rafId = requestAnimationFrame(loop);
    });
  }

  function pause() {
    paused = true;
    pausedByVisibility = false;
    stopLoop();
    draw();
  }

  function resume() {
    if (running) return;
    paused = false;
    pausedByVisibility = false;
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
    destroyed = true;
    stopLoop();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("click", onClick);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  function setPalette(next: GamePalette) {
    palette = next;
    tintCache.clear();
  }

  return { start, pause, resume, restart, destroy, setPalette };
}
