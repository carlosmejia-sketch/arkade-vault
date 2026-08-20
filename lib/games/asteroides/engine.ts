// Motor del juego Asteroides, portado desde
// references/started-games/02-asteroids/game.js.
//
// Diferencias respecto al original (ver specs/05-juego-asteroides.md):
// - El canvas se recibe por parámetro, no se busca con document.getElementById.
// - Los listeners de teclado se agregan en start() y se quitan en destroy(),
//   no viven a nivel de módulo.
// - update() invoca los callbacks (onScore/onLives/onLevel/onGameOver) cuando
//   el valor correspondiente cambia, para que React refleje el estado real.
// - Se removió el reinicio por Espacio en el estado 'gameover': el único
//   reinicio posible es restart(), llamado desde el modal de React.
// - pause()/resume() congelan/reanudan el loop (dt no avanza en pausa).

import type { Engine, EngineCallbacks } from "../types";
import type { GamePalette } from "../skins";
import { getPalette } from "../skins";

const W = 800;
const H = 600;

export type { EngineCallbacks };
export type AsteroidesEngine = Engine;

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

// Aplica una opacidad al color de un rol de paleta (hex u rgba), multiplicando
// por cualquier alpha que ya traiga el color (p. ej. `particula` en neon).
//
// El parseo (regex/parseInt) se cachea por string de color: la paleta es
// estática entre llamadas a setPalette(), así que reparsear el mismo color en
// cada partícula de cada frame (checklist de performance, regla 9) era trabajo
// repetido innecesario. Solo se recalcula el `rgba(...)` final, que sí depende
// del alpha variable por partícula.
type ParsedColor = { r: number; g: number; b: number; baseAlpha: number };
const colorParseCache = new Map<string, ParsedColor>();

function parseColor(color: string): ParsedColor {
  const cached = colorParseCache.get(color);
  if (cached) return cached;
  const rgbaMatch = color.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  let parsed: ParsedColor;
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    parsed = {
      r: Number(r),
      g: Number(g),
      b: Number(b),
      baseAlpha: a !== undefined ? parseFloat(a) : 1,
    };
  } else {
    const hex = color.replace("#", "");
    parsed = {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      baseAlpha: 1,
    };
  }
  colorParseCache.set(color, parsed);
  return parsed;
}

function withAlpha(color: string, alpha: number): string {
  const { r, g, b, baseAlpha } = parseColor(color);
  return `rgba(${r}, ${g}, ${b}, ${(baseAlpha * alpha).toFixed(3)})`;
}

// Elimina en el propio arreglo (sin crear uno nuevo) los elementos con
// `dead === true`, preservando el orden relativo de los que sobreviven.
// Sustituye los `arr = arr.filter(e => !e.dead)` que antes se ejecutaban cada
// frame para bullets/particles/powerUps/asteroids (checklist de performance,
// regla 7): mismo resultado, sin reasignar ni allocar un arreglo nuevo.
function compact<T extends { dead: boolean }>(arr: T[]): void {
  let write = 0;
  for (let read = 0; read < arr.length; read++) {
    if (!arr[read].dead) arr[write++] = arr[read];
  }
  arr.length = write;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

type GameState = "playing" | "dead" | "gameover";

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, palette: GamePalette) {
    ctx.fillStyle = palette.proyectil;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][] = [];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D, palette: GamePalette) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = palette.entidadSecundaria;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 12;
  ttl = POWERUP_TTL;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, palette: GamePalette) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = palette.acento;
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.fillStyle = palette.acento;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  x = 0;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 0;
  shootCooldown = 0;
  tripleShot = 0;
  dead = false;

  constructor(private keys: Record<string, boolean>) {
    this.reset();
  }

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (this.keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (this.keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!this.keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D, palette: GamePalette) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = palette.entidadPrincipal;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = palette.peligro;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, palette: GamePalette) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = withAlpha(palette.particula, alpha);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

export function createAsteroidesEngine(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  initialPalette: GamePalette = getPalette("asteroides", "clasico")!,
): AsteroidesEngine {
  const ctx = canvas.getContext("2d")!;
  let palette = initialPalette;

  // El canvas se escala por CSS al tamaño del contenedor `.crt-screen`
  // (`.asteroides-canvas { width: 100%; height: 100% }`); sin ajustar por
  // devicePixelRatio, el backing store queda fijo en 800x600 y el navegador
  // reescala esos píxeles al tamaño real de pantalla, difuminando las líneas
  // vectoriales en monitores de alta densidad (checklist de performance,
  // regla 18). Se agranda el backing store por el DPR una sola vez al crear
  // el motor y se escala el contexto para que el resto del código siga
  // dibujando en las coordenadas lógicas 800x600 sin cambios.
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (dpr !== 1) {
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }

  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};

  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };

  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUps: PowerUp[];
  let score: number;
  let lives: number;
  let level: number;
  let state: GameState;
  let deadTimer: number;
  let powerUpSpawned: boolean;
  let killsSinceSpawn: number;

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

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    // Límite de intentos explícito (checklist de performance, regla 16): hoy
    // es inalcanzable por geometría (W×H siempre deja espacio fuera del
    // círculo central), pero sin este tope el bucle quedaría abierto a
    // colgarse si esos valores cambiaran en el futuro.
    const MAX_ATTEMPTS = 50;
    for (let i = 0; i < count; i++) {
      let x = W / 2;
      let y = H / 2;
      let attempts = 0;
      do {
        x = rand(0, W);
        y = rand(0, H);
        attempts++;
      } while (
        Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST &&
        attempts < MAX_ATTEMPTS
      );
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship(keys);
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    lastScore = -1;
    lastLives = -1;
    lastLevel = -1;
    spawnAsteroids(4);
    emitIfChanged();
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  // Tamaño de celda de la rejilla de broad-phase para colisiones bala↔asteroide
  // (checklist de performance, regla 13). Debe ser >= al mayor radio de
  // colisión posible (asteroide grande 50 + bala 2) para garantizar que un
  // vecindario de 3x3 celdas alrededor de la bala cubra cualquier asteroide
  // que pueda estar tocándola, sin perder ningún par que el chequeo
  // producto-cartesiano original sí habría detectado.
  const COLLISION_CELL = 128;
  const asteroidGrid = new Map<string, Asteroid[]>();

  function cellKey(cx: number, cy: number): string {
    return cx + "," + cy;
  }

  function rebuildAsteroidGrid() {
    asteroidGrid.clear();
    for (const a of asteroids) {
      if (a.dead) continue;
      const key = cellKey(
        Math.floor(a.x / COLLISION_CELL),
        Math.floor(a.y / COLLISION_CELL),
      );
      let bucket = asteroidGrid.get(key);
      if (!bucket) {
        bucket = [];
        asteroidGrid.set(key, bucket);
      }
      bucket.push(a);
    }
  }

  function update(dt: number) {
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      compact(particles);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      compact(particles);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed("Space")) {
      for (const bullet of ship.tryShoot()) bullets.push(bullet);
    }

    ship.update(dt);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    compact(bullets);
    compact(particles);
    compact(powerUps);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide: broad-phase por rejilla en vez de recorrer
    // bullets × asteroids completo (checklist de performance, regla 13).
    const newAsteroids: Asteroid[] = [];
    rebuildAsteroidGrid();
    for (const b of bullets) {
      if (b.dead) continue;
      const cx = Math.floor(b.x / COLLISION_CELL);
      const cy = Math.floor(b.y / COLLISION_CELL);
      for (let dx = -1; dx <= 1 && !b.dead; dx++) {
        for (let dy = -1; dy <= 1 && !b.dead; dy++) {
          const bucket = asteroidGrid.get(cellKey(cx + dx, cy + dy));
          if (!bucket) continue;
          for (const a of bucket) {
            if (!a.dead && !b.dead && dist(b, a) < a.radius) {
              b.dead = true;
              a.dead = true;
              score += POINTS[a.size];
              explode(a.x, a.y, a.size * 5);
              for (const child of a.split()) newAsteroids.push(child);
              if (!powerUpSpawned) {
                killsSinceSpawn++;
                const guaranteed = killsSinceSpawn >= 5;
                if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
                  powerUps.push(new PowerUp(a.x, a.y));
                  powerUpSpawned = true;
                }
              }
            }
          }
        }
      }
    }
    compact(asteroids);
    for (const na of newAsteroids) asteroids.push(na);
    compact(bullets);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }

  function drawLifeIcon(x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = palette.hud;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Texto de HUD cacheado: drawHUD() corre cada frame (~160fps en este
  // entorno) pero score/level solo cambian por evento — recalcular el
  // template literal en cada frame era costo innecesario (checklist de
  // performance, regla 8). Se recomputa únicamente cuando el valor cambia.
  const hudScoreCache = { value: NaN, text: "" };
  const hudLevelCache = { value: NaN, text: "" };

  function drawHUD() {
    ctx.fillStyle = palette.hud;
    ctx.font = "15px monospace";

    ctx.textAlign = "left";
    if (hudScoreCache.value !== score) {
      hudScoreCache.value = score;
      hudScoreCache.text = `SCORE  ${score}`;
    }
    ctx.fillText(hudScoreCache.text, 14, 26);

    ctx.textAlign = "center";
    if (hudLevelCache.value !== level) {
      hudLevelCache.value = level;
      hudLevelCache.text = `NIVEL ${level}`;
    }
    ctx.fillText(hudLevelCache.text, W / 2, 26);

    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);

    if (ship.tripleShot > 0) {
      ctx.textAlign = "left";
      ctx.fillStyle = palette.acento;
      ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
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

    particles.forEach((p) => p.draw(ctx, palette));
    asteroids.forEach((a) => a.draw(ctx, palette));
    powerUps.forEach((p) => p.draw(ctx, palette));
    bullets.forEach((b) => b.draw(ctx, palette));
    ship.draw(ctx, palette);

    drawHUD();

    if (state === "gameover") drawOverlay("GAME OVER", `PUNTAJE: ${score}`);
  }

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let running = false;
  let gameOverEmitted = false;
  // Distingue una detención automática (game over ya con las partículas de
  // explosión apagadas, o pestaña oculta) de una pausa/reanudación explícita
  // pedida por game-player.tsx — solo la primera se auto-reanuda sola.
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
    if (state === "gameover" && !gameOverEmitted) {
      gameOverEmitted = true;
      callbacks.onGameOver(score);
    }
    draw();
    // El estado "gameover" es terminal: una vez que las últimas partículas de
    // la explosión se apagaron no hay nada más que animar, así que el loop se
    // detiene en vez de seguir corriendo rAF (y por lo tanto draw()) para
    // siempre en la pantalla de fin de partida (checklist de performance,
    // regla 5). La pantalla queda estática con el último frame dibujado.
    if (state === "gameover" && particles.length === 0) {
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
      running = true;
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    }
  };

  function start() {
    if (running) return;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibilityChange);
    initGame();
    gameOverEmitted = false;
    pausedByVisibility = false;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    pausedByVisibility = false;
    stopLoop();
  }

  function resume() {
    if (running) return;
    pausedByVisibility = false;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function restart() {
    initGame();
    gameOverEmitted = false;
    pausedByVisibility = false;
    resume();
  }

  function destroy() {
    pause();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  function setPalette(next: GamePalette) {
    palette = next;
  }

  return { start, pause, resume, restart, destroy, setPalette };
}
