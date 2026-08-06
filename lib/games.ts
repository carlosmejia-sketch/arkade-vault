// Catálogo de juegos, todos con motor real + leaderboard real en Supabase.

export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export type Game = {
  /** Slug de la ruta: "asteroides", "tetris", … */
  id: string;
  title: string;
  /** Frase corta para la tarjeta de la biblioteca. */
  short: string;
  /** Párrafo largo para la pantalla de detalle. */
  long: string;
  cat: GameCategory;
  /** Clase de portada definida en app/globals.css: "cover-asteroides", … */
  cover: string;
  /** Tinte del botón JUGAR. */
  color: GameColor;
  /** Key en lib/games/registry.ts — todo juego del catálogo tiene motor real + leaderboard real. */
  engine: string;
  /** Mejor puntuación global. */
  best: number;
  /** Ya formateado, igual que el template: "12.4K". */
  plays: string;
};

export const GAMES: readonly Game[] = [
  {
    id: "asteroides",
    title: "ASTEROIDES",
    short: "Pulveriza rocas y sobrevive en el vacío.",
    long: "Pilota una nave triangular a la deriva en el vacío. Dispara y rota para partir asteroides en fragmentos cada vez más pequeños. Recoge el power-up 3x para triplicar tu disparo por unos segundos.",
    cat: "SHOOTER",
    cover: "cover-asteroides",
    color: "cyan",
    engine: "asteroides",
    best: 63500,
    plays: "2.1K",
  },
  {
    id: "tetris",
    title: "TETRIS",
    short: "Encaja piezas y limpia líneas antes de que se acumulen.",
    long: "Piezas de siete formas distintas caen desde arriba. Rótalas, encástralas y limpia líneas completas antes de que el tablero se desborde. La velocidad aumenta cada 10 líneas sin piedad.",
    cat: "PUZZLE",
    cover: "cover-tetris",
    color: "yellow",
    engine: "tetris",
    best: 92800,
    plays: "1.3K",
  },
  {
    id: "arkanoid",
    title: "ARKANOID",
    short: "Rebota la pelota y despeja el tablero nivel a nivel.",
    long: "Controla una paleta con mouse o teclado para rebotar la pelota y destruir hileras de bloques cromáticos. Cinco niveles con patrones distintos y velocidad creciente. Cada bloque roto suena y estalla en pixeles.",
    cat: "ARCADE",
    cover: "cover-arkanoid",
    color: "magenta",
    engine: "arkanoid",
    best: 15600,
    plays: "0.4K",
  },
  {
    id: "snake",
    title: "SNAKE",
    short: "Devora frutas y crece sin perder el rumbo.",
    long: "Guía una serpiente de píxeles por una grilla sin bordes: al llegar a un extremo reaparece del lado opuesto. Cada fruta que devora —de un surtido real de más de 20 variedades— la hace más larga y más veloz. Un giro en falso contra su propia cola termina la partida.",
    cat: "ARCADE",
    cover: "cover-snake-real",
    color: "green",
    engine: "snake",
    best: 4200,
    plays: "0.2K",
  },
];

export const CATS: readonly string[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER"];

export function getGame(id: string): Game | undefined {
  return GAMES.find((game) => game.id === id);
}
