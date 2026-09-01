-- Arcade Vault — rol de SOLO LECTURA para producción, consumido vía el
-- connection pooler (Supavisor), no vía el MCP de Supabase (que solo
-- apunta a desarrollo, ver supabase/README.md).
--
-- Ejecutar en el SQL Editor del proyecto Supabase de PRODUCCIÓN.
-- Es idempotente: se puede volver a correr para rotar la contraseña
-- o para reaplicar grants/política si algo se tocó a mano.
--
-- ANTES DE EJECUTAR: reemplazar 'CAMBIAR_ESTA_PASSWORD' por una
-- contraseña fuerte generada aparte (no reutilizar ninguna otra).

-- 1. Rol de login, sin herencia de privilegios de otros roles
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'arcade_readonly') then
    create role arcade_readonly with login password 'CAMBIAR_ESTA_PASSWORD' noinherit;
  else
    alter role arcade_readonly with password 'CAMBIAR_ESTA_PASSWORD' noinherit;
  end if;
end
$$;

-- 2. Candado de solo lectura a nivel de sesión: bloquea INSERT/UPDATE/DELETE/DDL
--    aunque algún grant futuro se otorgara por error.
alter role arcade_readonly set default_transaction_read_only = on;

-- 3. Límites de sesión: evita que una consulta larga o colgada acapare
--    conexiones del pooler.
alter role arcade_readonly set statement_timeout = '30s';
alter role arcade_readonly set idle_in_transaction_session_timeout = '60s';

-- 4. Grants mínimos: solo schema public, solo SELECT.
--    Nada de auth/storage/extensions, nada de INSERT/UPDATE/DELETE,
--    nada de funciones ni secuencias.
revoke all on schema public from arcade_readonly;
grant usage on schema public to arcade_readonly;
grant select on all tables in schema public to arcade_readonly;

-- Tablas creadas en el futuro en public quedan legibles sin repetir el grant.
alter default privileges in schema public grant select on tables to arcade_readonly;

-- 5. Política RLS explícita: scores_public_select (ver prod-bootstrap.sql)
--    solo cubre anon/authenticated, así que sin esto arcade_readonly vería
--    0 filas pese a tener el grant de tabla.
drop policy if exists scores_readonly_select on public.scores;
create policy scores_readonly_select
  on public.scores for select
  to arcade_readonly
  using (true);

-- ---------------------------------------------------------------------------
-- Cadena de conexión (Supavisor, session mode — puerto 5432):
--
--   postgresql://arcade_readonly.<PROJECT_REF>:<PASSWORD>@<POOLER_HOST>:5432/postgres
--
-- <PROJECT_REF> y <POOLER_HOST> se obtienen en Dashboard → Connect →
-- "Session pooler" del proyecto de PRODUCCIÓN. Guardar la URL resultante
-- como SUPABASE_PROD_READONLY_URL en .env.local (nunca en el repo).
--
-- Se usa 5432 (session mode) y no 6543 (transaction mode) porque este
-- último no soporta SET de sesión ni prepared statements, y el rol
-- depende de un SET de sesión (default_transaction_read_only) para su
-- segunda capa de protección.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Verificación (correr después, en el mismo SQL Editor):
--
-- select rolname, rolcanlogin, rolsuper, rolbypassrls, rolconfig
--   from pg_roles where rolname = 'arcade_readonly';
-- -- Esperado: rolsuper=f, rolbypassrls=f,
-- --   rolconfig incluye 'default_transaction_read_only=on'.
--
-- select policyname, cmd, roles from pg_policies where tablename = 'scores';
-- -- Esperado: incluye scores_readonly_select | SELECT | {arcade_readonly}.
--
-- select table_name, privilege_type from information_schema.role_table_grants
--   where grantee = 'arcade_readonly';
-- -- Esperado: solo privilege_type = 'SELECT', ninguna fila de auth/storage.
-- ---------------------------------------------------------------------------
