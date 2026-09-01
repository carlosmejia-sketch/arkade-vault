@AGENTS.md

# CLAUDE.md

Este archivo brinda orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Idioma

**Todo el contenido de este proyecto se maneja en español**: documentación, comentarios, mensajes de commit, textos de UI y las respuestas al usuario. Cualquier actualización futura a este archivo también debe hacerse en español.

## Proyecto

Arcade Vault — plataforma para jugar online y competir por puntaje (ver `README.md`).

Estado actual: MVP funcional con 5 juegos reales y persistencia de puntajes en Supabase.

- **Rutas** (`app/`): `/` (`components/home.tsx`, landing), `/biblioteca` (`components/library.tsx`, catálogo con búsqueda), `/juegos/[id]` (detalle, server component, top 10 del leaderboard), `/juegos/[id]/jugar` (`components/game-player.tsx`, reproductor), `/acceso` (`components/auth-form.tsx`), `/salon` (`components/hall-of-fame.tsx`), `/acerca-de` (`components/about.tsx`). API routes: `app/api/contacto/route.ts` (envío de email vía Resend) y `app/api/health/supabase/route.ts` (health check de conexión).
- **Juegos** (`lib/games.ts`): 5, todos con motor real y leaderboard real — `asteroides`, `tetris`, `arkanoid`, `snake`, `frogger`. Los juegos mock originales fueron eliminados (spec 10). `Game.engine` es un `string` obligatorio.
- **Auth**: real desde SPEC 24 — `lib/session.tsx` usa Supabase Auth (`@supabase/ssr`), `auth-form.tsx` soporta email/password, Google y GitHub. `proxy.ts` (convención de Next 16, reemplaza `middleware.ts`) refresca cookies en cada request y, desde SPEC 26, redirige a `/acceso` sin sesión en `/juegos/[id]/jugar` (única ruta protegida; el modo invitado ya no existe).
- **Pruebas**: no hay runner configurado (`package.json` solo tiene `dev`, `build`, `start`, `lint`). Si se agregan pruebas, documentar el script aquí.

## Restricciones del stack

- **Next.js 16.2.12 / React 19.2.4, App Router.** Aplica lo indicado en AGENTS.md: esta versión de Next tiene cambios incompatibles frente al conocimiento previo del modelo. Leer el archivo correspondiente en `node_modules/next/dist/docs/01-app/` antes de escribir rutas, obtención de datos, caché, metadata o route handlers — p. ej. `01-getting-started/06-fetching-data.md`, `08-caching.md`, `15-route-handlers.md`. `02-guides/` cubre autenticación, formularios, variables de entorno y migración a cache components.
- **Tailwind CSS v4** vía `@tailwindcss/postcss`. No existe `tailwind.config.js` — los tokens de diseño viven en `app/globals.css` bajo `@theme inline`. Agregar colores/tipografías ahí, no en un config de JS.
- **TypeScript strict**, alias de rutas `@/*` → raíz del repositorio.
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`): cliente browser en `lib/supabase/client.ts` (`createBrowserClient`), cliente server en `lib/supabase/server.ts` (`createServerClient`, cookies async de Next 16, `setAll` en try/catch porque aún no hay middleware que las persista). Variables en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD`. MCP configurado en `.mcp.json` apunta al proyecto de **desarrollo** (`rwiimwxdcieqbwcnfavg`) — usar las herramientas `mcp__supabase__*` para inspeccionar/migrar ese entorno en vez de tocarlo a mano.
- **Resend** para el formulario de contacto: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`.

### Entornos Supabase: dev vs. producción

Hay dos proyectos Supabase separados: **desarrollo** (el de arriba, `rwiimwxdcieqbwcnfavg`) y **producción**. Reglas fijas:

- El MCP de Supabase (`.mcp.json`) apunta solo a desarrollo. **Nunca editar ese archivo para que apunte a producción** — el server MCP no es de solo lectura (incluye `database`, `development`, `branching`, `functions`).
- Claude no debe pedir, recibir, ni almacenar la `service_role` key de producción, ni aplicar migraciones o escrituras ahí. Toda la configuración de producción (Dashboard, Auth providers, `prod-bootstrap.sql`) la ejecuta el usuario a mano.
- **Excepción de solo lectura**: existe un rol dedicado `arcade_readonly` (`supabase/prod-readonly-role.sql`) consumido vía el connection pooler de producción, con la URL en `SUPABASE_PROD_READONLY_URL` (`.env.local`, nunca en el repo ni impresa en respuestas). Solo `SELECT` sobre `public`; ver detalle y candados en `supabase/README.md`. Fuera de esto, Claude sigue sin acceso de escritura ni `project_ref`/credenciales de escritura de producción.
- El SQL de esquema vive versionado en `supabase/prod-bootstrap.sql` (esquema de escritura) y `supabase/prod-readonly-role.sql` (rol de solo lectura); el checklist de configuración manual (Auth providers, URLs de redirect, env vars) está en `supabase/README.md`. Cualquier cambio de esquema futuro se aplica primero a dev vía `mcp__supabase__*`, luego se refleja en esos `.sql`, y el usuario lo replica a mano en producción.

## Skills y agentes

- Usa siempre `/frontend-design` para diseñar la interfaz de usuario.
- **`/spec` y `/spec-impl`** (`Klerith/fernando-skills`) **sí están instaladas** (`skills-lock.json`, `.claude/skills/spec/`, `.claude/skills/spec-impl/`, espejadas en `.agents/skills/`). Es el flujo vigente: cada feature se documenta primero en `specs/NN-nombre.md` (config en `specs/.spec-config.yml`, `AutoCreateBranch: true`) y luego se implementa con `/spec-impl`.
- **`spec-juego`** (`.claude/skills/spec-juego/`): documenta el spec de un juego nuevo con motor real y leaderboard. Detalle completo (7 puntos de integración obligatorios, qué reutilizar sin tocar, plantilla) en `.claude/skills/spec-juego/references/`. Usar esta skill (no `/spec` genérico) al planear un juego nuevo.
- **`spec-impl-game`** (`.claude/skills/spec-impl-game/SKILL.md`): encadena en una sola corrida la implementación de un juego nuevo con su spec de skins (`skin-designer`) y su spec móvil (`mobile-porter`), lanzando ambos agentes secuencialmente. Reemplaza los pasos manuales de invocar cada agente por separado tras `/spec-juego`.

**Agentes** (definición completa en `.claude/agents/<nombre>.md`):

| Agente                     | Qué hace                                                                                                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `game-jam`                 | Dado un tema de game jam, propone 3 juegos y escribe sus specs en `specs/game-jam/`; también acepta un juego ya decidido y le escribe el spec directamente. No escribe código.                                                                        |
| `game-planner`             | Decide qué juego agregar al catálogo, con justificación de encaje; memoria en `references/game-suggestions-todo.md`. No escribe specs ni código.                                                                                                      |
| `mobile-porter`            | Porta a móvil un juego o pantalla por vez (patrón SPEC 14/15); registro en `references/mobile-ported.md`. No escribe código.                                                                                                                          |
| `skin-designer`            | Diseña los 3 skins obligatorios (clásico, neón, retro) de un juego por vez; registro en `references/game-with-themes.md`. No escribe código.                                                                                                          |
| `game-performance-booster` | Audita y corrige performance de un juego por vez contra el checklist de SPEC 18; único agente de esta lista que sí escribe código (solo cambios de rendimiento). Registro en `references/performance-audited.md`.                                     |
| `security-auditor`         | Audita seguridad de punta a punta en cada corrida (base de datos + aplicación); escribe spec de remediación en `specs/`, solo lectura sobre Supabase. Registro en `references/security/security-audited.md`. No escribe código ni aplica migraciones. |

Pipeline completo para un juego nuevo: `game-planner → spec-juego → /spec-impl → mobile-porter → /spec-impl → skin-designer → /spec-impl → game-performance-booster` (o `spec-impl-game` para encadenar las fases de skins + móvil automáticamente).

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

- Registro central en `lib/games/registry.ts`: `ENGINE_REGISTRY` mapea el slug del juego (`asteroides|tetris|arkanoid|snake|frogger`) a una `EngineFactory` definida en `lib/games/<slug>/engine.ts`.
- Tipos compartidos en `lib/games/types.ts`: `EngineCallbacks { onScore, onLives, onLevel, onGameOver }`, `Engine { start, pause, resume, restart, destroy }`, `EngineFactory = (canvas, callbacks) => Engine`.
- Patrón de cada engine: función factory (no clase) que recibe el canvas, agrega/quita listeners de teclado en `start()`/`destroy()`, usa un loop `requestAnimationFrame` con `dt` acotado, y un patrón `emitIfChanged()` para evitar `setState` en cada frame.
- `components/game-player.tsx` busca el engine en `ENGINE_REGISTRY[game.engine]` y tiene casos especiales: Tetris (game over a un solo golpe, canvas vertical 300×600) y Arkanoid (overlay de pausa dibujado en el propio canvas, bloquea el overlay genérico de React).
- Deuda aceptada conocida (ver `mapa-integracion.md`): `game.best`/`game.plays` en `lib/games.ts` no se sincronizan con los datos reales de Supabase; los handlers de teclado no llaman `preventDefault()`.
- Para agregar un juego nuevo con motor real, seguir la skill `spec-juego` (arriba), no reinventar la integración.

### Supabase / leaderboard

- Tabla única `public.scores` (`game_id`, `player_name`, `score` con `CHECK (score > 0 AND score < 10000000)`, `created_at`, `user_id`), RLS habilitado con `scores_public_select` (SELECT, anon+authenticated) y `scores_authenticated_insert` (INSERT, authenticated, `auth.uid() = user_id`). El SQL histórico de dev vive documentado dentro de `specs/06-leaderboard-asteroides-supabase.md` y `specs/27-seguridad-auditoria-integral.md` (se aplicó vía `mcp__supabase__apply_migration`); el esquema versionado y reproducible para producción está en `supabase/prod-bootstrap.sql` (ver `supabase/README.md`).
- `lib/scores.ts` centraliza el acceso: `fetchTopScores`, `fetchRecentScores`, `fetchTopScoresAllGames`, `insertScore`. Tipos `RealScoreRow`/`RecentScoreRow`. No crear queries sueltas a `scores` fuera de este archivo.
- Consumidores: `app/juegos/[id]/page.tsx` (server, top 10), `hall-of-fame.tsx` (cliente, top 12 por pestaña), `home.tsx` (server, ticker y top jugadores), `game-player.tsx` (inserta puntaje al finalizar partida, los 5 juegos).

## Specs (`specs/`)

Flujo Spec Driven Design activo — ver sección Skills y agentes. Specs 01 a 26 ya implementadas: 01–10 (mock inicial → landing → about/contacto → config Supabase → Asteroides → leaderboard real → Tetris → Arkanoid → Snake → eliminación de juegos mock), 11–13 (skins de Asteroides/Snake/Arkanoid), 14–15 (controles táctiles y responsivo móvil), 16–17 (Frogger y su port móvil), 18–23 (checklist de performance de motores y su aplicación a cada juego, incluido Frogger), 24–26 (auth real con Supabase Auth → endurecimiento de seguridad básico → protección de `/juegos/[id]/jugar` y eliminación del modo invitado). Antes de iniciar trabajo nuevo, revisar `specs/` para no duplicar un spec existente y seguir la numeración consecutiva.

Trabajo futuro mencionado en specs pero sin spec propio todavía: sincronizar `game.best`/`game.plays` con datos reales, Realtime/Edge Functions, suite de pruebas automatizadas, Content-Security-Policy granular, recuperación de contraseña.
