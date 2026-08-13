@AGENTS.md

# CLAUDE.md

Este archivo brinda orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Idioma

**Todo el contenido de este proyecto se maneja en español**: documentación, comentarios, mensajes de commit, textos de UI y las respuestas al usuario. Cualquier actualización futura a este archivo también debe hacerse en español.

## Proyecto

Arcade Vault — plataforma para jugar online y competir por puntaje (ver `README.md`).

Estado actual: MVP funcional con 4 juegos reales y persistencia de puntajes en Supabase.

- **Rutas** (`app/`): `/` (`components/home.tsx`, landing), `/biblioteca` (`components/library.tsx`, catálogo con búsqueda), `/juegos/[id]` (detalle, server component, top 10 del leaderboard), `/juegos/[id]/jugar` (`components/game-player.tsx`, reproductor), `/acceso` (`components/auth-form.tsx`), `/salon` (`components/hall-of-fame.tsx`), `/acerca-de` (`components/about.tsx`). API routes: `app/api/contacto/route.ts` (envío de email vía Resend) y `app/api/health/supabase/route.ts` (health check de conexión).
- **Juegos** (`lib/games.ts`): exactamente 4, todos con motor real y leaderboard real — `asteroides`, `tetris`, `arkanoid`, `snake`. Los juegos mock originales fueron eliminados (spec 10). `Game.engine` es un `string` obligatorio.
- **Auth**: no es real todavía. `lib/session.tsx` maneja sesión mock vía `localStorage` (`av_user`, `av_scores`); `auth-form.tsx` acepta cualquier usuario/contraseña. No hay `middleware.ts` ni Supabase Auth real.
- **Pruebas**: no hay runner configurado (`package.json` solo tiene `dev`, `build`, `start`, `lint`). Si se agregan pruebas, documentar el script aquí.

## Restricciones del stack

- **Next.js 16.2.12 / React 19.2.4, App Router.** Aplica lo indicado en AGENTS.md: esta versión de Next tiene cambios incompatibles frente al conocimiento previo del modelo. Leer el archivo correspondiente en `node_modules/next/dist/docs/01-app/` antes de escribir rutas, obtención de datos, caché, metadata o route handlers — p. ej. `01-getting-started/06-fetching-data.md`, `08-caching.md`, `15-route-handlers.md`. `02-guides/` cubre autenticación, formularios, variables de entorno y migración a cache components.
- **Tailwind CSS v4** vía `@tailwindcss/postcss`. No existe `tailwind.config.js` — los tokens de diseño viven en `app/globals.css` bajo `@theme inline`. Agregar colores/tipografías ahí, no en un config de JS.
- **TypeScript strict**, alias de rutas `@/*` → raíz del repositorio.
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`): cliente browser en `lib/supabase/client.ts` (`createBrowserClient`), cliente server en `lib/supabase/server.ts` (`createServerClient`, cookies async de Next 16, `setAll` en try/catch porque aún no hay middleware que las persista). Variables en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD`. MCP configurado en `.mcp.json` (proyecto `rwiimwxdcieqbwcnfavg`) — usar las herramientas `mcp__supabase__*` para inspeccionar/migrar en vez de tocar el proyecto a mano.
- **Resend** para el formulario de contacto: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`.

## Skills

- Usa siempre `/frontend-design` para diseñar la interfaz de usuario.
- **`/spec` y `/spec-impl`** (`Klerith/fernando-skills`) **sí están instaladas** (`skills-lock.json`, `.claude/skills/spec/`, `.claude/skills/spec-impl/`, espejadas en `.agents/skills/`). Es el flujo vigente: cada feature se documenta primero en `specs/NN-nombre.md` (config en `specs/.spec-config.yml`, `AutoCreateBranch: true`) y luego se implementa con `/spec-impl`.
- **`spec-juego`** (`.claude/skills/spec-juego/`): skill propia del proyecto para agregar un juego nuevo con motor real. `references/mapa-integracion.md` documenta los 7 puntos de integración obligatorios (`lib/games.ts`, clases `.cover-*` en `app/globals.css`, `lib/games/<slug>/engine.ts`, `components/game-player.tsx`, `app/juegos/[id]/page.tsx`, `components/hall-of-fame.tsx`, el spec mismo) y qué reutilizar sin tocar (`lib/scores.ts`, clientes Supabase, tabla `scores`, `leaderboard.tsx`, `lib/session.tsx`). `references/plantilla-spec-juego.md` es la plantilla de spec para un juego nuevo. Usar esta skill (no `/spec` genérico) al planear un juego nuevo.
- Hook `PostToolUse` en `.claude/settings.json` corre `.claude/hooks/format-on-write.js` (Prettier/ESLint) tras cada `Write`/`Edit`.

## Convenciones vigentes

### Tema visual

- **Tema Arcade Vault** portado de `references/templates/styles.css` a `app/globals.css` (2800+ líneas). Ese archivo es la fuente única del estilo: variables crudas en `:root` (`--bg`, `--cyan`, `--pixel`, `--mono`, …) + clases de componente (`.av-nav`, `.btn`, `.card`, `.crt`, `.leaderboard`, `.podium`, `.cover-*`, …). Al portar nuevas pantallas del template, reutilizar esas clases tal cual.
- El layout renderiza los fondos fijos (`.av-bg` con rejilla en perspectiva + scanlines, `.av-noise`) y envuelve el contenido en `.av-root` (flex column, `z-index: 2`); las páginas usan `.av-main` (`flex: 1`) para ocupar el alto.
- Tipografías vía `next/font/google` en `app/layout.tsx`, expuestas como variables CSS: Press Start 2P (`--font-press-start`), JetBrains Mono (`--font-jetbrains-mono`) y Courier Prime (`--font-courier-prime`). El CSS las consume a través de `--pixel` y `--mono`; usar esas dos, no los nombres de fuente directos.
- Los tokens también se exponen a Tailwind en `@theme inline` con prefijo `av-` (`bg-av-bg-2`, `text-av-cyan`, `border-av-line`) más `font-pixel` / `font-mono`, para no chocar con la paleta por defecto de Tailwind.
- **Tema oscuro único.** No hay `prefers-color-scheme` ni variante clara: la paleta es fija. No agregar utilidades `dark:`.
- Accesibilidad: `:focus-visible` con contorno cian y bloque `prefers-reduced-motion` al final de `globals.css` que neutraliza animaciones. Mantenerlos al agregar animaciones nuevas.

### Motores de juego (`lib/games/`)

- Registro central en `lib/games/registry.ts`: `ENGINE_REGISTRY` mapea el slug del juego (`asteroides|tetris|arkanoid|snake`) a una `EngineFactory` definida en `lib/games/<slug>/engine.ts`.
- Tipos compartidos en `lib/games/types.ts`: `EngineCallbacks { onScore, onLives, onLevel, onGameOver }`, `Engine { start, pause, resume, restart, destroy }`, `EngineFactory = (canvas, callbacks) => Engine`.
- Patrón de cada engine: función factory (no clase) que recibe el canvas, agrega/quita listeners de teclado en `start()`/`destroy()`, usa un loop `requestAnimationFrame` con `dt` acotado, y un patrón `emitIfChanged()` para evitar `setState` en cada frame.
- `components/game-player.tsx` busca el engine en `ENGINE_REGISTRY[game.engine]` y tiene casos especiales: Tetris (game over a un solo golpe, canvas vertical 300×600) y Arkanoid (overlay de pausa dibujado en el propio canvas, bloquea el overlay genérico de React).
- Deuda aceptada conocida (ver `mapa-integracion.md`): `game.best`/`game.plays` en `lib/games.ts` no se sincronizan con los datos reales de Supabase; los handlers de teclado no llaman `preventDefault()`.
- Para agregar un juego nuevo con motor real, seguir la skill `spec-juego` (arriba), no reinventar la integración.

### Supabase / leaderboard

- Tabla única `public.scores` (`game_id`, `player_name`, `score` con `CHECK (score > 0 AND score < 10000000)`, `created_at`), RLS habilitado con políticas públicas de `SELECT`/`INSERT` para `anon`/`authenticated`. No hay carpeta `supabase/` ni migraciones `.sql` en el repo — el SQL vive documentado dentro de `specs/06-leaderboard-asteroides-supabase.md` y se aplicó vía `mcp__supabase__apply_migration`.
- `lib/scores.ts` centraliza el acceso: `fetchTopScores`, `fetchRecentScores`, `fetchTopScoresAllGames`, `insertScore`. Tipos `RealScoreRow`/`RecentScoreRow`. No crear queries sueltas a `scores` fuera de este archivo.
- Consumidores: `app/juegos/[id]/page.tsx` (server, top 10), `hall-of-fame.tsx` (cliente, top 12 por pestaña), `home.tsx` (server, ticker y top jugadores), `game-player.tsx` (inserta puntaje al finalizar partida, los 4 juegos).

## Specs (`specs/`)

Flujo Spec Driven Design activo — ver sección Skills. Specs 01 a 10 ya implementadas (mock inicial → landing → about/contacto → config Supabase → Asteroides → leaderboard real → Tetris → Arkanoid → Snake → eliminación de juegos mock). Antes de iniciar trabajo nuevo, revisar `specs/` para no duplicar un spec existente y seguir la numeración consecutiva.

Trabajo futuro mencionado en specs pero sin spec propio todavía: autenticación real + `middleware.ts` de sesión, sincronizar `game.best`/`game.plays` con datos reales, Realtime/Edge Functions, suite de pruebas automatizadas.
