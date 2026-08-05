// Catálogo mock de juegos. Contenido copiado literalmente de
// references/templates/data.jsx — no reescribir ni traducir los textos.

export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export type Game = {
  /** Slug de la ruta: "bloque-buster", "caida", … */
  id: string;
  title: string;
  /** Frase corta para la tarjeta de la biblioteca. */
  short: string;
  /** Párrafo largo para la pantalla de detalle. */
  long: string;
  cat: GameCategory;
  /** Clase de portada definida en app/globals.css: "cover-bricks", … */
  cover: string;
  /** Tinte del botón JUGAR. */
  color: GameColor;
  /** Key en lib/games/registry.ts si tiene motor real + leaderboard real en Supabase. */
  engine?: string;
  /** Mejor puntuación global. */
  best: number;
  /** Ya formateado, igual que el template: "12.4K". */
  plays: string;
};

export const GAMES: readonly Game[] = [
  {
    id: "bloque-buster",
    title: "BLOQUE BUSTER",
    short: "Rebota la pelota y destruye muros de neón.",
    long: "Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?",
    cat: "ARCADE",
    cover: "cover-bricks",
    color: "cyan",
    best: 28450,
    plays: "12.4K",
  },
  {
    id: "caida",
    title: "CAÍDA",
    short: "Encaja las piezas antes de que el techo te aplaste.",
    long: "Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.",
    cat: "PUZZLE",
    cover: "cover-tetro",
    color: "magenta",
    best: 184220,
    plays: "31.8K",
  },
  {
    id: "serpentina",
    title: "SERPENTINA",
    short: "Crece sin morder tu propia cola.",
    long: "Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.",
    cat: "ARCADE",
    cover: "cover-snake",
    color: "green",
    best: 7820,
    plays: "9.1K",
  },
  {
    id: "gloton",
    title: "GLOTÓN",
    short: "Devora puntos y escapa de los fantasmas.",
    long: "Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.",
    cat: "ARCADE",
    cover: "cover-glot",
    color: "yellow",
    best: 96400,
    plays: "27.2K",
  },
  {
    id: "invasores",
    title: "INVASORES",
    short: "Defiende el planeta de filas alienígenas.",
    long: "Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.",
    cat: "SHOOTER",
    cover: "cover-invaders",
    color: "green",
    best: 54190,
    plays: "18.0K",
  },
  {
    id: "rocas",
    title: "ROCAS",
    short: "Pulveriza asteroides en gravedad cero.",
    long: "Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.",
    cat: "SHOOTER",
    cover: "cover-rocas",
    color: "yellow",
    best: 41200,
    plays: "15.6K",
  },
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
    id: "ranaria",
    title: "RANARIA",
    short: "Cruza la autopista de pixeles.",
    long: "Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.",
    cat: "ARCADE",
    cover: "cover-rana",
    color: "green",
    best: 18900,
    plays: "6.4K",
  },
  {
    id: "duelo-pixel",
    title: "DUELO PIXEL",
    short: "Dos paletas. Una pelota. Reflejos máximos.",
    long: "El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.",
    cat: "VERSUS",
    cover: "cover-duelo",
    color: "cyan",
    best: 24,
    plays: "4.2K",
  },
];

export const CATS: readonly string[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];

export function getGame(id: string): Game | undefined {
  return GAMES.find((game) => game.id === id);
}
