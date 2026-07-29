# SPEC 01 — Maqueta visual del MVP

> **Estado:** Aprobado
> **Depende de:** ninguna (primera spec del proyecto)
> **Fecha:** 2026-07-28
> **Objetivo:** Portar las seis pantallas del template de `references/templates/` a rutas de App Router con datos simulados, sin lógica de juego ni backend.

Las seis pantallas: Biblioteca (`/`), Detalle (`/juegos/[id]`), Reproductor (`/juegos/[id]/jugar`), Acceso (`/acceso`), Salón de la Fama (`/salon`), más el chrome compartido (Nav + panel móvil + Footer) en el layout.

---

## Alcance

**Dentro:**

1. **Chrome compartido en `app/layout.tsx`**: `Nav` (logo, enlaces con estado activo por ruta, contador de créditos estático, botón de sesión, hamburguesa) + panel lateral móvil con backdrop + `Footer` (`© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0`).
2. **Biblioteca (`/`)**: hero con `.flicker` + cursor `.blink`, buscador por nombre, chips de categoría (`TODOS`, `ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS`), grid de 8 tarjetas con tilt 3D al pasar el mouse y estado vacío "NO HAY RESULTADOS".
3. **Detalle (`/juegos/[id]`)**: portada grande, etiquetas, descripción larga, franja de estadísticas (partidas / mejor global / dificultad), botones JUGAR AHORA y VOLVER AL VAULT, y leaderboard lateral de 10 filas con top-1/2/3 destacados.
4. **Reproductor (`/juegos/[id]/jugar`)**: HUD (jugador, puntuación, vidas, nivel), marco CRT con arena animada por CSS (grid-floor, 3 enemigos, nave), overlay EN PAUSA, barra inferior de estado, y modal FIN DEL JUEGO con captura de iniciales, guardado y acciones. Puntuación simulada por temporizador.
5. **Acceso (`/acceso`)**: tarjeta con tabs INICIAR SESIÓN / CREAR CUENTA (el campo correo aparece con `.slide-in` solo en registro), botón principal, JUGAR COMO INVITADO, divisor y botones sociales inertes (Google / GitHub).
6. **Salón de la Fama (`/salon`)**: cabecera, tabs por juego, podio de 3 puestos (oro centrado), tabla de 12 filas con entrada escalonada y — si hay sesión — la fila destacada "TU MEJOR MARCA".
7. **Sesión simulada**: contexto de cliente sobre `localStorage` (`av_user`), consumido por Nav, Reproductor y Salón. Puntuaciones guardadas en `localStorage` (`av_scores`) sin lectura posterior, igual que el template.
8. **Datos mock tipados** en `lib/`: `GAMES`, `CATS` y el generador determinista `seededScores()`.

**Fuera de alcance (para specs futuras):**

- Lógica de juego real (canvas, bucle, controles, colisiones). La arena del CRT es decorativa.
- Autenticación real: no hay validación, contraseñas, sesión de servidor, OAuth ni protección de rutas. El formulario acepta cualquier entrada y los botones sociales no hacen nada.
- Base de datos, API routes y puntuaciones persistidas en servidor. Los rankings son generados.
- Pruebas automatizadas y runner de pruebas.
- Pantallas que el template no tiene: perfil, ajustes, registro con verificación, página 404 propia. Un `id` de juego inexistente usa `notFound()` con la pantalla 404 por defecto de Next.
- Modificar `app/globals.css`, salvo que falte una clase que el template ya usaba.
- Cambios en la paleta, tipografías o tokens de diseño.

El `app/page.tsx` actual (hero con botones "VER BIBLIOTECA" / "SALÓN DE LA FAMA") se reemplaza por la Biblioteca del template, que trae su propio hero sin esos botones.

---

## Modelo de datos

No hay base de datos. Todo es mock en memoria más dos claves de `localStorage`.

### `lib/games.ts`

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export type Game = {
  id: string;          // slug de la ruta: "bloque-buster", "caida", …
  title: string;       // "BLOQUE BUSTER"
  short: string;       // frase para la tarjeta
  long: string;        // párrafo para el detalle
  cat: GameCategory;
  cover: string;       // clase CSS de globals.css: "cover-bricks", "cover-tetro", …
  color: GameColor;    // tinte del botón JUGAR
  best: number;        // mejor puntuación global
  plays: string;       // ya formateado: "12.4K"
};

export const GAMES: Game[];                 // los 8 juegos, contenido idéntico a data.jsx
export const CATS: readonly string[];       // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function getGame(id: string): Game | undefined;
```

Los 8 `id`: `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`. Textos, categorías, portadas, colores, `best` y `plays` se copian literalmente de `references/templates/data.jsx` — no se reescriben ni se traducen.

`plays` se queda como string (`"12.4K"`), igual que el template, para no inventar reglas de formateo.

### `lib/scores.ts`

```ts
export type ScoreRow = {
  rank: number;
  name: string;    // "PX_KAI"
  score: number;
  date: string;    // "07/03/2026" — formato dd/mm/yyyy ya renderizado
};

export const PLAYERS: readonly string[];              // los 18 alias del template
export function seededScores(seed: number, count?: number): ScoreRow[];
```

`seededScores` es el LCG determinista del template (`s = (s * 9301 + 49297) % 233280`) — sin `Math.random()` ni `Date`, así que se puede llamar desde componentes de servidor sin riesgo de desajuste de hidratación. Las semillas se conservan exactas para que los rankings se vean igual que en el template:

- Detalle: `seededScores(id.length * 17 + 3, 10)`
- Salón: `seededScores(tabId.length * 23 + 7, 12)`

### `lib/session.tsx` — sesión simulada

```ts
export type SessionUser = { name: string };   // "PX_KAI", máx. 10 caracteres, mayúsculas

export type SavedScore = { game: string; score: number; name: string; at: number };
```

Claves de `localStorage`:

| Clave       | Contenido             | Se lee                                          |
| ----------- | --------------------- | ----------------------------------------------- |
| `av_user`   | `SessionUser \| null` | al montar el proveedor                          |
| `av_scores` | `SavedScore[]`        | nunca — solo se escribe (igual que el template)  |

Sin versionado de esquema: si el JSON está corrupto se descarta y se trata como sin sesión, tal como hace el `try/catch` de `app.jsx`.

---

## Plan de implementación

Cada paso deja el proyecto compilando y navegable. Antes de escribir código, leer los documentos de Next indicados en cada paso desde `node_modules/next/dist/docs/01-app/`.

### Paso 1 — Datos mock tipados

Crear `lib/games.ts` y `lib/scores.ts` con las estructuras de la sección anterior, copiando el contenido literal de `references/templates/data.jsx`. Sin cambios visuales todavía; `npx tsc --noEmit` debe pasar.

### Paso 2 — Sesión simulada

Crear `lib/session.tsx` con `SessionProvider` (`"use client"`) y el hook `useSession()`, que expone `{ user, signIn, signOut, saveScore }`. Lee `av_user` en un `useEffect` al montar — nunca durante el render — para no romper la hidratación. Envolver `{children}` del layout con el proveedor.

Leer: `01-getting-started/05-server-and-client-components.md`.

### Paso 3 — Chrome compartido: Nav y Footer

- `components/nav.tsx` (`"use client"`): estado activo con `usePathname()` — `/` y `/juegos/*` activan "Biblioteca", `/salon` activa "Salón de la Fama". Enlaces con `<Link>`; el panel móvil se cierra al navegar. Botón de sesión: `<Link className="btn" href="/acceso">Iniciar Sesión</Link>` sin sesión, o `<button className="btn ghost">{user.name} ▾</button>` que llama `signOut()` con sesión.
- `components/footer.tsx`: componente de servidor, marcado estático.
- `app/layout.tsx`: monta `<Nav />`, `{children}`, `<Footer />` dentro de `.av-root`. El estilo inline del footer de `app.jsx` pasa a la clase `.av-footer` en `globals.css` (única adición permitida al CSS).

Leer: `03-api-reference/04-functions/use-pathname.md`, `03-api-reference/02-components/link.md`.

### Paso 4 — Biblioteca en `/`

- `app/page.tsx`: componente de servidor. Renderiza el hero (`.av-hero`, `.flicker`, `.blink`) y delega la parte interactiva a una isla de cliente. Reemplaza el contenido actual del archivo.
- `components/library.tsx` (`"use client"`): importa `GAMES` y `CATS` directamente, mantiene el estado de búsqueda y categoría con `useState` + `useMemo`, renderiza `.av-filters` y `.av-grid`, incluido el estado vacío.
- `components/game-card.tsx` (`"use client"`): tilt 3D con `useRef` + `onMouseMove`/`onMouseLeave` igual que el template. La tarjeta navega con `useRouter().push()`; el título va dentro de un `<Link>` para que exista un ancla real accesible, y el botón JUGAR usa `stopPropagation()` antes de navegar.

Leer: `03-api-reference/04-functions/use-router.md`.

### Paso 5 — Detalle en `/juegos/[id]`

- `app/juegos/[id]/page.tsx`: componente de servidor `async`; `const { id } = await params` (**`params` es una Promise en Next 16**), `getGame(id)` y `notFound()` si no existe. Exporta `generateStaticParams()` derivado de `GAMES` para prerenderizar las 8 rutas.
- `components/leaderboard.tsx`: componente de servidor que recibe `ScoreRow[]` y pinta `.leaderboard` con los destacados `top1`/`top2`/`top3`. `seededScores` se ejecuta en el servidor.
- JUGAR AHORA es un `<Link className="btn xl pulse">` a `/juegos/{id}/jugar`; VOLVER AL VAULT apunta a `/`.

Leer: `01-getting-started/03-layouts-and-pages.md`, `03-api-reference/03-file-conventions/dynamic-routes.md`, `03-api-reference/04-functions/generate-static-params.md`, `03-api-reference/04-functions/not-found.md`.

### Paso 6 — Reproductor en `/juegos/[id]/jugar`

- `app/juegos/[id]/jugar/page.tsx`: servidor; resuelve `params`, valida el juego con `notFound()`, pasa el `Game` a la isla de cliente. Mismo `generateStaticParams()`.
- `components/game-player.tsx` (`"use client"`): estados `score`/`lives`/`level`/`paused`/`over`/`saved`, temporizador de puntuación (`setInterval` de 220 ms, limpiado en el `return` del efecto), subida de nivel, overlay de pausa, marco CRT con la arena decorativa, y modal de fin de juego con captura de iniciales (mayúsculas, 10 caracteres) que llama `saveScore()` del contexto. El nombre inicial es `user?.name ?? "INVITADO"`.

### Paso 7 — Acceso en `/acceso`

- `app/acceso/page.tsx`: servidor, envuelve el formulario.
- `components/auth-form.tsx` (`"use client"`): tabs, campos controlados, `onSubmit` con `preventDefault()` que llama `signIn({ name })` y redirige a `/` con `useRouter().push()`. JUGAR COMO INVITADO limpia la sesión y redirige. Botones sociales con `type="button"` y sin handler.

### Paso 8 — Salón de la Fama en `/salon`

- `app/salon/page.tsx`: servidor, cabecera estática.
- `components/hall-of-fame.tsx` (`"use client"`): tab por juego con `useState` (por defecto `GAMES[0].id`), `useMemo` sobre `seededScores`, podio, tabla con `animationDelay` escalonado y la fila "TU MEJOR MARCA" condicionada a `user`.

### Paso 9 — Verificación

Ejecutar `npm run lint`, `npx tsc --noEmit` y `npm run build`, y recorrer las cinco rutas con `npm run dev` comparando contra `references/templates/Arcade Vault.html` abierto en el navegador.

**Convención de nombres:** archivos y componentes en inglés, espejando los identificadores del template (`Nav`, `GameCard`, `Library`, `GameDetail`, `GamePlayer`, `Auth`, `HallOfFame`). Rutas y todo el texto visible, en español.

---

## Criterios de aceptación

### Rutas y compilación

- [ ] `npm run build` termina sin errores y prerenderiza `/`, `/acceso`, `/salon` y las 8 rutas de `/juegos/[id]` y `/juegos/[id]/jugar` vía `generateStaticParams`.
- [ ] `npx tsc --noEmit` y `npm run lint` pasan sin errores ni advertencias nuevas.
- [ ] `/juegos/no-existe` responde 404 (pantalla por defecto de Next), no una página en blanco ni un error.
- [ ] Ninguna advertencia de hidratación en la consola del navegador al cargar cada una de las 5 rutas.

### Chrome compartido

- [ ] Nav y Footer aparecen en las 5 rutas.
- [ ] Estando en `/` o en cualquier `/juegos/*`, el enlace "Biblioteca" tiene la clase `active`; estando en `/salon`, la tiene "Salón de la Fama".
- [ ] En viewport ≤ 860 px la hamburguesa abre el panel lateral con backdrop; tocar un enlace navega y cierra el panel.
- [ ] Sin sesión el Nav muestra "Iniciar Sesión" y enlaza a `/acceso`; con sesión muestra `{nombre} ▾` y al pulsarlo la sesión desaparece y vuelve "Iniciar Sesión".

### Biblioteca (`/`)

- [ ] Se renderizan las 8 tarjetas con portada, categoría, título, frase corta, mejor puntuación formateada en `es-ES` (p. ej. `28.450`) y botón JUGAR del color declarado en el juego.
- [ ] Escribir "cai" en el buscador deja solo CAÍDA; escribir "zzz" muestra "NO HAY RESULTADOS".
- [ ] El chip `PUZZLE` deja solo CAÍDA; `TODOS` restaura las 8. Buscador y chip se combinan (chip `ARCADE` + texto "glo" → solo GLOTÓN).
- [ ] Mover el mouse sobre una tarjeta la inclina siguiendo al cursor; al salir vuelve a su posición.
- [ ] Pulsar la tarjeta y pulsar JUGAR navegan a `/juegos/{id}`.

### Detalle (`/juegos/[id]`)

- [ ] Muestra portada grande, las 4 etiquetas, el párrafo largo del juego y la franja con partidas, mejor global en magenta y dificultad en amarillo.
- [ ] El leaderboard lateral tiene 10 filas ordenadas de mayor a menor puntuación, con rangos `#01`…`#10` y las 3 primeras destacadas con `top1`/`top2`/`top3`.
- [ ] JUGAR AHORA lleva a `/juegos/{id}/jugar`; VOLVER AL VAULT lleva a `/`.

### Reproductor (`/juegos/[id]/jugar`)

- [ ] El HUD muestra el nombre de sesión, o `INVITADO` si no hay sesión.
- [ ] La puntuación se incrementa sola de forma continua; PAUSA la detiene y muestra el overlay "EN PAUSA"; REANUDAR la reactiva.
- [ ] El nivel sube al menos una vez al dejar correr la simulación.
- [ ] La arena del CRT muestra la rejilla, los 3 enemigos animados y la nave. No hay juego jugable.
- [ ] FIN abre el modal con la puntuación final formateada; el campo de iniciales fuerza mayúsculas y corta a 10 caracteres; GUARDAR PUNTUACIÓN sustituye el campo por "▸ PUNTUACIÓN GUARDADA_" y escribe la entrada en `av_scores`.
- [ ] JUGAR DE NUEVO reinicia puntuación, vidas, nivel y cierra el modal; VOLVER AL VAULT lleva a `/`.
- [ ] SALIR lleva a `/juegos/{id}` y el temporizador se limpia (no quedan intervalos vivos).

### Acceso (`/acceso`)

- [ ] La tab CREAR CUENTA añade el campo de correo con la animación `slide-in`; INICIAR SESIÓN lo quita.
- [ ] Enviar el formulario con usuario `px_kai` crea la sesión `PX_KAI` y redirige a `/`, donde el Nav ya muestra el nombre.
- [ ] Enviar el formulario vacío crea la sesión `PLAYER1` y redirige igual.
- [ ] JUGAR COMO INVITADO redirige a `/` sin sesión.
- [ ] Los botones GOOGLE y GITHUB no navegan ni envían el formulario.

### Salón de la Fama (`/salon`)

- [ ] Hay una tab por cada uno de los 8 juegos; la activa lleva la clase `active` y por defecto es BLOQUE BUSTER.
- [ ] El podio muestra los puestos 02 / 01 / 03 en ese orden horizontal, con el oro centrado y elevado, y coincide con las 3 primeras filas de la tabla.
- [ ] La tabla tiene 12 filas con rango, jugador, puntuación y fecha, y entran de forma escalonada.
- [ ] Con sesión activa aparecen la etiqueta "▸ TU MEJOR MARCA EN {juego}" y la fila amarilla con tu nombre; sin sesión no aparecen.
- [ ] Cambiar de tab cambia los datos del podio y de la tabla.

### Fidelidad al template

- [ ] Recargar cualquier ruta reproduce exactamente los mismos rankings (generador determinista).
- [ ] Comparadas lado a lado con `references/templates/Arcade Vault.html`, las 5 pantallas coinciden en composición, colores, tipografías y animaciones.
- [ ] `app/globals.css` solo cambia por la adición de `.av-footer`.

---

## Decisiones tomadas y descartadas

### `/` es la Biblioteca

- **Sí:** la raíz renderiza la Biblioteca con su propio hero, reemplazando el hero-landing actual de `app/page.tsx`.
- **No:** conservar la landing y mover la Biblioteca a `/biblioteca`. Añadía un salto extra antes del contenido real y el template no tiene esa pantalla.

### Rutas de App Router en lugar de enrutado por hash

- **Sí:** cinco rutas reales de archivos, con `<Link>` y `useRouter()`.
- **No:** replicar el `location.hash` + `JSON.parse` de `app.jsx`. Habría convertido todo el sitio en una SPA sin prerenderizado, sin URLs compartibles y sin componentes de servidor.

### Sesión simulada sobre `localStorage`, leída en `useEffect`

- **Sí:** `SessionProvider` de cliente que lee `av_user` después de montar.
- **No:** leer `localStorage` durante el render (rompe la hidratación).
- **No:** cookies con componentes de servidor. Sería el camino correcto para auth real, pero esta spec excluye auth real y obligaría a route handlers fuera de alcance.

### Componentes de servidor por defecto, islas de cliente donde hay estado

- **Sí:** las 5 `page.tsx` son componentes de servidor; el estado vive en `library.tsx`, `game-card.tsx`, `game-player.tsx`, `auth-form.tsx`, `hall-of-fame.tsx` y `nav.tsx`.
- **No:** marcar cada página con `"use client"`. Más simple de portar, pero pierde el prerenderizado del hero, del detalle y del leaderboard, que son marcado estático.

### Semillas de ranking idénticas al template

- **Sí:** conservar `id.length * 17 + 3` y `tabId.length * 23 + 7`. Garantizan que la comparación visual con el HTML de referencia sea exacta y, al ser deterministas, se pueden ejecutar en el servidor.
- **No:** semillas nuevas o datos escritos a mano.

### `generateStaticParams` sobre los 8 juegos

- **Sí:** prerenderizar detalle y reproductor para los 8 `id` conocidos.
- **No:** dejarlas dinámicas. Con un catálogo fijo en un módulo no aporta nada y esconde errores de datos hasta el runtime.

### La arena del CRT se queda decorativa

- **Sí:** portar la animación CSS del template tal cual y simular la puntuación con un temporizador.
- **No:** un placeholder "PRÓXIMAMENTE". Dejaría la pantalla principal del producto sin evaluar visualmente.

### `av_scores` se escribe y nunca se lee

- **Sí:** replicar el comportamiento del template para que "GUARDAR PUNTUACIÓN" tenga efecto real.
- **No:** omitir la escritura (deja el botón mintiendo) ni alimentar los rankings con lo guardado (es lógica de producto de otra spec).

### `globals.css` es intocable salvo `.av-footer`

- **Sí:** el CSS ya portado es la fuente de estilo; solo se añade la clase del footer, que en el template vivía como estilo inline en `app.jsx`.
- **No:** conservar el estilo inline (duplica tokens en TSX) ni refactorizar el CSS a utilidades Tailwind (reescribe 950 líneas ya validadas sin ganancia visual).

### Tarjeta navegable con `<div>` + ancla en el título

- **Sí:** el `.card` conserva el `onClick` con `useRouter()` y el título se envuelve en `<Link>`, de modo que existe un ancla real navegable por teclado; el botón JUGAR corta la propagación.
- **No:** envolver toda la tarjeta en un `<Link>`. Dejaría el botón JUGAR anidado dentro de un ancla: marcado inválido y navegación por teclado rota.

### Nombres de archivo en inglés, rutas y UI en español

- **Sí:** `lib/games.ts`, `components/game-card.tsx`, etc., espejando los identificadores de componente del template (`GameCard`, `HallOfFame`).
- **No:** archivos en español espejando los nombres de archivo del template (`biblioteca.jsx`, `salon.jsx`). Decisión explícita del usuario durante esta spec.

---

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| **Desajuste de hidratación por la sesión.** `localStorage` no existe en el servidor: el primer render pinta el Nav sin sesión y luego cambia. | El estado inicial del proveedor es `null` y la lectura ocurre en `useEffect`. El criterio "ninguna advertencia de hidratación" lo verifica. |
| **Formateo regional.** `toLocaleString("es-ES")` puede dar separadores distintos en servidor y cliente según la versión de ICU. | La localización va fijada explícitamente en cada llamada. Si aparece discrepancia, sustituir por una función de formateo propia en `lib/scores.ts`. |
| **Temporizador del reproductor sin limpiar.** Acumula intervalos al alternar pausa o al navegar fuera. | Un único efecto con `clearInterval` en su `return`, dependiente de `[over, paused]`. Está en los criterios de aceptación. |
| **Deriva silenciosa respecto al template.** Portar 6 pantallas a mano invita a omitir detalles pequeños que no rompen nada. | El paso 9 exige comparación lado a lado con el HTML de referencia, y los criterios enumeran los detalles concretos por pantalla. |
| **`references/templates/` como fuente de verdad divergente.** Quedan dos copias del mismo diseño. | Al cerrar esta spec, `app/` pasa a ser la fuente única y `references/templates/` queda como material histórico de comparación. |
| **Animaciones y `prefers-reduced-motion`.** El tilt de la tarjeta y el temporizador son JavaScript, y la regla CSS no los alcanza. | Aceptado para el MVP visual. Se documenta como deuda: el tilt puede condicionarse a `matchMedia("(prefers-reduced-motion: reduce)")` en una spec posterior. |

---

## Lo que **no** está en esta spec

- Lógica de juego real: ninguno de los 8 juegos es jugable.
- Autenticación real, base de datos y puntuaciones persistidas en servidor.
- Pruebas automatizadas.
- Perfil, ajustes y página 404 propia.
- Cambios en la paleta, tipografías o tokens de diseño.

Cada uno de esos, si entra, va en su propia spec.
