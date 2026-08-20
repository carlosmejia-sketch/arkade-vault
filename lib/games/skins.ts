// Infraestructura genérica de skins visuales por juego.
// Cada motor real puede recibir una GamePalette para cambiar sus colores sin
// alterar su lógica de juego. Ver specs/11-skins-asteroides.md.

export type SkinId = "clasico" | "neon" | "retro";

export type GameId = "asteroides" | "tetris" | "arkanoid" | "snake" | "frogger";

// Roles de color de Asteroides. `rejilla` no aplica: el motor es vectorial y
// no dibuja grilla de fondo.
export type GamePalette = {
  fondo: string;
  entidadPrincipal: string;
  entidadSecundaria: string;
  proyectil: string;
  acento: string;
  peligro: string;
  particula: string;
  hud: string;
  overlay: string;
  textoHud: string;
  // Roles propios de Arkanoid: recoloreo por tinte de un spritesheet en vez de
  // dibujo vectorial. Ver specs/13-skins-arkanoid.md.
  tinteSprites?: boolean;
  bloqueRojo?: string;
  bloqueAmarillo?: string;
  bloqueCyan?: string;
  bloqueMagenta?: string;
  bloqueRosa?: string;
  bloqueVerde?: string;
  bloqueGris?: string;
  // Roles propios de Frogger: 4 fondos de zona + vehículos + río + meta +
  // barra de tiempo. Ver specs/16-skins-frogger.md.
  zonaMeta?: string;
  zonaRio?: string;
  zonaSegura?: string;
  zonaCarretera?: string;
  casillaMetaFondo?: string;
  casillaMetaBorde?: string;
  auto?: string;
  autoRueda?: string;
  camionCabina?: string;
  tronco?: string;
  troncoVeta?: string;
  tortuga?: string;
  barraTiempoSegura?: string;
  barraTiempoAlerta?: string;
  barraTiempoPeligro?: string;
};

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKINS: Partial<Record<GameId, Record<SkinId, GamePalette>>> = {
  asteroides: {
    clasico: {
      fondo: "#000000",
      entidadPrincipal: "#ffffff",
      entidadSecundaria: "#ffffff",
      proyectil: "#ffffff",
      acento: "#00ffff",
      peligro: "rgba(255, 130, 0, 0.85)",
      particula: "#ffffff",
      hud: "#ffffff",
      overlay: "#ffffff",
      textoHud: "rgba(255, 255, 255, 0.65)",
    },
    neon: {
      fondo: "#0a0a0f",
      entidadPrincipal: "#00f5ff",
      entidadSecundaria: "#ff006e",
      proyectil: "#f5ff00",
      acento: "#00ff88",
      peligro: "#ff6a00",
      particula: "rgba(255, 255, 255, 0.9)",
      hud: "#00f5ff",
      overlay: "#f5ff00",
      textoHud: "rgba(255, 255, 255, 0.75)",
    },
    retro: {
      fondo: "#001505",
      entidadPrincipal: "#33ff66",
      entidadSecundaria: "#1f9a44",
      proyectil: "#baffcb",
      acento: "#ffb000",
      peligro: "#d92a00",
      particula: "#7dffb2",
      hud: "#33ff66",
      overlay: "#ffb000",
      textoHud: "#1f9a44",
    },
  },
  snake: {
    clasico: {
      fondo: "#000000",
      entidadPrincipal: "#00ff88",
      entidadSecundaria: "rgba(0, 255, 136, 0.75)",
      proyectil: "#ff2d55",
      acento: "#ff2d55",
      peligro: "#ff2d55",
      particula: "#ff2d55",
      hud: "#ffffff",
      overlay: "#ffffff",
      textoHud: "rgba(255, 255, 255, 0.65)",
    },
    neon: {
      fondo: "#0a0a0f",
      entidadPrincipal: "#00f5ff",
      entidadSecundaria: "rgba(0, 245, 255, 0.55)",
      proyectil: "#ff006e",
      acento: "#ff006e",
      peligro: "#ff006e",
      particula: "#ff006e",
      hud: "#00f5ff",
      overlay: "#f5ff00",
      textoHud: "rgba(255, 255, 255, 0.75)",
    },
    retro: {
      fondo: "#001505",
      entidadPrincipal: "#33ff66",
      entidadSecundaria: "#1f9a44",
      proyectil: "#ffb000",
      acento: "#ffb000",
      peligro: "#ffb000",
      particula: "#ffb000",
      hud: "#33ff66",
      overlay: "#ffb000",
      textoHud: "#1f9a44",
    },
  },
  arkanoid: {
    clasico: {
      fondo: "#000000",
      entidadPrincipal: "#e6e6e6",
      entidadSecundaria: "#c9c9c9",
      proyectil: "#ffffff",
      acento: "#f0c040",
      peligro: "#ff8200",
      particula: "#ffffff",
      hud: "#ffffff",
      overlay: "#ffffff",
      textoHud: "#ffffff",
      tinteSprites: false,
      bloqueRojo: "#e63946",
      bloqueAmarillo: "#e8a33d",
      bloqueCyan: "#4a90d9",
      bloqueMagenta: "#7b68c9",
      bloqueRosa: "#e069a6",
      bloqueVerde: "#5cb85c",
      bloqueGris: "#8c8c9c",
    },
    neon: {
      fondo: "#0a0a0f",
      entidadPrincipal: "#00f5ff",
      entidadSecundaria: "#f5ff00",
      proyectil: "#f5ff00",
      acento: "#00ff88",
      peligro: "#ff6a00",
      particula: "rgba(255, 255, 255, 0.9)",
      hud: "#00f5ff",
      overlay: "#f5ff00",
      textoHud: "rgba(255, 255, 255, 0.75)",
      tinteSprites: true,
      bloqueRojo: "#ff5a3a",
      bloqueAmarillo: "#ffcc00",
      bloqueCyan: "#1499a6",
      bloqueMagenta: "#ff006e",
      bloqueRosa: "#ff8fbf",
      bloqueVerde: "#7dffb2",
      bloqueGris: "#5c5c70",
    },
    retro: {
      fondo: "#150a00",
      entidadPrincipal: "#ffb000",
      entidadSecundaria: "#fff2c2",
      proyectil: "#fff2c2",
      acento: "#ff7a00",
      peligro: "#b34700",
      particula: "#ffe9b3",
      hud: "#ffb000",
      overlay: "#ffb000",
      textoHud: "#b3792a",
      tinteSprites: true,
      bloqueRojo: "#ff5030",
      bloqueAmarillo: "#ffb000",
      bloqueCyan: "#ffe9b3",
      bloqueMagenta: "#a05a2a",
      bloqueRosa: "#ff7a52",
      bloqueVerde: "#5c8a35",
      bloqueGris: "#7a5a3a",
    },
  },
  frogger: {
    clasico: {
      fondo: "#06331a",
      entidadPrincipal: "#39ff5c",
      entidadSecundaria: "#8c8c9c",
      proyectil: "#ff2d55",
      acento: "#33ff66",
      peligro: "#ff2d55",
      particula: "#33ff66",
      hud: "#ffffff",
      overlay: "#ffffff",
      textoHud: "#ffffff",
      zonaMeta: "#052a12",
      zonaRio: "#001d3d",
      zonaSegura: "#06331a",
      zonaCarretera: "#0a0a0a",
      casillaMetaFondo: "#0b4a22",
      casillaMetaBorde: "#d4af37",
      auto: "#ff2d55",
      autoRueda: "#222222",
      camionCabina: "#555555",
      tronco: "#7a4a1f",
      troncoVeta: "#5a3414",
      tortuga: "#2fbf5a",
      barraTiempoSegura: "#33ff66",
      barraTiempoAlerta: "#f5ff00",
      barraTiempoPeligro: "#ff2d55",
    },
    neon: {
      fondo: "#0a0a0f",
      entidadPrincipal: "#00f5ff",
      entidadSecundaria: "#f5ff00",
      proyectil: "#ff006e",
      acento: "#00ff88",
      peligro: "#ff006e",
      particula: "#00ff88",
      hud: "#00f5ff",
      overlay: "#f5ff00",
      textoHud: "rgba(255, 255, 255, 0.75)",
      zonaMeta: "#001d17",
      zonaRio: "#001522",
      zonaSegura: "#0a0a0f",
      zonaCarretera: "#050507",
      casillaMetaFondo: "#003d2e",
      casillaMetaBorde: "#00f5ff",
      auto: "#ff006e",
      autoRueda: "#1a1a1f",
      camionCabina: "#b3b300",
      tronco: "#b35f1a",
      troncoVeta: "#7a3f10",
      tortuga: "#00ff88",
      barraTiempoSegura: "#00ff88",
      barraTiempoAlerta: "#f5ff00",
      barraTiempoPeligro: "#ff006e",
    },
    retro: {
      fondo: "#150d00",
      entidadPrincipal: "#ffb000",
      entidadSecundaria: "#c9b382",
      proyectil: "#ff3300",
      acento: "#33cc70",
      peligro: "#ff3300",
      particula: "#33cc70",
      hud: "#ffb000",
      overlay: "#ffb000",
      textoHud: "#b3792a",
      zonaMeta: "#1a0f00",
      zonaRio: "#0d0a00",
      zonaSegura: "#150d00",
      zonaCarretera: "#0a0700",
      casillaMetaFondo: "#2a1800",
      casillaMetaBorde: "#ffb000",
      auto: "#ff3300",
      autoRueda: "#402000",
      camionCabina: "#8a7550",
      tronco: "#8a5a1f",
      troncoVeta: "#5c3b14",
      tortuga: "#33cc70",
      barraTiempoSegura: "#33cc70",
      barraTiempoAlerta: "#ffb000",
      barraTiempoPeligro: "#ff3300",
    },
  },
};

export function getPalette(
  gameId: GameId,
  skinId: SkinId,
): GamePalette | undefined {
  const gameSkins = SKINS[gameId];
  if (!gameSkins) return undefined;
  return gameSkins[skinId] ?? gameSkins.clasico;
}
