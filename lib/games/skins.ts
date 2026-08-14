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
};

export function getPalette(
  gameId: GameId,
  skinId: SkinId,
): GamePalette | undefined {
  const gameSkins = SKINS[gameId];
  if (!gameSkins) return undefined;
  return gameSkins[skinId] ?? gameSkins.clasico;
}
