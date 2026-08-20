// Motor del juego Frogger: grilla 16x14 (40px/celda) sobre canvas 640x560.
// Ver specs/game-jam/frogger/01-frogger-core.md.
//
// Adaptación al patrón real del repo (lib/games/<slug>/engine.ts + registry +
// components/game-player.tsx genérico) en vez del componente React bespoke
// que describía el spec original — ver decisión registrada en el spec.
//
// - El canvas se recibe por parámetro; los listeners de teclado se agregan en
//   start() y se quitan en destroy(), nunca a nivel de módulo.
// - Movimiento de la rana por saltos discretos de 1 celda con animación de
//   120ms; mientras anima no procesa nuevo input ni colisiones de reposo.
// - onScore/onLives/onLevel se invocan solo cuando el valor cambia
//   (emitIfChanged), igual que el resto de motores.
// - Skins y controles táctiles quedan fuera de este spec (se cubren en specs
//   secundarios de skin-designer / mobile-porter).

import type { Engine, EngineCallbacks } from "../types";
import type { GamePalette } from "../skins";
import { getPalette } from "../skins";

const COLS = 16;
const ROWS = 14;
const CELL = 40;
const W = COLS * CELL; // 640
const H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

const JUMP_MS = 120;
const LIVES_START = 3;
const TIME_START = 15; // segundos
const TIME_MIN = 6;
const GOAL_WIDTH = 2;
const GOAL_COLS = [1, 4, 7, 10, 13]; // columna inicial de cada boca
const TURTLE_VISIBLE_S = 3;
const TURTLE_SUBMERGED_S = 1.5;
const TURTLE_CYCLE_S = TURTLE_VISIBLE_S + TURTLE_SUBMERGED_S;

type Direction = "up" | "down" | "left" | "right";

type EntityType = "car" | "truck" | "log" | "turtle";

interface Entity {
  col: number;
  width: number;
  type: EntityType;
  cycleT: number;
  phase: number;
  submerged: boolean;
}

interface Lane {
  row: number;
  speed: number; // celdas por segundo
  dir: 1 | -1;
  isRoad: boolean;
  entities: Entity[];
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number; // ms
  fromCol: number;
  fromRow: number;
  targetCol: number;
  targetRow: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

export type { EngineCallbacks };
export type FroggerEngine = Engine;

export function createFroggerEngine(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  initialPalette: GamePalette = getPalette("frogger", "clasico")!,
): FroggerEngine {
  const ctx = canvas.getContext("2d")!;
  let palette = initialPalette;

  let lanes: Lane[];
  let frog: Frog;
  let pendingDir: Direction | null;
  let score: number;
  let lives: number;
  let level: number;
  let roundTimer: number; // segundos restantes
  let maxRowReached: number;
  let goalsOccupied: boolean[];
  let state: "playing" | "gameover";

  let lastScore: number;
  let lastLives: number;
  let lastLevel: number;

  function emitIfChanged() {
    if (score !== lastScore) {
      lastScore = score;
      callbacks.onScore(score);
    }
    if (lives !== lastLives) {
      lastLives = lives;
      callbacks.onLives(lives);
    }
    if (level !== lastLevel) {
      lastLevel = level;
      callbacks.onLevel(level);
    }
  }

  function timeForLevel(lvl: number): number {
    return Math.max(TIME_MIN, TIME_START - (lvl - 1));
  }

  function speedMult(lvl: number): number {
    return Math.pow(1.15, lvl - 1);
  }

  function buildRoadLane(row: number, baseSpeed: number, dir: 1 | -1): Lane {
    const entities: Entity[] = [];
    let col = -randInt(0, 3);
    while (col < COLS) {
      const width = randInt(1, 3);
      const type: EntityType = Math.random() < 0.5 ? "car" : "truck";
      entities.push({
        col,
        width,
        type,
        cycleT: 0,
        phase: 0,
        submerged: false,
      });
      col += width + randInt(2, 4);
    }
    return { row, speed: baseSpeed, dir, isRoad: true, entities };
  }

  function buildRiverLane(
    row: number,
    baseSpeed: number,
    dir: 1 | -1,
    kind: "log" | "turtle",
  ): Lane {
    const entities: Entity[] = [];
    let col = -randInt(0, 3);
    while (col < COLS) {
      if (kind === "log") {
        const width = randInt(2, 4);
        entities.push({
          col,
          width,
          type: "log",
          cycleT: 0,
          phase: 0,
          submerged: false,
        });
        col += width + randInt(1, 3);
      } else {
        const width = randInt(2, 3);
        entities.push({
          col,
          width,
          type: "turtle",
          cycleT: 0,
          phase: rand(0, TURTLE_CYCLE_S),
          submerged: false,
        });
        col += width + randInt(1, 3);
      }
    }
    return { row, speed: baseSpeed, dir, isRoad: false, entities };
  }

  function buildLanes(lvl: number): Lane[] {
    const mult = speedMult(lvl);
    const result: Lane[] = [];

    for (let i = 0; i < ROW_ROAD_BOT - ROW_ROAD_TOP + 1; i++) {
      const row = ROW_ROAD_TOP + i;
      const baseSpeed = (1.5 + i * 0.6) * mult;
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      result.push(buildRoadLane(row, baseSpeed, dir));
    }

    for (let i = 0; i < ROW_RIVER_BOT - ROW_RIVER_TOP + 1; i++) {
      const row = ROW_RIVER_TOP + i;
      const baseSpeed = (1 + i * 0.35) * mult;
      const dir: 1 | -1 = i % 2 === 0 ? -1 : 1;
      const kind: "log" | "turtle" = i % 2 === 0 ? "log" : "turtle";
      result.push(buildRiverLane(row, baseSpeed, dir, kind));
    }

    return result;
  }

  function spawnFrog(): Frog {
    const col = Math.floor(COLS / 2);
    return {
      col,
      row: ROW_START,
      animating: false,
      animT: 0,
      fromCol: col,
      fromRow: ROW_START,
      targetCol: col,
      targetRow: ROW_START,
    };
  }

  function initGame() {
    score = 0;
    lives = LIVES_START;
    level = 1;
    lanes = buildLanes(level);
    frog = spawnFrog();
    pendingDir = null;
    maxRowReached = ROW_START;
    goalsOccupied = new Array(GOAL_COLS.length).fill(false);
    roundTimer = timeForLevel(level);
    state = "playing";
    lastScore = -1;
    lastLives = -1;
    lastLevel = -1;
    emitIfChanged();
  }

  const onKeyDown = (e: KeyboardEvent) => {
    let dir: Direction | null = null;
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        dir = "up";
        break;
      case "ArrowDown":
      case "KeyS":
        dir = "down";
        break;
      case "ArrowLeft":
      case "KeyA":
        dir = "left";
        break;
      case "ArrowRight":
      case "KeyD":
        dir = "right";
        break;
      default:
        return;
    }
    e.preventDefault();
    if (state !== "playing" || frog.animating) return;
    pendingDir = dir;
  };

  function tryStartJump() {
    if (!pendingDir || frog.animating) return;
    let targetCol = frog.col;
    let targetRow = frog.row;
    switch (pendingDir) {
      case "up":
        targetRow = frog.row - 1;
        break;
      case "down":
        targetRow = frog.row + 1;
        break;
      case "left":
        targetCol = frog.col - 1;
        break;
      case "right":
        targetCol = frog.col + 1;
        break;
    }
    pendingDir = null;
    targetCol = Math.max(0, Math.min(COLS - 1, targetCol));
    targetRow = Math.max(ROW_GOALS, Math.min(ROW_START, targetRow));
    if (targetCol === frog.col && targetRow === frog.row) return;

    frog.animating = true;
    frog.animT = 0;
    frog.fromCol = frog.col;
    frog.fromRow = frog.row;
    frog.targetCol = targetCol;
    frog.targetRow = targetRow;
  }

  function resetFrogPosition() {
    const spawn = spawnFrog();
    frog = spawn;
    maxRowReached = ROW_START;
    pendingDir = null;
  }

  function completeRound() {
    score += 200;
    level++;
    lanes = buildLanes(level);
    goalsOccupied = new Array(GOAL_COLS.length).fill(false);
    roundTimer = timeForLevel(level);
    resetFrogPosition();
  }

  function killFrog() {
    lives = Math.max(0, lives - 1);
    if (lives === 0) {
      state = "gameover";
      return;
    }
    roundTimer = timeForLevel(level);
    resetFrogPosition();
  }

  function checkRoadCollision(): boolean {
    for (const lane of lanes) {
      if (!lane.isRoad || lane.row !== frog.row) continue;
      for (const entity of lane.entities) {
        if (frog.col >= entity.col && frog.col < entity.col + entity.width) {
          return true;
        }
      }
    }
    return false;
  }

  function getSupport(): { entity: Entity; lane: Lane } | null {
    for (const lane of lanes) {
      if (lane.isRoad || lane.row !== frog.row) continue;
      for (const entity of lane.entities) {
        if (frog.col >= entity.col && frog.col < entity.col + entity.width) {
          if (entity.type === "turtle" && entity.submerged) continue;
          return { entity, lane };
        }
      }
    }
    return null;
  }

  function goalIndexForCol(col: number): number {
    return GOAL_COLS.findIndex(
      (start) => col >= start && col < start + GOAL_WIDTH,
    );
  }

  function resolveLanding() {
    if (frog.row < maxRowReached) {
      score += 10 * (maxRowReached - frog.row);
      maxRowReached = frog.row;
    }

    if (frog.row === ROW_GOALS) {
      const idx = goalIndexForCol(frog.col);
      if (idx === -1 || goalsOccupied[idx]) {
        killFrog();
        return;
      }
      goalsOccupied[idx] = true;
      score += 50 + Math.round(roundTimer * 10);
      if (goalsOccupied.every(Boolean)) {
        completeRound();
      } else {
        resetFrogPosition();
      }
      return;
    }

    if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
      if (checkRoadCollision()) killFrog();
      return;
    }

    if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
      if (!getSupport()) killFrog();
    }
  }

  function update(dt: number) {
    if (state !== "playing") return;

    for (const lane of lanes) {
      for (const entity of lane.entities) {
        entity.col += lane.speed * lane.dir * dt;
        if (lane.dir > 0 && entity.col > COLS) {
          entity.col = -entity.width;
        } else if (lane.dir < 0 && entity.col + entity.width < 0) {
          entity.col = COLS;
        }
        if (entity.type === "turtle") {
          entity.cycleT += dt;
          const phase = (entity.cycleT + entity.phase) % TURTLE_CYCLE_S;
          entity.submerged = phase >= TURTLE_VISIBLE_S;
        }
      }
    }

    if (frog.animating) {
      frog.animT += dt * 1000;
      if (frog.animT >= JUMP_MS) {
        frog.animating = false;
        frog.col = frog.targetCol;
        frog.row = frog.targetRow;
        resolveLanding();
      }
    } else {
      tryStartJump();
      if (!frog.animating) {
        if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
          const support = getSupport();
          if (!support) {
            killFrog();
          } else {
            frog.col += support.lane.speed * support.lane.dir * dt;
            if (frog.col < 0 || frog.col > COLS - 1) killFrog();
          }
        } else if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
          if (checkRoadCollision()) killFrog();
        }
      }
    }

    if (state === "playing" && !frog.animating) {
      roundTimer -= dt;
      if (roundTimer <= 0) {
        roundTimer = 0;
        killFrog();
      }
    }
  }

  function zoneColor(row: number): string {
    if (row === ROW_GOALS) return palette.zonaMeta!;
    if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) return palette.zonaRio!;
    if (row === ROW_SAFE_MID) return palette.zonaSegura!;
    if (row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT)
      return palette.zonaCarretera!;
    return palette.zonaSegura!;
  }

  function drawBackground() {
    for (let row = 0; row < ROWS; row++) {
      ctx.fillStyle = zoneColor(row);
      ctx.fillRect(0, row * CELL, W, CELL);
    }
    GOAL_COLS.forEach((startCol, i) => {
      ctx.fillStyle = palette.casillaMetaFondo!;
      ctx.fillRect(startCol * CELL, 0, GOAL_WIDTH * CELL, CELL);
      ctx.strokeStyle = palette.casillaMetaBorde!;
      ctx.lineWidth = 2;
      ctx.strokeRect(startCol * CELL + 1, 1, GOAL_WIDTH * CELL - 2, CELL - 2);
      if (goalsOccupied[i]) {
        ctx.fillStyle = palette.acento;
        ctx.beginPath();
        ctx.ellipse(
          startCol * CELL + CELL,
          CELL / 2,
          14,
          12,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    });
  }

  function drawEntities() {
    for (const lane of lanes) {
      for (const entity of lane.entities) {
        const x = entity.col * CELL;
        const y = lane.row * CELL;
        const w = entity.width * CELL;
        if (entity.type === "car") {
          ctx.fillStyle = palette.auto!;
          ctx.fillRect(x + 2, y + 8, w - 4, CELL - 16);
          ctx.fillStyle = palette.autoRueda!;
          ctx.beginPath();
          ctx.arc(x + 8, y + CELL - 8, 5, 0, Math.PI * 2);
          ctx.arc(x + w - 8, y + CELL - 8, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (entity.type === "truck") {
          ctx.fillStyle = palette.entidadSecundaria;
          ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
          ctx.fillStyle = palette.camionCabina!;
          ctx.fillRect(x + 2, y + 6, Math.min(24, w - 4), CELL - 12);
        } else if (entity.type === "log") {
          ctx.fillStyle = palette.tronco!;
          ctx.fillRect(x + 2, y + 10, w - 4, CELL - 20);
          ctx.strokeStyle = palette.troncoVeta!;
          ctx.lineWidth = 2;
          for (let lx = x + 8; lx < x + w - 8; lx += 12) {
            ctx.beginPath();
            ctx.moveTo(lx, y + 10);
            ctx.lineTo(lx, y + CELL - 10);
            ctx.stroke();
          }
        } else if (entity.type === "turtle") {
          const cells = Math.round(entity.width);
          for (let i = 0; i < cells; i++) {
            const cx = x + i * CELL + CELL / 2;
            const cy = y + CELL / 2;
            ctx.globalAlpha = entity.submerged ? 0.3 : 1;
            ctx.fillStyle = palette.tortuga!;
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }
    }
  }

  function drawFrog() {
    let px: number;
    let py: number;
    if (frog.animating) {
      const t = Math.min(1, frog.animT / JUMP_MS);
      px = (frog.fromCol + (frog.targetCol - frog.fromCol) * t) * CELL;
      py = (frog.fromRow + (frog.targetRow - frog.fromRow) * t) * CELL;
    } else {
      px = frog.col * CELL;
      py = frog.row * CELL;
    }
    const cx = px + CELL / 2;
    const cy = py + CELL / 2;
    ctx.fillStyle = palette.entidadPrincipal;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 6, 3, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 6, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 6, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHUD() {
    ctx.fillStyle = palette.hud;
    ctx.font = "16px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${score}`, 8, 18);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${level}`, W / 2, 18);
    ctx.textAlign = "right";
    ctx.fillText("♥".repeat(lives), W - 8, 18);

    const total = timeForLevel(level);
    const ratio = Math.max(0, Math.min(1, roundTimer / total));
    ctx.fillStyle =
      ratio > 0.5
        ? palette.barraTiempoSegura!
        : ratio > 0.2
          ? palette.barraTiempoAlerta!
          : palette.barraTiempoPeligro!;
    ctx.fillRect(0, 0, W * ratio, 4);
  }

  function drawOverlay(title: string, sub: string) {
    ctx.textAlign = "center";
    ctx.fillStyle = palette.overlay;
    ctx.font = "bold 40px monospace";
    ctx.fillText(title, W / 2, H / 2 - 16);
    ctx.font = "16px monospace";
    ctx.fillStyle = palette.textoHud;
    ctx.fillText(sub, W / 2, H / 2 + 20);
  }

  function draw() {
    drawBackground();
    drawEntities();
    drawFrog();
    drawHUD();
    if (state === "gameover") drawOverlay("GAME OVER", `PUNTAJE: ${score}`);
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
    if (state === "gameover" && !gameOverEmitted) {
      gameOverEmitted = true;
      callbacks.onGameOver(score);
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    window.addEventListener("keydown", onKeyDown);
    initGame();
    gameOverEmitted = false;
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
    resume();
  }

  function destroy() {
    pause();
    window.removeEventListener("keydown", onKeyDown);
  }

  function setPalette(next: GamePalette) {
    palette = next;
  }

  return { start, pause, resume, restart, destroy, setPalette };
}
