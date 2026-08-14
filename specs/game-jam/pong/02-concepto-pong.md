# CONCEPTO — PONG

> **Estado:** Borrador
> **Tema del jam:** (juego provisto directamente, sin jam asociado)
> **Spec técnico:** `01-juego-pong.md`

## Pitch

Un Pong de un jugador contra una IA imperfecta: paletas verticales a ambos lados de la mesa, una pelota que acelera con cada rally. Cada rebote tuyo suma puntos; cada bola que se te escapa te cuesta una vida. Tres vidas, dificultad creciente, y una sola pregunta: ¿cuántos puntos aguantas antes de que la mesa te gane?

## Encaje con el tema

Juego provisto directamente por el usuario, sin tema de jam asociado — la mecánica ya viene decidida (Pong contra IA). El único encaje relevante es de catálogo: Pong llena el hueco de la categoría `VERSUS`, hoy vacía en `CATS` pese a existir en el tipo `GameCategory`, dando al Vault su primer juego de enfrentamiento directo contra un rival (aunque sea IA) frente a los 4 actuales de reflejos en solitario.

## Mecánica core

- El jugador mueve una paleta vertical en su lado del canvas (izquierda); la IA mueve la paleta del lado opuesto (derecha).
- La pelota rebota en los bordes superior e inferior y en ambas paletas. El ángulo de salida al golpear una paleta depende de en qué punto de la paleta impactó (centro = rebote recto, extremos = ángulo más cerrado), igual que el modelo ya resuelto en Arkanoid.
- Si la pelota pasa de largo por el lado del jugador (no llegó a devolverla), el jugador pierde 1 vida y la pelota se reinicia al centro con velocidad base.
- Si la pelota pasa de largo por el lado de la IA, el jugador anota un bono grande y sube de nivel; la pelota se reinicia al centro con velocidad ligeramente mayor.
- La IA sigue la posición vertical de la pelota con velocidad máxima limitada y un pequeño margen de error/retardo aleatorio — es vencible, no una pared perfecta.
- La partida termina cuando las vidas llegan a 0.

## Progresión y dificultad

- Cada rebote válido del jugador acelera ligeramente la pelota (`speedMultiplier` sube un poco por golpe, con techo).
- Cada vez que el jugador acumula un umbral de puntos (p. ej. cada 200 puntos) o anota contra la IA, sube el `level`: la velocidad base de la pelota y el límite de velocidad de la paleta IA suben un escalón, alimentando `onLevel` del motor.
- El margen de error de la IA se reduce levemente con el nivel (más precisa, pero nunca perfecta) para mantener la partida vencible en niveles altos sin volverse trivial.

## Sistema de puntaje

- +10 por cada rebote válido de la paleta del jugador (con posible combo si se encadenan varios rebotes sin perder vida, a definir en implementación dentro del rango de +10 a +30 por golpe).
- +50 cada vez que la pelota se le escapa a la IA (el jugador "anota").
- Rango esperado de una partida típica: entre unos pocos cientos (partida corta, jugador principiante) y varios miles de puntos (partida larga con muchos rallies), siempre entero positivo y muy por debajo del límite de 10.000.000 del `CHECK` de `scores`.

## Controles

- `W` / `S` o `↑` / `↓` — mover la paleta del jugador hacia arriba/abajo.
- Sin controles de mouse (a diferencia de Arkanoid, no aporta nada distinto aquí — la paleta solo se mueve en un eje).

## Dirección visual

- Fondo oscuro consistente con el resto del catálogo, tinte `--magenta` como color de acento (botón JUGAR, detalles de HUD).
- Mesa: línea central punteada vertical (patrón clásico de Pong) usando `--pixel`/`--mono` para cualquier texto de marcador dentro del canvas si aplica.
- Paletas como rectángulos sólidos (blanco/gris claro o tinte `--magenta` la del jugador, tono neutro la de la IA); pelota como círculo blanco/`--ink` sólido.
- `.cover-pong`: fondo `radial-gradient` oscuro con tinte magenta (siguiendo el patrón de `.cover-arkanoid`), `::after` con una franja vertical punteada (`linear-gradient` repetido) simulando la red de Pong, `::before` con un glifo `●` (pelota) o `▮ ▮` (paletas) centrado.

## Assets

Ninguno, canvas puro — coincide exactamente con lo declarado en `01-juego-pong.md`.

## Referencias

Pong (Atari, 1972) como referencia directa de mecánica; sistema de puntaje por evento + vidas tomado del patrón ya resuelto en el motor de Arkanoid del propio Vault (`lib/games/arkanoid/engine.ts`).
