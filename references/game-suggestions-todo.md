# To Do — sugerencias de juegos

Memoria del agente `game-planner`. No editar a mano las filas de estado sin
actualizar también la ficha correspondiente.

Estados: `propuesto` · `rechazado` · `en-spec` · `implementado`

| Slug                      | Título             | Categoría | Color        | Estado       | Fecha      | Veredicto                                                             |
| ------------------------- | ------------------ | --------- | ------------ | ------------ | ---------- | --------------------------------------------------------------------- |
| `asteroides`              | ASTEROIDES         | SHOOTER   | cyan         | implementado | 2026-08-12 | Spec 05/06.                                                           |
| `tetris`                  | TETRIS             | PUZZLE    | yellow       | implementado | 2026-08-12 | Spec 07.                                                              |
| `arkanoid`                | ARKANOID           | ARCADE    | magenta      | implementado | 2026-08-12 | Spec 08.                                                              |
| `snake`                   | SNAKE              | ARCADE    | green        | implementado | 2026-08-12 | Spec 09.                                                              |
| `pong`                    | PONG               | VERSUS    | magenta      | en-spec      | 2026-08-12 | Spec en `specs/game-jam/pong/` — provisto directo por el usuario.     |
| `pixel-runner`            | PIXEL RUNNER       | ARCADE    | yellow       | propuesto    | 2026-08-12 | Ver ficha — alternativa.                                              |
| `memory-match`            | MEMORY MATCH       | PUZZLE    | cyan         | propuesto    | 2026-08-12 | Ver ficha — alternativa baja complejidad.                             |
| `topo-golpe`              | TOPO-GOLPE         | ARCADE    | cyan         | propuesto    | 2026-08-12 | Ver ficha — bajo riesgo, motor subutilizado.                          |
| `saltarin`                | SALTARÍN           | ARCADE    | yellow       | propuesto    | 2026-08-12 | Ver ficha — alternativa fuerte, bajo riesgo.                          |
| `escalada`                | ESCALADA           | ARCADE    | cyan/magenta | propuesto    | 2026-08-12 | Ver ficha — complejidad media (scroll infinito).                      |
| `cruce`                   | CRUCE              | ARCADE    | green        | propuesto    | 2026-08-12 | Ver ficha — complejidad media.                                        |
| `laberinto`               | LABERINTO          | ARCADE    | magenta      | propuesto    | 2026-08-12 | Ver ficha — complejidad alta (IA persecución).                        |
| `dos-mil-cuarenta-y-ocho` | 2048               | PUZZLE    | yellow       | propuesto    | 2026-08-12 | Ver ficha — puntaje ideal, motor subutilizado.                        |
| `buscaminas`              | BUSCAMINAS         | PUZZLE    | cyan         | propuesto    | 2026-08-12 | Ver ficha — motor casi sin loop.                                      |
| `apaga-luces`             | APAGA LAS LUCES    | PUZZLE    | magenta      | propuesto    | 2026-08-12 | Ver ficha — bajo riesgo, motor subutilizado.                          |
| `sokoban`                 | SOKOBAN            | PUZZLE    | green        | propuesto    | 2026-08-12 | Ver ficha — riesgo de contenido (niveles curados).                    |
| `match-3`                 | GEMAS              | PUZZLE    | cyan         | propuesto    | 2026-08-12 | Ver ficha — mejor encaje de motor RAF del bloque puzzle.              |
| `invasores`               | INVASORES          | SHOOTER   | cyan         | propuesto    | 2026-08-12 | Ver ficha — 2do shooter, no suma diversidad.                          |
| `galaxia`                 | GALAXIA            | SHOOTER   | magenta      | propuesto    | 2026-08-12 | Ver ficha — alternativa a invasores, media-alta.                      |
| `hockey-aereo`            | AIR HOCKEY         | VERSUS    | green        | propuesto    | 2026-08-12 | Ver ficha — alternativa a pong, mismo hueco VERSUS.                   |
| `comando-misiles`         | COMANDO DE MISILES | SHOOTER   | yellow       | propuesto    | 2026-08-12 | Ver ficha — 3er shooter.                                              |
| `duelo-pixel`             | DUELO PÍXEL        | VERSUS    | magenta      | propuesto    | 2026-08-12 | Ver ficha — riesgo alto, mapeo de puntaje artificial.                 |
| `turbo-circuito`          | TURBO CIRCUITO     | ARCADE    | cyan         | propuesto    | 2026-08-12 | Ver ficha — 3ra entrada ARCADE.                                       |
| `compas`                  | COMPÁS             | ARCADE    | yellow       | propuesto    | 2026-08-12 | Ver ficha — necesita audio, rompe canvas puro.                        |
| `bastion`                 | BASTIÓN            | ARCADE    | magenta      | propuesto    | 2026-08-12 | Ver ficha — riesgo alto, tower-defense no cabe bien en EngineFactory. |
| `pop-burbujas`            | POP BURBUJAS       | PUZZLE    | green        | propuesto    | 2026-08-12 | Ver ficha — posible solape con match-3.                               |
| `secuencia`               | SECUENCIA          | PUZZLE    | cyan         | propuesto    | 2026-08-12 | Ver ficha — bajo riesgo, saturaría PUZZLE si se suma a memory-match.  |

## Fichas

<!--
Plantilla para candidatos nuevos (copiar debajo de esta línea):

### `<slug>` — <TÍTULO> · `propuesto` · <fecha>

- **Categoría / color**: <CATEGORÍA> / <color>
- **Controles**: <...>
- **Puntaje**: <fuente del entero creciente>
- **Assets**: canvas puro (o `public/<slug>/...`)
- **Complejidad de motor**: baja | media | alta
- **Por qué encaja**: <2–4 líneas contra los criterios de encaje>
- **Riesgo**: <el principal>
- **Veredicto**: <decisión del usuario y su razón; vacío si aún no hay>
-->

Las 4 filas iniciales corresponden a juegos ya implementados (specs 05–09);
no llevan ficha porque su historial vive en su spec correspondiente.

### `pong` — PONG · `en-spec` · 2026-08-12

- **Actualización:** el usuario decidió directamente implementar Pong (no vino de
  la recomendación consolidada de abajo, aunque coincide con ella). Spec técnico
  y concepto ya escritos en `specs/game-jam/pong/01-juego-pong.md` y
  `02-concepto-pong.md`. Puntaje resuelto como rally (+10 por rebote del
  jugador) + bono (+50 cuando la IA falla) + sistema de 3 vidas, análogo al
  patrón ya usado por Arkanoid. Categoría `VERSUS` se agrega a `CATS` como
  parte del alcance de esa spec.

### `pong` — PONG · `propuesto` · 2026-08-12 (ficha original)

- **Categoría / color**: VERSUS / magenta (reutilizable; único hueco real de
  color libre porque `magenta` ya lo usa `arkanoid` pero `VERSUS` no existe
  en `CATS` — hay que sumarlo, coste explícito).
- **Controles**: teclado, paleta del jugador arriba/abajo (`↑`/`↓` o `W`/`S`);
  paleta rival controlada por IA simple (seguimiento con delay/error).
- **Puntaje**: no usar el marcador clásico "primero a 11" (no crece de forma
  monótona ni cabe bien en el `CHECK` de miles). Mapear a **puntos totales
  anotados en la partida antes de perder 5 rallies** o a un contador de
  golpes de paleta consecutivos sin fallar (rebote = +10, acelera con cada
  rebote) — analogía directa a como Arkanoid puntúa por bloque.
- **Assets**: canvas puro, sin sprites (rectángulos + bola), consistente con
  Asteroides.
- **Complejidad de motor**: media — requiere IA de la paleta rival y difi-
  cultad progresiva, pero física es solo AABB/rebote, ya resuelta en
  Arkanoid (`lib/games/arkanoid/engine.ts` es referencia directa).
- **Por qué encaja**: única propuesta que llena la categoría `VERSUS` (hoy
  vacía en `CATS`), da variedad real de género frente a shooter/puzzle/
  arcade×2, reutiliza physics de Arkanoid (motor de bajo riesgo) y no
  necesita assets nuevos.
- **Riesgo**: `VERSUS` no está en `CATS` — tocar `lib/games.ts` (agregar el
  string a `CATS`) es coste extra fuera del patrón de "solo agregar un
  juego"; y el mapeo de puntaje necesita definirse con cuidado para no
  sentirse arbitrario.
- **Veredicto**: (pendiente de decisión del usuario)

### `pixel-runner` — PIXEL RUNNER · `propuesto` · 2026-08-12

- **Categoría / color**: ARCADE / yellow (yellow libre; hoy solo lo usa
  Tetris que es PUZZLE, sin choque de categoría).
- **Controles**: una sola tecla (`Espacio`/`↑`) para saltar/agachar sobre un
  corredor automático estilo endless runner (Chrome Dino).
- **Puntaje**: distancia recorrida en píxeles/tiempo, entero creciente
  natural — encaja perfecto con el `CHECK` sin mapear nada.
- **Assets**: canvas puro (rectángulos/formas), sin sprites necesarios para
  un MVP; opcionalmente parallax simple con `fillRect`.
- **Complejidad de motor**: baja — un solo actor, colisiones simples con
  obstáculos, velocidad creciente con el tiempo (mismo patrón que Snake).
- **Por qué encaja**: motor más simple de los tres candidatos, cero riesgo
  de assets, puntaje trivialmente válido para la tabla `scores`. No suma
  diversidad de categoría (ya hay 2 ARCADE) ni de color de forma crítica.
- **Riesgo**: la tercera categoría ARCADE reduce la variedad de catálogo;
  puede sentirse repetitivo frente a Snake si no se diferencia bien en arte.
- **Veredicto**: (pendiente de decisión del usuario)

### `memory-match` — MEMORY MATCH · `propuesto` · 2026-08-12

- **Categoría / color**: PUZZLE / cyan (cyan ya lo usa Asteroides que es
  SHOOTER, sin choque de categoría; PUZZLE ya existe con Tetris).
- **Controles**: mouse/click (o teclado con cursor) para voltear cartas de
  una grilla — el único candidato sin controles de movimiento continuo.
- **Puntaje**: pares acertados × tiempo restante o combo por rondas sin
  fallar; requiere mapeo cuidadoso para no producir puntajes bajos/planos
  (riesgo declarado).
- **Assets**: canvas puro con formas/colores como "cartas" para MVP, o
  sprites simples si se quiere variedad visual — scope opcional.
- **Complejidad de motor**: baja — no hay loop de físicas real, es más
  máquina de estados que animación por frame; se aleja del patrón
  `requestAnimationFrame` intensivo de los otros 4 motores.
- **Por qué encaja**: sumaría una segunda mecánica PUZZLE claramente distinta
  a Tetris (memoria vs. caída de piezas) y controles por mouse, variedad
  real de interacción frente al teclado de los 4 actuales.
- **Riesgo**: el motor casi no usa el loop de animación (encaja mal con el
  contrato `EngineFactory` pensado para juegos de tiempo real); el puntaje
  natural es de rondas bajas, exige mapeo artificial para escalar.
- **Veredicto**: (pendiente de decisión del usuario)

### `topo-golpe` — TOPO-GOLPE (Whack-a-Mole) · `propuesto` · 2026-08-12

- **Categoría / color**: ARCADE / cyan (cyan solo lo usa Asteroides/SHOOTER, sin choque de categoría; sería la 3ra entrada ARCADE).
- **Controles**: mouse/click sobre grilla 3×3/4×4 donde el topo aparece en casilla aleatoria por intervalo decreciente; alternativa de teclado (flechas + `Espacio`) para accesibilidad.
- **Puntaje**: +10 por golpe acertado con multiplicador creciente cada 10 aciertos; entero creciente natural, sin mapeo.
- **Assets**: canvas puro (círculos/óvalos), sin sprites.
- **Complejidad de motor**: baja — temporizador por casilla + hit-testing de click, sin colisiones continuas.
- **Por qué encaja**: control por mouse (variedad real frente al teclado de los 4 actuales), motor de riesgo mínimo, puntaje trivialmente válido.
- **Riesgo**: encaja mal con el contrato `EngineFactory` pensado para loops de animación continua (mismo riesgo que `memory-match`).
- **Veredicto**: (pendiente de decisión del usuario)

### `saltarin` — SALTARÍN (Flappy Bird) · `propuesto` · 2026-08-12

- **Categoría / color**: ARCADE / yellow (mismo color/categoría que `pixel-runner`, mecánica distinta).
- **Controles**: una sola tecla (`Espacio`/`↑`) para impulso vertical contra gravedad constante, esquivando pares de obstáculos.
- **Puntaje**: +1 por obstáculo superado (patrón clásico), entero creciente natural sin mapeo.
- **Assets**: canvas puro (formas simples), sin sprites.
- **Complejidad de motor**: baja — gravedad+impulso más simple que Arkanoid, colisión AABB, spawn periódico igual al patrón de asteroides nuevos.
- **Por qué encaja**: ejemplo canónico de "un solo botón, timing puro"; motor de riesgo mínimo reutilizando patrones ya existentes en el repo; puntaje perfecto sin mapeo.
- **Riesgo**: 3ra entrada ARCADE si convive con `pixel-runner`; ajustar curva de dificultad (separación de huecos) es el reto real.
- **Veredicto**: (pendiente de decisión del usuario)

### `escalada` — ESCALADA (Doodle Jump) · `propuesto` · 2026-08-12

- **Categoría / color**: ARCADE / cyan o magenta (ambos ya ocupados, coste de reutilización declarado).
- **Controles**: `←`/`→` con wrap en bordes; el salto es automático al tocar cada plataforma.
- **Puntaje**: altura máxima alcanzada, entero creciente monótono sin mapeo — de los pocos 100% naturales.
- **Assets**: canvas puro; scroll de cámara vertical infinito con generación procedural de plataformas.
- **Complejidad de motor**: media — el scroll infinito y despawn de plataformas es un patrón nuevo sin precedente en el repo (los 4 motores actuales son de cámara fija).
- **Por qué encaja**: reflejos de timing genuinos (anticipar la siguiente plataforma), variedad real de mecánica (ningún juego actual tiene scroll de cámara).
- **Riesgo**: mayor superficie de bugs de colisión/rendimiento si no se recicla bien la lista de plataformas fuera de cámara; sin precedente directo en el repo.
- **Veredicto**: (pendiente de decisión del usuario)

### `cruce` — CRUCE (Frogger) · `propuesto` · 2026-08-12

- **Categoría / color**: ARCADE / green (comparte categoría con Snake, mecánica de grilla-y-esquiva distinta).
- **Controles**: movimiento discreto por grilla (una casilla por pulsación) cruzando carriles de tráfico a velocidad/dirección variable por carril.
- **Puntaje**: +10 por carril avanzado + bonus por cruce completo, entero creciente natural.
- **Assets**: canvas puro (bandas de color, rectángulos), sin sprites.
- **Complejidad de motor**: media — coordinar múltiples carriles con velocidades/direcciones independientes (más piezas móviles simultáneas que cualquier motor actual salvo Arkanoid).
- **Por qué encaja**: control discreto por grilla es una variante de interacción ausente en el catálogo (los 4 son movimiento continuo o por gravedad); puntaje perfecto.
- **Riesgo**: falta de `preventDefault()` (deuda conocida) es más molesta aquí por uso constante de las 4 flechas; si se agrega mecánica de "troncos/río" sube a complejidad alta.
- **Veredicto**: (pendiente de decisión del usuario)

### `laberinto` — LABERINTO (Pac-Man simplificado) · `propuesto` · 2026-08-12

- **Categoría / color**: ARCADE / magenta (coincide de color con `pong`, no de categoría).
- **Controles**: movimiento por grilla con buffer de input (dirección siguiente se aplica en la próxima intersección) sobre laberinto de paredes fijas.
- **Puntaje**: +10 por pellet, +50 por power-pellet, bono escalado por fantasma comido; entero creciente natural.
- **Assets**: canvas puro (matriz de paredes/pellets, formas simples para actor y fantasmas).
- **Complejidad de motor**: alta — requiere laberinto como grafo/grilla, IA de persecución de 1-2 fantasmas, detección de fin de nivel y estado de "fantasma asustado".
- **Por qué encaja**: mayor fidelidad al pedido "Pac-Man simplificado"; el que más se aleja en mecánica de los 4 juegos actuales (IA de persecución ausente hoy).
- **Riesgo**: complejidad de motor "alta", de las mayores de todo el catálogo propuesto; puede requerir 2+ iteraciones de spec antes de un MVP razonable.
- **Veredicto**: (pendiente de decisión del usuario)

### `dos-mil-cuarenta-y-ocho` — 2048 · `propuesto` · 2026-08-12

- **Categoría / color**: PUZZLE / yellow (comparte con Tetris; mecánica opuesta: deslizar/fusionar vs. caída de piezas).
- **Controles**: teclado, flechas para deslizar toda la grilla en una dirección.
- **Puntaje**: suma acumulada del valor de cada fusión, entero creciente natural sin mapeo — igual de limpio que Arkanoid puntuando por bloque.
- **Assets**: canvas puro, `fillRect` con texto por valor de ficha.
- **Complejidad de motor**: baja — grilla 4×4, lógica de deslizar/fusionar es función pura por turno; animación de desliz es opcional.
- **Por qué encaja**: puntaje más limpio del bloque puzzle; assets cero; profundiza PUZZLE con mecánica de fusión de números distinta a Tetris y Memory Match.
- **Riesgo**: máquina de estados por turno más que loop continuo — mismo riesgo declarado para `memory-match` frente al contrato `EngineFactory`.
- **Veredicto**: (pendiente de decisión del usuario)

### `buscaminas` — BUSCAMINAS · `propuesto` · 2026-08-12

- **Categoría / color**: PUZZLE / cyan (reutilizado de Asteroides, categorías distintas).
- **Controles**: mouse — clic izquierdo revela celda, clic derecho marca bandera (o `F` con cursor de teclado como alternativa).
- **Puntaje**: +10 por celda segura revelada + bonus por tablero completo × dificultad; cumulativo, entero positivo y creciente.
- **Assets**: canvas puro, grilla con `fillRect`/`strokeRect` y `fillText` para conteos.
- **Complejidad de motor**: baja — revelado en cascada (flood fill) es la única pieza no trivial; sin física ni animación por frame.
- **Por qué encaja**: control por mouse (variedad real); puntaje cumulativo sin decrecer; profundiza PUZZLE con lógica deductiva pura.
- **Riesgo**: el candidato con menor encaje en `EngineFactory` de todo el catálogo — prácticamente no necesita `requestAnimationFrame`; rompe la convención de teclado dominante.
- **Veredicto**: (pendiente de decisión del usuario)

### `apaga-luces` — APAGA LAS LUCES (Lights Out) · `propuesto` · 2026-08-12

- **Categoría / color**: PUZZLE / magenta (reutilizado de Arkanoid, categorías distintas).
- **Controles**: teclado — cursor con flechas + `Espacio`/`Enter` para alternar celda y vecinas ortogonales; mantiene el patrón 100% teclado del catálogo.
- **Puntaje**: +100×tamaño de grilla por tablero resuelto + bonus de eficiencia (nunca resta); entero positivo y creciente.
- **Assets**: canvas puro, celdas con dos estados de color.
- **Complejidad de motor**: baja — la más simple del bloque puzzle; matriz booleana + toggle con propagación a vecinos.
- **Por qué encaja**: puntaje no artificial; mantiene convención de teclado; mecánica de "toggle en cadena" distinta a las demás propuestas puzzle.
- **Riesgo**: mismo riesgo de motor subutilizado que 2048/Buscaminas; diseñar tableros "justos" sin generador automático es no trivial (matemática GF(2) detrás).
- **Veredicto**: (pendiente de decisión del usuario)

### `sokoban` — SOKOBAN · `propuesto` · 2026-08-12

- **Categoría / color**: PUZZLE / green (comparte patrón de movimiento discreto en grilla con Snake).
- **Controles**: flechas para mover personaje que empuja cajas sobre casillas objetivo; `R` para reiniciar nivel.
- **Puntaje**: +200×nivel por nivel completado + bonus de eficiencia (nunca resta); cumulativo, entero positivo y creciente.
- **Assets**: canvas puro, `fillRect` por tipo de celda.
- **Complejidad de motor**: media — la más alta del bloque puzzle: requiere mapas de nivel predefinidos, colisión al empujar, detección de victoria y progresión.
- **Por qué encaja**: reutiliza patrón de movimiento en grilla de Snake (motor de bajo riesgo técnico); es el puzzle "espacial" del bloque, distinto de los lógico-numéricos.
- **Riesgo**: el costo real es de contenido, no de motor — diseñar niveles resolubles y progresivos es trabajo manual (sin generador aleatorio como los demás puzzles).
- **Veredicto**: (pendiente de decisión del usuario)

### `match-3` — GEMAS · `propuesto` · 2026-08-12

- **Categoría / color**: PUZZLE / cyan (puede coincidir con Buscaminas si ambos se aceptan).
- **Controles**: mouse (clic y arrastre, o clic en dos celdas adyacentes) para intercambiar gemas; alternativa de teclado posible.
- **Puntaje**: +10 por gema eliminada con multiplicador de combo por cascadas; entero creciente natural, patrón "puntos por evento" igual a Arkanoid/Snake.
- **Assets**: canvas puro, gemas como formas geométricas de color.
- **Complejidad de motor**: media — el que **mejor** encaja con `EngineFactory` del bloque puzzle: caída de gemas y cascadas se benefician de un loop RAF genuino (análogo a la gravedad/refill de Tetris).
- **Por qué encaja**: menor distancia al patrón de motor ya probado (Tetris); puntaje con combos da profundidad sin artificios; mecánica de "eliminar por agrupación" distinta a las demás propuestas puzzle.
- **Riesgo**: control natural por mouse rompe la convención de teclado del catálogo si no se ofrece alternativa; posible solape conceptual con `pop-burbujas`.
- **Veredicto**: (pendiente de decisión del usuario)

### `invasores` — INVASORES (Space Invaders) · `propuesto` · 2026-08-12

- **Categoría / color**: SHOOTER / cyan (mismo tono que Asteroides, se diferencia por cover art).
- **Controles**: flechas izquierda/derecha + `Espacio` disparar.
- **Puntaje**: puntos por invasor destruido (filas traseras valen más) + bonus por oleada, entero creciente natural.
- **Assets**: canvas puro, formas rectangulares con `fillRect`.
- **Complejidad de motor**: media — formación de enemigos en bloque, descenso al tocar borde, disparo enemigo aleatorio, velocidad creciente.
- **Por qué encaja**: motor cabe 1:1 en `EngineFactory`; shooter clásico con mecánica distinta a Asteroides (oleadas fijas vs. campo abierto).
- **Riesgo**: 2do SHOOTER — no suma diversidad de categoría (VERSUS sigue en 0); riesgo de sentirse redundante frente a Asteroides si el arte no se diferencia.
- **Veredicto**: (pendiente de decisión del usuario)

### `galaxia` — GALAXIA (Galaga) · `propuesto` · 2026-08-12

- **Categoría / color**: SHOOTER / magenta (dentro de SHOOTER queda libre, distingue de `invasores`/Asteroides).
- **Controles**: flechas izquierda/derecha + `Espacio` disparar.
- **Puntaje**: puntos por enemigo destruido con multiplicador por abatir en formación de picada; entero creciente natural.
- **Assets**: canvas puro, formas geométricas simples.
- **Complejidad de motor**: media-alta — enemigos con trayectorias curvas individuales (picada, regreso a formación), más estado por entidad que `invasores`.
- **Por qué encaja**: mecánica de shooter distinta (trayectorias vs. formación fija); reutiliza mismo patrón de callbacks y loop.
- **Riesgo**: mayor complejidad que `invasores`; redundante si se eligen ambos — es alternativa, no suma.
- **Veredicto**: (pendiente de decisión del usuario)

### `hockey-aereo` — AIR HOCKEY · `propuesto` · 2026-08-12

- **Categoría / color**: VERSUS / green (dentro de VERSUS queda libre). **Nota de coste**: igual que `pong`, `VERSUS` no está en `CATS` — agregarlo es cambio explícito en `lib/games.ts`.
- **Controles**: flechas/`WASD` mueven el mazo en 2D dentro de su mitad de mesa; mazo rival con IA que persigue el disco con error/delay simulado.
- **Puntaje**: goles anotados antes de perder por diferencia de 5, o puntos por gol a tiempo fijo — mismo tipo de mapeo declarado que `pong`.
- **Assets**: canvas puro (mesa, disco circular, mazos).
- **Complejidad de motor**: media — colisión disco-mazo/paredes es rebote elástico, extensión directa de la física ya resuelta en Arkanoid; la IA del mazo es lo único nuevo.
- **Por qué encaja**: segunda opción real para llenar `VERSUS` con mecánica distinta a `pong` (mazo libre en 2D, disco rebota en 4 paredes vs. paleta 1D de Pong).
- **Riesgo**: mismo riesgo de mapeo de puntaje que `pong`; compite directamente por el mismo hueco de categoría — solo uno de los dos debería implementarse primero.
- **Veredicto**: (pendiente de decisión del usuario)

### `comando-misiles` — COMANDO DE MISILES (Missile Command) · `propuesto` · 2026-08-12

- **Categoría / color**: SHOOTER / yellow (dentro de SHOOTER queda libre, distingue de `invasores`/`galaxia`).
- **Controles**: flechas mueven una mira/cruceta, `Espacio` dispara interceptor hacia la mira (evita mouse para consistencia con teclado).
- **Puntaje**: +25 por misil interceptado + bonus por ciudades sobrevivientes por oleada; entero creciente natural.
- **Assets**: canvas puro (trazas con `stroke`, explosiones con `arc`, ciudades como rectángulos).
- **Complejidad de motor**: media — proyectiles con trayectorias rectas, colisión por radio de explosión, oleadas crecientes; sin rebote, más simple que Arkanoid en ese sentido.
- **Por qué encaja**: 3er sabor de SHOOTER con identidad distinta (defensa de objetivos fijos vs. combate directo); puntaje limpio sin mapeo.
- **Riesgo**: mover la mira con flechas puede sentirse menos preciso que mouse; 3er SHOOTER agrava el desbalance de categorías si se elige junto a `invasores`/`galaxia`.
- **Veredicto**: (pendiente de decisión del usuario)

### `duelo-pixel` — DUELO PÍXEL (fighting 1 vs IA) · `propuesto` · 2026-08-12

- **Categoría / color**: VERSUS / magenta (coincide de color con `pong`; mismo coste de tocar `CATS`).
- **Controles**: flechas para desplazarse, tecla de golpe y tecla de bloqueo; IA rival con máquina de estados simple (acercarse/golpear/bloquear).
- **Puntaje**: golpes conectados acumulados (+50 golpe limpio, +20 combo sin recibir daño) — mapeo más artificial que `pong`/`hockey-aereo` porque el resultado natural del género es binario (ganar/perder round).
- **Assets**: canvas puro, formas simples con animación de color/tamaño para golpe y bloqueo.
- **Complejidad de motor**: alta — máquina de estados por actor (idle/mover/golpear/bloquear/recibir daño/KO) con ventanas de hitbox por frame + IA de reacción; el más alejado del patrón "loop físico simple" del resto del catálogo.
- **Por qué encaja**: variante VERSUS más distinta en espíritu (combate cuerpo a cuerpo, no proyectiles ni pelota).
- **Riesgo**: mayor riesgo de motor de todo el catálogo propuesto (sin precedente en el repo) + el mapeo de puntaje más artificial de los tres candidatos VERSUS.
- **Veredicto**: (pendiente de decisión del usuario)

### `turbo-circuito` — TURBO CIRCUITO · `propuesto` · 2026-08-12

- **Categoría / color**: ARCADE / cyan (Asteroides es SHOOTER cyan, sin choque de categoría).
- **Controles**: `↑`/`↓` acelerar-frenar, `←`/`→` dirigir un auto visto desde arriba en circuito con scroll vertical infinito, esquivando tráfico rival.
- **Puntaje**: distancia recorrida × velocidad promedio (o vueltas completadas), entero creciente natural sin mapeo.
- **Assets**: canvas puro (rectángulos); opcionalmente sprite simple en `public/turbo-circuito/`.
- **Complejidad de motor**: media — colisiones AABB contra múltiples autos rivales generados proceduralmente + scroll infinito.
- **Por qué encaja**: introduce control direccional en 2 ejes ausente hoy en el catálogo; refuerza ARCADE con sensación distinta a Snake/Arkanoid.
- **Riesgo**: sería la 3ra entrada ARCADE (mismo riesgo de saturación que `pixel-runner`); balancear tráfico rival es el reto de diseño no resuelto.
- **Veredicto**: (pendiente de decisión del usuario)

### `compas` — COMPÁS (rítmico de un carril) · `propuesto` · 2026-08-12

- **Categoría / color**: ARCADE / yellow (Tetris es PUZZLE yellow, sin choque de categoría).
- **Controles**: una sola tecla (`Espacio`) presionada en el instante exacto en que un marcador cruza una línea objetivo.
- **Puntaje**: combo de aciertos consecutivos × precisión, entero creciente; combo se reinicia en fallo pero el puntaje acumulado nunca baja.
- **Assets**: canvas puro (barras/círculos); el "feel" completo pediría audio vía Web Audio API — scope a declarar aparte.
- **Complejidad de motor**: media — validar timing en ventanas de milisegundos contra un patrón predefinido, lógica distinta a la colisión continua de los otros motores.
- **Por qué encaja**: cubre un tipo de reflejo ausente en el catálogo (timing puro).
- **Riesgo**: sin audio real pierde la mitad de su atractivo, y con audio rompe la preferencia de canvas puro, abriendo scope de assets nuevo fuera del patrón actual.
- **Veredicto**: (pendiente de decisión del usuario)

### `bastion` — BASTIÓN (tower-defense simplificado) · `propuesto` · 2026-08-12

- **Categoría / color**: ARCADE / magenta (coincide de color **y** categoría con Arkanoid — doble coincidencia; no existe categoría de estrategia en `GameCategory`).
- **Controles**: mouse/click para colocar torretas junto a un camino; teclado opcional para pausar/acelerar oleada.
- **Puntaje**: enemigos eliminados × oleada alcanzada, entero creciente mientras la base no caiga a 0 vidas.
- **Assets**: canvas puro, formas geométricas por tipo de torreta/enemigo.
- **Complejidad de motor**: alta — pathfinding de enemigos, targeting de múltiples entidades simultáneas, economía simple y balance de oleadas; el salto de complejidad más grande del catálogo junto a `duelo-pixel`.
- **Por qué encaja**: primera mecánica de gestión/estrategia del catálogo (frente a reflejos puros de los 4 actuales).
- **Riesgo**: el propio criterio de "complejidad de motor" del Paso 3 la pone en riesgo de rechazo directo; duplica color+categoría con Arkanoid.
- **Veredicto**: (pendiente de decisión del usuario)

### `pop-burbujas` — POP BURBUJAS (bubble shooter) · `propuesto` · 2026-08-12

- **Categoría / color**: PUZZLE / green (Snake es ARCADE green, sin choque de categoría).
- **Controles**: teclado (`←`/`→` apuntar, `Espacio` disparar) o mouse, disparando burbujas de color hacia una grilla superior; se eliminan grupos de 3+.
- **Puntaje**: burbujas eliminadas por disparo × combo de reacción en cadena, entero creciente natural sin mapeo.
- **Assets**: canvas puro (círculos de color).
- **Complejidad de motor**: media — grilla hexagonal/offset, detección de grupos conectados (flood fill), trayectoria/rebote del disparo.
- **Por qué encaja**: segunda mecánica PUZZLE claramente distinta a Tetris; introduce control de apuntado ausente en el catálogo.
- **Riesgo**: flood fill de grupos conectados no trivial; posible solape conceptual con `match-3`.
- **Veredicto**: (pendiente de decisión del usuario)

### `secuencia` — SECUENCIA (Simon Says) · `propuesto` · 2026-08-12

- **Categoría / color**: PUZZLE / cyan (sería la 3ra entrada PUZZLE si además se acepta `memory-match`).
- **Controles**: mouse/click (o teclado con flechas mapeadas) sobre 4 cuadrantes de color que repiten, en orden, una secuencia creciente.
- **Puntaje**: longitud de la secuencia repetida correctamente × 100, entero creciente natural; termina en el primer error.
- **Assets**: canvas puro, 4 cuadrantes de color con resaltado por frame.
- **Complejidad de motor**: baja — máquina de estados (mostrar → esperar input → validar), comparable en simplicidad a `memory-match`.
- **Por qué encaja**: mecánica de memoria/secuencia distinta a `memory-match` (orden explícito vs. cartas ocultas) y a Tetris (espacial); motor de menor riesgo del bloque.
- **Riesgo**: motor casi no usa el loop RAF intensivo (igual que `memory-match`); saturaría PUZZLE con 3 entradas si convive con `memory-match`.
- **Veredicto**: (pendiente de decisión del usuario)

## Recomendación consolidada (23 candidatos evaluados)

Tras sumar los 20 candidatos nuevos a los 3 ya registrados, la recomendación
principal se mantiene: **`pong`**. Es el único hueco de categoría explícito
(`VERSUS` existe en el tipo pero no en `CATS`, hoy en 0 mientras ARCADE tiene
2-3 candidatos compitiendo por el mismo espacio) y, de los tres candidatos
VERSUS (`pong`, `hockey-aereo`, `duelo-pixel`), es el de menor riesgo de motor
porque reutiliza casi 1:1 la física de colisiones ya resuelta en
`lib/games/arkanoid/engine.ts` — a diferencia de `duelo-pixel` (máquina de
estados de combate + hitboxes, complejidad alta, sin precedente en el repo).

**Alternativas de menor riesgo si se prefiere no tocar `CATS` todavía**:
`saltarin` (Flappy Bird) y `dos-mil-cuarenta-y-ocho` (2048) son los
candidatos de menor complejidad de motor y puntaje más limpio de sus
respectivos bloques (ARCADE y PUZZLE), aunque ninguno diversifica categoría.

**Candidatos a evitar por ahora** (no rechazados formalmente, pero con
riesgo alto declarado por su propia ficha): `laberinto`, `bastion` y
`duelo-pixel` — los tres exceden la complejidad de motor que el contrato
`EngineFactory` fue pensado para resolver con bajo riesgo.

Siguiente paso: `/spec-juego Pong contra IA con paleta y puntaje por rallies
consecutivos`.
