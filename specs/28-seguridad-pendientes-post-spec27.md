# SPEC 28 — Seguridad: pendientes vivos tras SPEC 27

> **Estado:** Implementado
> **Depende de:** SPEC 06 (leaderboard/RLS scores), SPEC 24 (auth real Supabase), SPEC 25 (seguridad básica), SPEC 26 (protección de ruta de juego), SPEC 27 (auditoría integral anterior)
> **Fecha:** 2026-08-28
> **Objetivo:** Confirmar con acceso real a Supabase y a las dependencias qué hallazgos de SPEC 27
> quedaron cerrados por el commit `a9c8918` y documentar formalmente los que siguen abiertos
> (rate limiting de `/api/contacto`, exposición de `/api/health/supabase`, leaked password
> protection, vulnerabilidades de `npm audit`), sin duplicar lo ya resuelto.

---

## Alcance

**Dentro:**

1. Verificación (solo lectura, vía MCP de Supabase) de que la migración de SPEC 27 se aplicó
   completa en el proyecto real: columna `user_id`, política `scores_authenticated_insert`,
   `CHECK` de longitud en `player_name`.
2. Verificación de que `auth_leaked_password_protection` sigue en WARN — acción pendiente 100%
   manual en el Dashboard, no hay código que escribir.
3. Verificación de que `npm audit --omit=dev` sigue mostrando las mismas 4 vulnerabilidades altas
   (`nanoid`, `postcss`, `sharp` vía `next`) y que el fix sigue fuera del rango declarado.
4. Documentar C3 (rate limiting de `/api/contacto`) y C6 (`/api/health/supabase` público sin
   auth/rate limit) como hallazgos abiertos que sobreviven a SPEC 27 por decisión explícita (fuera
   de alcance de esa spec), con una propuesta de remediación concreta para una futura spec de
   implementación.

**Fuera de alcance:**

- Escribir o aplicar la migración SQL de SPEC 27 — ya está aplicada en el proyecto real (verificado
  en el Paso 1 de esta spec).
- Escribir código de rate limiting o el header de auth de `/api/health/supabase` — se documenta el
  plan, no se implementa.
- Actualizar dependencias (`npm audit fix --force`) — requiere spec de upgrade de Next propia.
- Content-Security-Policy granular — deuda ya conocida desde SPEC 25.

---

## Modelo de datos

No hay cambios de esquema en esta spec — la migración de SPEC 27 ya está aplicada y verificada
(ver Paso 1). Si en el futuro se implementa rate limiting con una tabla de conteo propia (en vez de
un servicio externo tipo Upstash), ese esquema se definirá en la spec de implementación
correspondiente, no aquí.

---

## Plan de implementación

### Paso 1 (verificación, crítica en su momento — hoy confirmada resuelta) — migración de SPEC 27 aplicada

- **Hallazgo previo:** A2/A5/A6 (SPEC 27). SPEC 27 documentó como "Implementado" agregar `user_id`,
  reemplazar `scores_public_insert` y agregar `CHECK` de longitud, pero no había confirmación fresca
  con acceso a Supabase.
- **Verificación de esta corrida (2026-08-28):**
  - `mcp__supabase__list_tables` → `public.scores` tiene columna `user_id uuid` con FK
    `scores_user_id_fkey` → `auth.users(id)`, y `CHECK` `char_length(player_name) >= 1 AND char_length(player_name) <= 20`.
  - `pg_policies` sobre `public.scores` → solo dos políticas: `scores_public_select` (SELECT,
    `anon,authenticated`, `qual=true`) y `scores_authenticated_insert` (INSERT, solo
    `authenticated`, `with_check=(auth.uid() = user_id)`). **No existe** `scores_public_insert` ni
    ninguna política de INSERT para `anon`.
  - `lib/scores.ts:88-100` (`insertScore`) recibe y persiste `user_id`; `components/game-player.tsx:241-253`
    ya no envía un `typedName` libre — el input de "TUS INICIALES" es `readOnly` (línea 234) y usa
    `name = user?.name ?? "INVITADO"` (línea 43), y el botón de guardar está `disabled={!user}`
    (línea 237).
- **Estado:** resuelto. Se corrige el registro (`security-audited.md`) de `en-spec` a `resuelto`.

### Paso 2 (media, abierto) — `/api/contacto` sin rate limiting real

- **Hallazgo:** C3. `app/api/contacto/route.ts` sigue sin ningún control de cuota — cualquier
  cliente puede hacer POST repetido y agotar la cuota mensual de envíos de Resend, o usarlo como
  vector de spam hacia `CONTACT_TO_EMAIL`.
- **Vector:** DoS de cuota sobre un servicio de terceros (Resend), spam al buzón configurado.
- **Severidad:** media.
- **Remediación propuesta (para spec de implementación futura, no de esta):** limitar por IP con
  una ventana simple (ej. `@upstash/ratelimit` + Redis, o un middleware en `proxy.ts` con un mapa en
  memoria de corta vida si no se quiere una dependencia externa) — 5 requests/hora por IP es
  razonable para un formulario de contacto.

### Paso 3 (media, abierto) — `/api/health/supabase` público sin autenticación ni rate limit

- **Hallazgo:** C6. El endpoint ya no expone `error.message` crudo (SPEC 27 lo corrigió), pero
  sigue siendo accesible sin autenticación y sin límite de requests — cualquiera puede usarlo para
  golpear la conexión a Supabase repetidamente o como oráculo de disponibilidad del servicio.
- **Vector:** DoS ligero / reconocimiento de infraestructura (confirma que el proyecto usa Supabase
  y si está caído).
- **Severidad:** media.
- **Remediación propuesta (para spec futura):** restringir por header secreto compartido (ej.
  `X-Health-Check-Token`) si el endpoint es para monitoreo interno, o aplicarle el mismo mecanismo
  de rate limiting del Paso 2.

### Paso 4 (baja, abierto, acción manual) — leaked password protection sigue en WARN

- **Hallazgo:** A9. `mcp__supabase__get_advisors(security)` de esta corrida (2026-08-28) devuelve
  **un único** lint activo: `auth_leaked_password_protection` (WARN). Es el mismo estado que SPEC 27
  documentó el 2026-08-27 — no cambió.
- **Vector:** credential stuffing con contraseñas filtradas conocidas (HaveIBeenPwned).
- **Severidad:** baja.
- **Remediación:** acción 100% manual del usuario en Supabase Dashboard → Authentication →
  Policies → activar "Leaked password protection". No hay código ni migración que aplicar. Se
  reitera porque SPEC 25 ya documentó (incorrectamente) que esto estaba resuelto — no repetir el
  mismo error de asumir sin verificar.

### Paso 5 (alta, abierto, sin acción de código posible dentro del rango declarado) — `npm audit` sigue con 4 altas

- **Hallazgo:** D7. `npm audit --omit=dev` de esta corrida (2026-08-28) reporta las mismas 4
  vulnerabilidades altas que SPEC 27: `nanoid <3.3.18` (bucle infinito con `size=0`), `postcss
<=8.5.22` (XSS en stringify, path traversal vía `sourceMappingURL`, 3 avisos), y `sharp <0.35.0`
  (CVEs de `libvips`: 2026-33327, 2026-33328, 2026-35590, 2026-35591) — estas dos últimas arrastradas
  por `next` en el rango declarado en `package.json`.
- **Vector:** XSS en salida de PostCSS, divulgación de archivos arbitrarios vía `sourceMappingURL`,
  vulnerabilidades de procesamiento de imágenes en `sharp` (usado por `next/image`).
- **Severidad:** alta.
- **Remediación:** `npm audit fix --force` instala `next@16.3.3`, fuera del rango declarado en
  `package.json` — requiere una spec de upgrade de Next propia con su plan de pruebas (build, los 5
  juegos, auth, rutas protegidas). No se ejecuta en esta spec.

---

## Criterios de aceptación

- [x] Confirmado con `list_tables`/`pg_policies` (solo lectura) que la migración de SPEC 27 está
      aplicada en el proyecto real: `user_id`, `scores_authenticated_insert`, `CHECK` de longitud.
- [x] Confirmado que no existe ninguna política de INSERT para `anon` sobre `public.scores`.
- [x] Confirmado con `get_advisors(security)` que `auth_leaked_password_protection` sigue en WARN
      (pendiente de acción manual, no de código).
- [x] Confirmado con `npm audit --omit=dev` que las 4 vulnerabilidades altas siguen presentes y
      sin fix dentro del rango de `package.json`.
- [ ] (Pendiente para spec futura) Rate limiting implementado en `/api/contacto`.
- [ ] (Pendiente para spec futura) `/api/health/supabase` restringido o con rate limit.
- [ ] (Pendiente, acción del usuario) Leaked password protection activado en el Dashboard.
- [ ] (Pendiente, spec de upgrade) Dependencias con vulnerabilidad alta actualizadas.

---

## Decisiones tomadas y descartadas

- **Sí:** verificar con acceso real a Supabase en vez de confiar en el estado "Implementado" que
  SPEC 27 se auto-asignó — es exactamente el patrón de error que ya ocurrió una vez con
  `auth_leaked_password_protection` en SPEC 25 (documentado como resuelto sin re-verificar).
- **No:** volver a escribir A2/A5/A6/B3/B7/C1/C2/C4/C5 como hallazgos nuevos — ya están resueltos y
  verificados; duplicarlos en una spec nueva iría contra la disciplina de "no repetir el análisis
  desde cero" del propio agente.
- **No:** implementar rate limiting o el guardado del header de auth de `/api/health/supabase` en
  esta spec — decidir la infraestructura (Upstash vs. in-memory vs. Vercel Edge Config) merece su
  propia spec con su propio plan de pruebas, no una línea suelta dentro de una auditoría.
- **Sí:** mantener C3 y D7 como hallazgos abiertos con severidad alta/media pese a que ya se
  documentaron en SPEC 27 — su justificación de "fuera de alcance" sigue vigente, pero eso no los
  convierte en resueltos ni en riesgo aceptado formalmente (nunca hubo una decisión explícita del
  usuario de aceptar el riesgo de `npm audit`, solo una decisión de no arreglarlo en esa spec).

---

## Riesgos identificados

| Riesgo                                                                                                           | Mitigación                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm audit fix --force` podría romper el build al saltar a `next@16.3.3`                                         | No ejecutar en esta spec; requiere spec de upgrade con pruebas de build y de los 5 motores de juego.               |
| Rate limiting mal implementado (ventana demasiado agresiva) podría bloquear tráfico legítimo de `/api/contacto`  | Documentado como propuesta, no implementado; la spec futura debe definir el umbral con datos reales de uso.        |
| Restringir `/api/health/supabase` con un header secreto requiere coordinarlo con quien monitorea el health check | Documentado como propuesta; la spec futura debe confirmar quién/qué consume este endpoint hoy antes de bloquearlo. |

---

## Qué **no** está en esta spec

- Implementación de rate limiting real para `/api/contacto` o `/api/health/supabase`.
- Restricción de acceso al endpoint de health check.
- Activación de "leaked password protection" — acción manual del usuario en el Dashboard.
- Actualización de dependencias con vulnerabilidad alta (`next`, `postcss`, `sharp`, `nanoid`).
- Content-Security-Policy granular.
- Cualquier cambio de código de la aplicación — esta spec es puramente de verificación y
  documentación de lo pendiente.
