# Supabase — dev vs. producción

Este proyecto usa **dos** instancias de Supabase separadas:

- **Desarrollo** (`rwiimwxdcieqbwcnfavg`): es la única a la que Claude tiene acceso, vía el MCP configurado en `.mcp.json`.
- **Producción**: instancia separada. **Claude no tiene ni debe tener acceso a ella** — ni por MCP, ni por credenciales, ni aplicando SQL directamente. Toda la configuración de producción la ejecuta el usuario a mano.

`.mcp.json` apunta y debe seguir apuntando siempre a desarrollo. No editarlo para que apunte a producción: el servidor MCP de Supabase no es de solo lectura (incluye `database`, `development`, `branching`, `functions`), así que apuntarlo a producción le daría a Claude permiso de escritura sobre datos reales.

## `prod-bootstrap.sql`

Reconstruye en producción el esquema equivalente al de desarrollo (tabla `scores`, RLS, políticas), más dos mejoras que desarrollo no tiene: índices para el leaderboard y grants de tabla mínimos. Es idempotente (`create ... if not exists`, `drop policy if exists`).

**Cómo aplicarlo**: copiar todo el archivo y pegarlo en el **SQL Editor** del Dashboard de producción, ejecutar una sola vez.

## Checklist manual de Dashboard (producción)

### Authentication → URL Configuration

- Site URL: `https://<TU_DOMINIO>`
- Redirect URLs: `https://<TU_DOMINIO>/auth/callback`

### Authentication → Sign In / Providers → Email

- **Confirm email: OFF.** `components/auth-form.tsx` asume sesión inmediata tras `signUp`; con confirmación de email activa, el registro cambia de comportamiento sin avisar en el código.
- Minimum password length: **8** (debe coincidir con `lib/password-policy.ts`).
- **Leaked password protection: ON.**

### Authentication → Providers → Google / GitHub

Crear apps OAuth **nuevas** (no reutilizar las de desarrollo):

- Authorized redirect URI en ambas: `https://<REF_PRODUCCION>.supabase.co/auth/v1/callback`
- Pegar el Client ID / Secret resultante en el Dashboard de producción.

### Database → Backups

Verificar que el plan tenga PITR o backups diarios habilitados.

## Variables de entorno de producción

Se cargan en el panel del host de despliegue (Vercel u otro), nunca como archivo dentro del repo.

| Variable                               | Nota                                         |
| -------------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto de producción               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave `sb_publishable_…` de producción       |
| `SUPABASE_DB_PASSWORD`                 | Solo si se usa `psql`/CLI manual contra prod |
| `RESEND_API_KEY`                       | Opcional: usar una key de Resend separada    |
| `CONTACT_TO_EMAIL`                     | Igual o distinto al de desarrollo            |

No existe una `service_role` key en el código de la app y no debe introducirse una.

## Verificación post-migración

En el SQL Editor de producción, tras correr el bootstrap:

```sql
select policyname, cmd, roles from pg_policies where tablename = 'scores';
select indexname from pg_indexes where tablename = 'scores';
select grantee, privilege_type from information_schema.role_table_grants
  where table_name = 'scores' and grantee in ('anon','authenticated');
```

Esperado: 2 políticas (`scores_public_select`, `scores_authenticated_insert`); 3 índices (`scores_pkey` + los 2 nuevos); `anon` solo con `SELECT`, `authenticated` con `SELECT` + `INSERT`.

Luego, con `.env.production.local` apuntando a producción:

1. `npm run build && npm run start`, visitar `/api/health/supabase`.
2. Registro con email (debe entrar sin confirmar), login con Google, login con GitHub — los tres vuelven a `/biblioteca` vía `/auth/callback`.
3. Jugar una partida y confirmar que la fila aparece en `public.scores` de producción con `user_id` poblado, y que el leaderboard la muestra.

## Acceso de solo lectura a producción

Además del bootstrap, existe un canal de **solo lectura** a producción para que Claude pueda diagnosticar sin necesidad de que el usuario copie/pegue resultados a mano. No usa el MCP (que solo apunta a dev y no es de solo lectura): usa un rol de Postgres dedicado, `arcade_readonly`, consumido vía el **connection pooler (Supavisor)** de producción.

Tres candados independientes garantizan que sea de solo lectura, aunque alguno falle:

1. **Sin grants de escritura**: `arcade_readonly` solo tiene `USAGE` en `public` y `SELECT` sobre sus tablas. Nada de `auth`, `storage`, `extensions`, ni `INSERT/UPDATE/DELETE/DDL`.
2. **`default_transaction_read_only = on`** a nivel de rol: cualquier intento de escritura falla a nivel de transacción, incluso si un grant futuro se otorgara por error.
3. **Política RLS explícita** (`scores_readonly_select`, solo `SELECT`, `using (true)`): sin ella el rol vería 0 filas pese al grant de tabla, porque las políticas existentes (`scores_public_select`) están acotadas a `anon, authenticated`.

### Cómo activarlo

1. Generar una contraseña fuerte (no reutilizar ninguna otra credencial del proyecto).
2. Pegarla en `supabase/prod-readonly-role.sql` reemplazando `CAMBIAR_ESTA_PASSWORD`, y ejecutar el archivo completo en el **SQL Editor** de producción.
3. Correr el bloque de verificación al final del mismo archivo y confirmar los resultados esperados que documenta.
4. Armar la cadena de conexión con host/proyecto de **Dashboard → Connect → Session pooler** (puerto **5432**, no 6543 — transaction mode no soporta el `SET` de sesión del que depende el candado 2):
   ```
   postgresql://arcade_readonly.<PROJECT_REF>:<PASSWORD>@<POOLER_HOST>:5432/postgres
   ```
5. Guardarla en `.env.local` como `SUPABASE_PROD_READONLY_URL` (nunca con prefijo `NEXT_PUBLIC_`, nunca commiteada — `.env*` ya está en `.gitignore`).

### Rotar o revocar

- Rotar: volver a correr `prod-readonly-role.sql` con una contraseña nueva (el script hace `alter role ... with password` si el rol ya existe) y actualizar `SUPABASE_PROD_READONLY_URL`.
- Revocar del todo:
  ```sql
  drop policy if exists scores_readonly_select on public.scores;
  revoke select on all tables in schema public from arcade_readonly;
  drop role arcade_readonly;
  ```

### Qué sigue prohibido

Esto **no** cambia las reglas de fondo: el MCP de Supabase sigue apuntando solo a dev, no existe (ni debe crearse) una `service_role` key en el código de la app, y ninguna migración ni escritura a producción se aplica desde Claude — eso lo sigue ejecutando el usuario a mano. `arcade_readonly` es estrictamente de lectura sobre `public`.

## Flujo permanente para cambios de esquema futuros

1. Escribir el SQL nuevo, aplicarlo a **desarrollo** vía las herramientas `mcp__supabase__*`.
2. Actualizar `prod-bootstrap.sql` (o agregar un archivo nuevo `NN-descripcion.sql` en esta carpeta) con el cambio.
3. El usuario replica el cambio a mano en producción.
