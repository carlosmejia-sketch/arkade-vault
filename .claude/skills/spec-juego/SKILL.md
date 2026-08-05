---
name: spec-juego
description: Diseña el spec para agregar un juego real jugable con leaderboard Supabase a Arcade Vault. Porta un juego de references/started-games/ o define uno nuevo desde cero. Genera specs/NN-juego-<slug>.md en Borrador para implementar luego con /spec-impl.
disable-model-invocation: true
argument-hint: "<carpeta-de-references/started-games | descripción del juego>"
allowed-tools: Bash(ls:*), Bash(cat:*), Bash(git status:*)
---

# /spec-juego — Diseñador de specs para juegos reales con leaderboard

## Contexto de sesión

Specs existentes:
!`ls specs/`

Juegos de referencia disponibles para portar:
!`ls references/started-games/ 2>/dev/null || echo "references/started-games/ no existe"`

Motores ya portados:
!`ls lib/games/ 2>/dev/null || echo "lib/games/ no existe todavía"`

---

Esta skill ayuda a producir un spec para agregar un juego **jugable de verdad** (motor propio,
no el mock simulado) con leaderboard real en Supabase, siguiendo el mismo patrón que
`specs/05-juego-asteroides.md` y `specs/06-leaderboard-asteroides-supabase.md`. **Aquí no se
escribe código.** El resultado es un archivo `specs/NN-juego-<slug>.md` en estado `Borrador`
que luego se implementa con `/spec-impl`.

## Filosofía

Portar Asteroides tocó 7 sitios del código (catálogo, CSS, motor, reproductor, leaderboard de
detalle, Salón de la Fama, y el spec mismo). Ese mapa ya está resuelto — no hay que
re-explorarlo cada vez. Lo que sí cambia por juego es la mecánica, los controles, si hay
vidas/niveles reales, y si trae assets (sprites/audio). Esta skill combina lo fijo (el mapa) con
lo que hay que decidir (las preguntas de la Fase 2).

Lee `references/mapa-integracion.md` (en el mismo directorio que esta skill) para el detalle
exacto de archivos y líneas a tocar, y `references/plantilla-spec-juego.md` para la estructura
del spec a producir. Apóyate en ambos en cada fase.

## Flujo

Sigue las fases en orden. **No te saltes fases.** Todas tus respuestas van en español (el
proyecto es 100% español, ver `CLAUDE.md`).

### Fase 1 — Contexto

1. Lee `CLAUDE.md`/`AGENTS.md` si no los tienes ya en contexto.
2. Lee `references/mapa-integracion.md` (junto a esta skill) — es la fuente de verdad de qué
   archivos tocar y cuáles no.
3. Lee `lib/games.ts` completo para conocer el catálogo actual, los campos de `Game` y `CATS`.
4. Lee `specs/05-juego-asteroides.md` y `specs/06-leaderboard-asteroides-supabase.md` como
   referencia de formato y de decisiones ya tomadas (para no reabrirlas sin motivo).
5. Determina el siguiente número secuencial de spec mirando `specs/` (contexto de sesión
   arriba). El nombre de archivo será `specs/NN-juego-<slug>.md`.

### Fase 1b — ¿La plataforma ya está generalizada?

Revisa `lib/games.ts` (tipo `Game`) y si existe `lib/games/registry.ts` o similar.

- **Si NO hay flag de motor real / registry todavía** (caso normal si este es el segundo
  juego real, después de Asteroides): el spec que generes debe incluir el **Paso 0 — Refactor
  de generalización** descrito en `references/mapa-integracion.md`, sección "Refactor de
  generalización". Explícaselo al usuario: hace falta una vez, deja de hacer falta para el
  tercer juego en adelante.
- **Si ya existe** (algún spec anterior ya lo implementó): omite ese paso y dilo explícitamente
  ("la plataforma ya está generalizada, no hace falta el refactor").

No asumas — si tienes dudas de si ya está generalizado, pregunta al usuario en la Fase 2.

### Fase 2 — Preguntas en bloques de 3 a 5

Pregunta en bloques, espera respuesta antes de continuar con el siguiente bloque. No asumas
nada que no esté confirmado.

**Bloque — Origen del juego:**

1. ¿Viene de una carpeta de `references/started-games/` (¿cuál?) o se define desde cero?
   - Si es una carpeta existente: lee su `game.js`, `index.html`, `CLAUDE.md` y `README.md`;
     resume mecánica, controles, dimensiones de canvas, y si usa `style.css` propio o assets
     (sprites/audio) — compáralo con lo que dice `references/mapa-integracion.md` sobre "Assets
     fuera del patrón actual".
   - Si es desde cero: pide una descripción de la mecánica, controles y condición de fin de
     partida/game over.
2. ¿El juego usa sprites o audio? Si sí, eso es alcance adicional explícito (destino
   `public/<slug>/...`), no asumir que es tan simple como Asteroides (que es canvas puro).

**Bloque — Catálogo:**

3. ¿Entrada nueva en `GAMES` o reemplazar un mock existente (p. ej. reusar `id: "caida"` para
   Tetris)? Si es reemplazo, advertir: cambiar el `id` desplaza el seed de `seededScores`
   (depende de `id.length`), y solo aplica si el usuario confirma que quiere descartar ese mock.
4. Campos del `Game`: `title`, `short`, `long`, `cat` (¿alcanza con `ARCADE | PUZZLE | SHOOTER |
VERSUS` o hay que agregar categoría a `CATS`?), `color`, nombre de la clase `cover`.

**Bloque — Motor y HUD:**

5. Canvas: ¿800×600 como Asteroides, o necesita otro tamaño? (si es otro tamaño, hay que
   generalizar `.asteroides-canvas` en `app/globals.css`, no solo copiarla).
6. El contrato de callbacks actual es `onScore`/`onLives`/`onLevel`/`onGameOver`. ¿El juego
   tiene vidas y niveles literales, o hace falta mapear otra cosa (p. ej. líneas completadas en
   Tetris en vez de "nivel", o sin concepto de "vidas")? Decidir el mapeo aquí, explícito.
7. ¿Reinicio solo vía modal (como Asteroides) o el juego necesita otro flujo de reinicio?

**Bloque — Leaderboard y alcance:**

8. Confirmar: no hace falta migración Supabase (`game_id` es `text` libre, las policies ya son
   públicas) — el spec solo debe declarar qué `game_id` va a escribir/leer.
9. Fuera de alcance por defecto (igual que specs 05/06): táctil, autenticación real, rate
   limiting/CAPTCHA, Realtime, borrado/edición de puntajes. ¿Alguno de estos SÍ debería entrar
   para este juego en particular?
10. Si hubo Fase 1b con refactor pendiente: confirmar con el usuario el nombre del flag/registry
    antes de escribirlo en el spec.

**Cuándo dejar de preguntar:** cuando puedas responder sin asumir: qué archivos van a
aparecer/cambiar, cuál es el primer y el último paso ejecutable, y cómo se verifica que el
juego quedó terminado.

### Fase 3 — Redactar sección por sección

No generes el spec completo de una vez. Sigue el orden y la plantilla de
`references/plantilla-spec-juego.md`:

1. **Header** (Estado: Borrador / Depende de / Fecha / Objetivo en una frase).
2. **Alcance** (Dentro numerado, incluyendo el Paso 0 de refactor solo si aplica / Fuera de
   alcance explícito).
3. **Modelo de datos** (tipos del motor; recordar que no hay tabla nueva de Supabase).
4. **Plan de implementación** (pasos numerados, cada uno deja el proyecto compilando).
5. **Criterios de aceptación** (checklist verificable, agrupado por área).
6. **Decisiones tomadas y descartadas** (formato **Sí:** / **No:**, con justificación).
7. **Riesgos identificados** (tabla; incluir la deuda conocida de
   `references/mapa-integracion.md` si aplica al alcance).
8. **Qué no está en esta spec.**

Después de cada sección: muéstrala en markdown y pregunta "¿Esta sección queda así o querés
ajustar algo?". Solo avanza a la siguiente cuando el usuario confirme.

### Fase 4 — Guardar el spec

1. Confirma con el usuario el slug final del archivo antes de escribirlo.
2. Crea `specs/NN-juego-<slug>.md` con todas las secciones aprobadas, estado `Borrador`.
3. Confirma al usuario:
   - Ruta del archivo creado.
   - Recordatorio: está en `Borrador`; cambiarlo a `Aprobado` una vez releído.
   - Próximo paso: correr `/spec-impl NN-juego-<slug>` para implementarlo.
4. **Detente ahí.** No propongas implementar, no escribas código, no toques `lib/games.ts` ni
   ningún otro archivo de la app.

## Reglas duras

- **Nunca escribas código.** Solo el archivo `.md` del spec, al final.
- **Nunca marques el spec como `Aprobado`.** Eso lo decide el usuario.
- **Nunca asumas `id`, nombres de archivo o slugs sin confirmar.**
- **Nunca omitas la sección de decisiones** ni la de riesgos si hay deuda conocida aplicable.
- **Nunca generes el spec completo en una sola respuesta.** Sección por sección, con
  confirmación.
- **Si el juego trae assets (sprites/audio) que el pipeline actual no cubre**, decláralo
  explícito en el alcance — no asumas que es "igual de simple que Asteroides".
- **Si detectas que el refactor de generalización ya existe**, no lo vuelvas a proponer.

## Tono al preguntar

Directo y concreto, igual que `/spec`. No te disculpes por preguntar. Usa preguntas concretas,
numeradas, en bloques de 3 a 5.
