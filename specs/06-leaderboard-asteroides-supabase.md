# SPEC 06 — Leaderboard real de Asteroides con Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 04 (configuración base de Supabase), SPEC 05 (motor real de Asteroides)
> **Fecha:** 2026-08-03
> **Objetivo:** Reemplazar el leaderboard simulado (`seededScores`) de Asteroides por una tabla real `scores` en Supabase, insertando cada puntaje jugado desde el cliente y mostrando el ranking real tanto en la ficha de detalle como en el Salón de la Fama, sin tocar el mock de los otros 8 juegos.

---

## Alcance

**Dentro:**

1. **Tabla `scores` en Supabase** (proyecto `rwiimwxdcieqbwcnfavg`, aplicada vía `mcp__supabase__apply_migration`): columnas `id` (bigint identity, PK), `game_id` (text, not null), `player_name` (text, not null), `score` (integer, not null), `created_at` (timestamptz, default `now()`). Constraint `CHECK (score > 0 AND score < 10000000)`.
2. **RLS habilitada con policies públicas**: `INSERT` y `SELECT` permitidos a los roles `anon`/`authenticated` (clave publicable), sin más restricción que el `CHECK` de la tabla. Sin auth real, cualquiera puede insertar y leer.
3. **`lib/scores.ts` extendido** con funciones que consultan/insertan sobre Supabase, acotadas a `game_id: "asteroides"`:
   - `fetchTopScores(supabase, gameId, limit)`: `SELECT` ordenado por `score` descendente, limitado.
   - `insertScore(supabase, { gameId, playerName, score })`: `INSERT` de una fila.
4. **`components/game-player.tsx`**: al presionar "GUARDAR PUNTUACIÓN" con `game.id === "asteroides"`, además de `saveScore` (localStorage, sin cambios) se llama `insertScore` con el cliente browser (`lib/supabase/client.ts`).
5. **`app/juegos/[id]/page.tsx`**: si `id === "asteroides"`, usa el cliente server (`lib/supabase/server.ts`) para traer top 10 real vía `fetchTopScores` en vez de `seededScores`; para cualquier otro `id`, sigue igual que hoy.
6. **`components/hall-of-fame.tsx`**: si la pestaña activa es `asteroides`, hace fetch de top 12 real (cliente browser, en un `useEffect`) en vez de `seededScores`; para cualquier otra pestaña, sigue igual que hoy.
7. **Estado vacío / parcial**: si hay menos de 3 filas reales, no se renderiza el podio (evita acceder a posiciones inexistentes); se muestra solo la tabla con las filas que existan. Si hay 0 filas, se muestra un mensaje "AÚN NO HAY PUNTAJES" en vez de tabla y podio.
8. **"TU MEJOR MARCA" real en Asteroides**: en `hall-of-fame.tsx`, cuando la pestaña es `asteroides` y hay `user` en sesión, se busca en las filas reales la de mayor `score` cuyo `player_name` coincida con `user.name` y se muestra igual que en las pestañas mock.

**Fuera de alcance (para specs futuras):**

- Leaderboard real para los otros 8 juegos (siguen con `seededScores`/mock hasta que tengan motor propio).
- Autenticación real (sigue `lib/session.tsx` con localStorage; `player_name` es el alias tal cual lo escribe el jugador, sin verificación de identidad).
- Supabase Realtime (el leaderboard se consulta al cargar la página o tras guardar el puntaje propio; no hay suscripción en vivo a puntajes de otros jugadores).
- Tabla `games` en Supabase (el catálogo sigue siendo el mock de `lib/games.ts`).
- Migración de los puntajes mock existentes (`seededScores`/"rocas") a la tabla real — arranca vacía.
- Rate limiting o CAPTCHA contra spam de inserts (se documenta como riesgo aceptado dado que no hay auth).
- Borrado o edición de puntajes ya guardados.

---

## Modelo de datos

### Tabla `scores` (Supabase, SQL de la migración)

```sql
create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null,
  player_name text not null,
  score integer not null check (score > 0 and score < 10000000),
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

create policy "scores_public_select" on public.scores
  for select to anon, authenticated using (true);

create policy "scores_public_insert" on public.scores
  for insert to anon, authenticated with check (true);
```

`game_id` queda como columna abierta (no enum) pensando en más juegos a futuro, aunque esta spec solo escribe/lee `"asteroides"`.

### Tipos y funciones nuevas en `lib/scores.ts`

```ts
export type RealScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // derivado de created_at, mismo formato dd/mm/yyyy que ScoreRow
};

export async function fetchTopScores(
  supabase: SupabaseClient,
  gameId: string,
  limit: number,
): Promise<RealScoreRow[]>;

export async function insertScore(
  supabase: SupabaseClient,
  entry: { gameId: string; playerName: string; score: number },
): Promise<void>;
```

`RealScoreRow` es intencionalmente compatible en forma con `ScoreRow` (mismos campos `rank`/`name`/`score`/`date`) para que `Leaderboard` y `HallOfFame` no necesiten dos variantes de render — solo cambia el origen de los datos.

---

## Plan de implementación

Cada paso deja el proyecto compilando y navegable.

### Paso 1 — Migración de la tabla `scores`

Aplicar el SQL de la sección "Modelo de datos" con `mcp__supabase__apply_migration` sobre el proyecto `rwiimwxdcieqbwcnfavg`. Verificar con `mcp__supabase__list_tables` que `scores` existe con RLS habilitada. Sin código todavía que la use.

### Paso 2 — `lib/scores.ts`: `fetchTopScores` e `insertScore`

Agregar `RealScoreRow`, `fetchTopScores(supabase, gameId, limit)` (SELECT ordenado por `score` descendente, mapeando `created_at` a `date` en formato `dd/mm/yyyy`) e `insertScore(supabase, entry)`. Sin consumidores todavía — `npx tsc --noEmit` pasa.

### Paso 3 — Guardado real desde `game-player.tsx`

En el handler de "GUARDAR PUNTUACIÓN", cuando `game.id === "asteroides"`, además de `saveScore` (localStorage) llamar `insertScore` con el cliente de `lib/supabase/client.ts`. Verificar manualmente: jugar una partida, guardar puntaje, confirmar con `mcp__supabase__execute_sql` (`select * from scores`) que la fila aparece.

### Paso 4 — Leaderboard real en la ficha de detalle

En `app/juegos/[id]/page.tsx`, si `id === "asteroides"`, llamar `fetchTopScores` con el cliente de `lib/supabase/server.ts` (top 10) en vez de `seededScores`; pasar el resultado a `Leaderboard` sin cambiar ese componente (mismo shape `ScoreRow`/`RealScoreRow`). Agregar el estado vacío (0 filas → mensaje; no aplica ocultar podio acá porque `Leaderboard` no tiene podio). Para cualquier otro `id`, sigue igual.

### Paso 5 — Leaderboard real en el Salón de la Fama

En `components/hall-of-fame.tsx`, cuando `tab === "asteroides"`, hacer fetch de `fetchTopScores` (cliente browser, top 12) en un `useEffect` disparado por cambio de `tab`, en vez de `seededScores`. Implementar el estado vacío/parcial: si `rows.length < 3`, no renderizar `.podium`; si `rows.length === 0`, mostrar mensaje "AÚN NO HAY PUNTAJES" en vez de `.hall-table`. Calcular "TU MEJOR MARCA" buscando en `rows` la de mayor `score` con `name === user.name`, mostrando esa fila solo si existe (sin el placeholder `youScore || 9999` que usa el mock). Para cualquier otra pestaña, sigue igual (`seededScores`, podio siempre visible).

### Paso 6 — Verificación manual

`npm run dev`. Con la tabla vacía: `/juegos/asteroides` muestra mensaje de leaderboard vacío; `/salon` pestaña Asteroides muestra "AÚN NO HAY PUNTAJES" sin podio. Jugar una partida, morir, guardar puntaje con un alias: recargar `/juegos/asteroides` y ver la fila nueva en el top 10; ir a `/salon` → Asteroides y ver la fila en la tabla (y en el podio si quedó en el top 3). Confirmar que las otras 8 pestañas/fichas de detalle siguen mostrando `seededScores` sin cambios.

### Paso 7 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

### Base de datos

- [x] La tabla `scores` existe en el proyecto Supabase `rwiimwxdcieqbwcnfavg` con las columnas `id`, `game_id`, `player_name`, `score`, `created_at`.
- [x] RLS está habilitada en `scores` con policies que permiten `SELECT` e `INSERT` a `anon`/`authenticated`.
- [x] Un `INSERT` con `score <= 0` o `score >= 10000000` es rechazado por el `CHECK` constraint.

### `lib/scores.ts`

- [x] `fetchTopScores(supabase, gameId, limit)` devuelve filas ordenadas por `score` descendente, máximo `limit` filas, con `date` en formato `dd/mm/yyyy`.
- [x] `insertScore(supabase, entry)` inserta una fila con `game_id`, `player_name` y `score` correctos.

### Guardado desde el reproductor

- [x] Al presionar "GUARDAR PUNTUACIÓN" en una partida de Asteroides, se crea una fila nueva en `scores` con el alias y puntaje mostrados en el modal.
- [x] El guardado en `localStorage` (`saveScore` de `lib/session.tsx`) sigue funcionando igual que hoy, sin duplicarse ni romperse.
- [x] Guardar un puntaje en cualquier otro juego (mock) no inserta nada en `scores`.

### Ficha de detalle (`/juegos/asteroides`)

- [x] Con la tabla vacía, se muestra un mensaje de "aún no hay puntajes" en vez de una tabla vacía. _(verificado por revisión de código, no en vivo — la tabla ya tiene datos reales de uso genuino)_
- [x] Con al menos una fila real, `Leaderboard` muestra hasta 10 filas ordenadas por puntaje descendente, con datos reales de Supabase.
- [x] La ficha de detalle de cualquier otro juego sigue mostrando `seededScores` sin cambios.

### Salón de la Fama (`/salon`)

- [x] Pestaña Asteroides con 0 filas: no se renderiza `.podium` ni `.hall-table`; se muestra el mensaje "AÚN NO HAY PUNTAJES". _(verificado por revisión de código, no en vivo — la tabla ya tiene datos reales de uso genuino)_
- [x] Pestaña Asteroides con 1 o 2 filas: no se renderiza `.podium`; sí se renderiza `.hall-table` con esas filas.
- [x] Pestaña Asteroides con 3 o más filas: se renderiza `.podium` (puestos 1/2/3 reales) y `.hall-table` (hasta 12 filas reales).
- [x] Si el usuario en sesión (`user.name`) tiene al menos una fila propia en Asteroides, aparece "▸ TU MEJOR MARCA EN ASTEROIDES" con su score más alto real.
- [x] Si el usuario en sesión no tiene ninguna fila propia en Asteroides, no aparece la fila "TU MEJOR MARCA" para esa pestaña.
- [x] Las otras 8 pestañas siguen mostrando `seededScores` con podio siempre visible, sin cambios de comportamiento.

### Compilación

- [x] `npx tsc --noEmit` pasa sin errores.
- [x] `npm run lint` pasa sin advertencias nuevas.
- [x] `npm run build` termina sin errores.

---

## Decisiones tomadas y descartadas

### Solo Asteroides tiene leaderboard real, los otros 8 siguen mock

- **Sí:** es el único juego con motor real hoy (SPEC 05); dar leaderboard real a juegos sin motor real produciría puntajes reales de partidas que no existen. Decisión explícita del usuario.
- **No:** tabla `scores` alimentada también por el mock de los otros 8 — habría mezclado datos simulados con reales en la misma tabla, contaminándola desde el día uno.

### Tabla `scores` genérica con columna `game_id`, no una tabla por juego

- **Sí:** aunque hoy solo se usa `game_id: "asteroides"`, deja el esquema listo para más juegos sin migrar estructura cuando se porte el segundo. Decisión explícita del usuario sobre las opciones presentadas.
- **No:** `asteroides_scores` sin `game_id` — hubiera obligado a crear una tabla nueva (y duplicar RLS/policies) por cada juego futuro.

### Sin autenticación real — `player_name` es el alias de localStorage tal cual

- **Sí:** auth real ya quedó explícitamente fuera de alcance en SPEC 04; agregarla acá hubiera inflado esta spec con un dominio completo (login, sesiones, RLS por usuario). Decisión explícita del usuario.
- **No:** requerir Supabase Auth para guardar puntaje — bloquearía el flujo actual (cualquier alias, sin registro) que el resto del proyecto ya asume.

### RLS abierta a `INSERT`/`SELECT` públicos, con `CHECK` de rango como única validación

- **Sí:** sin auth no hay forma de identificar quién inserta; el `CHECK (score > 0 AND score < 10000000)` filtra los casos más obvios de abuso (negativos, valores absurdos) sin agregar infraestructura nueva. Decisión explícita del usuario.
- **No:** rate limiting o CAPTCHA — trabajo no pedido, se documenta como riesgo aceptado en vez de construirse ahora.

### Insert directo desde el cliente browser, sin route handler

- **Sí:** con RLS pública no hay lógica de servidor que agregar (no hay secretos que ocultar); un endpoint intermedio solo agregaría una capa sin beneficio. Decisión explícita del usuario.
- **No:** `POST /api/scores` — hubiera sido indirección sin ganancia dado que la policy ya permite el insert directo con la clave publicable.

### Migración aplicada directo al proyecto remoto vía MCP, sin carpeta `supabase/` local

- **Sí:** el repo no tiene CLI de Supabase ni carpeta de migraciones; el proyecto ya está vinculado por `.mcp.json`, igual que en SPEC 04. Decisión explícita del usuario.
- **No:** crear un archivo `.sql` para aplicar a mano — hubiera agregado un paso manual fuera del flujo ya establecido con el MCP.

### Arranca vacía, sin migrar `seededScores`/"rocas" como semilla

- **Sí:** los datos mock no representan partidas reales de Asteroides; sembrarlos hubiera mezclado puntajes ficticios con reales de forma indistinguible. Decisión explícita del usuario.
- **No:** poblarla con `seededScores` como semilla — riesgo de que un jugador nuevo piense que esos nombres corresponden a partidas reales.

### Podio oculto (no placeholders) cuando hay menos de 3 filas reales

- **Sí:** evita acceder a `rows[1]`/`rows[2]` inexistentes y evita inventar visualmente un tercer/segundo puesto que no existe. Decisión explícita del usuario.
- **No:** rellenar con placeholders "—" — hubiera mantenido el layout de 3 columnas pero sugerido falsamente que hay un ranking de 3 cuando puede haber 1 o 2 jugadores reales.

### "TU MEJOR MARCA" real para Asteroides, buscando por `player_name`

- **Sí:** mantiene paridad de funcionalidad con las pestañas mock; sin auth, el único vínculo disponible entre sesión y fila es el alias, igual que ya ocurre con `saveScore` en `localStorage`. Decisión explícita del usuario.
- **No:** omitir la fila para Asteroides — hubiera sido una regresión de funcionalidad visible solo en la pestaña real.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                  | Mitigación                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spam/abuso de inserts.** Sin auth ni rate limiting, cualquiera puede insertar puntajes falsos repetidamente (vía la clave publicable expuesta en el cliente).                                                                         | Aceptado como riesgo conocido dado que auth real está fuera de alcance (SPEC 04); el `CHECK` de rango filtra los casos más obvios. Se revisita si el abuso real se vuelve un problema.       |
| **Alias duplicados o suplantados.** Como `player_name` es texto libre sin verificación, un jugador puede escribir el alias de otro y aparecer como si fuera esa persona en "TU MEJOR MARCA".                                            | Aceptado — mismo comportamiento que ya existe hoy con `localStorage`/`saveScore`; no es una regresión nueva introducida por esta spec.                                                       |
| **Fetch client-side en `hall-of-fame.tsx` sin estado de carga explícito.** Cambiar de pestaña dispara un fetch asíncrono; si no se maneja bien el estado intermedio, puede mostrarse brevemente contenido stale de la pestaña anterior. | El `useEffect` debe limpiar/reemplazar `rows` antes de mostrar resultados nuevos, y puede mostrarse un estado de carga simple mientras el fetch está en curso (sin bloquear la interacción). |
| **Migración aplicada directo a producción vía MCP.** `apply_migration` corre contra el proyecto remoto real, sin ambiente de staging intermedio.                                                                                        | Se verifica con `list_tables`/`execute_sql` inmediatamente después de aplicar, antes de continuar con el resto del plan.                                                                     |

---

## Qué **no** está en esta spec

- Leaderboard real para los otros 8 juegos.
- Autenticación real (Supabase Auth).
- Supabase Realtime.
- Tabla `games` en Supabase.
- Migración de puntajes mock existentes.
- Rate limiting / CAPTCHA contra spam.
- Borrado o edición de puntajes guardados.

Cada uno de estos, si se necesita, va en su propia spec.
