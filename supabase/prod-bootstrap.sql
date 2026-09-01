-- Arcade Vault — bootstrap de producción.
-- Ejecutar UNA sola vez, completo, en el SQL Editor del proyecto Supabase de producción.
-- Reconstruye el esquema equivalente al de desarrollo (specs 06 y 27) más el
-- endurecimiento que dev todavía no tiene (índices, grants mínimos).
--
-- Este archivo es de solo lectura para Claude: se documenta y versiona aquí,
-- pero se aplica a mano por el usuario. Ver supabase/README.md.

-- 1. Tabla de puntajes
create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  game_id     text        not null,
  player_name text        not null,
  score       integer     not null,
  created_at  timestamptz not null default now(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  constraint scores_score_range        check (score > 0 and score < 10000000),
  constraint scores_player_name_length check (char_length(player_name) between 1 and 20)
);

-- 2. RLS
alter table public.scores enable row level security;

drop policy if exists scores_public_select on public.scores;
create policy scores_public_select
  on public.scores for select
  to anon, authenticated
  using (true);

drop policy if exists scores_authenticated_insert on public.scores;
create policy scores_authenticated_insert
  on public.scores for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 3. Grants mínimos (revoca lo que Supabase concede por defecto a nivel de tabla)
revoke all on public.scores from anon, authenticated;
grant select on public.scores to anon, authenticated;
grant insert on public.scores to authenticated;

-- 4. Índices que dev no tiene (usados por lib/scores.ts)
create index if not exists scores_game_score_idx on public.scores (game_id, score desc);
create index if not exists scores_created_at_idx  on public.scores (created_at desc);

-- 5. Cerrar RPC pública de la función SECURITY DEFINER de plataforma
--    (rls_auto_enable ya viene creada por Supabase en todo proyecto nuevo)
revoke execute on function public.rls_auto_enable() from anon, authenticated;
