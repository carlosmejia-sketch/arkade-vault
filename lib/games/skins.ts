// Infraestructura genérica de skins visuales por juego.
// Cada motor real puede recibir una GamePalette para cambiar sus colores sin
// alterar su lógica de juego. Ver specs/11-skins-asteroides.md.

export type SkinId = "clasico" | "neon" | "retro";

export type GameId = "asteroides" | "tetris" | "arkanoid" | "snake";

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
};

export function getPalette(
  gameId: GameId,
  skinId: SkinId,
): GamePalette | undefined {
  const gameSkins = SKINS[gameId];
  if (!gameSkins) return undefined;
  return gameSkins[skinId] ?? gameSkins.clasico;
}
