# SPEC 03 — About (Acerca de + Contacto)

> **Estado:** Implementado
> **Depende de:** SPEC 02 (Home landing)
> **Fecha:** 2026-07-31
> **Objetivo:** Portar la pantalla About + Contacto de `references/templates/home-about/about.jsx` a `/acerca-de`, agregando el enlace "Acerca de" al Nav y conectando el formulario de contacto a un envío real de correo vía Resend.

---

## Alcance

**Dentro:**

1. **Página About en `/acerca-de`**: hero (`about-hero`) con kicker "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión y fila de 3 highlights (HEART/BROWSER/PLANT), igual al template.
2. **Divisor decorativo** (`about-divider`, 24 pixels parpadeantes) entre About y Contacto, con animación `.reveal`.
3. **Sección de Contacto** (`about-contact`): intro (kicker, título, subtítulo, 3 tips con LED) + formulario (`contact-form`) con campos NOMBRE, CORREO ELECTRÓNICO, MENSAJE.
4. **Envío real del formulario vía Resend**: al enviar, se hace una petición a un route handler propio (`app/api/contacto/route.ts`) que usa el SDK de `resend` para enviar un correo a `CONTACT_TO_EMAIL`, con `reply-to` igual al correo ingresado en el formulario.
5. **Estado de éxito**: terminal simulada (`terminal-success`) idéntica al template, mostrada solo cuando el envío a Resend responde exitosamente.
6. **Estado de error** (nuevo, no está en el template): si el route handler responde error o la petición falla, se muestra un bloque de error breve en el formulario (mismo `contact-form`, sin rediseñar), permitiendo reintentar sin perder los datos escritos.
7. **Validación de campos vacíos**: igual al template — si NOMBRE, CORREO o MENSAJE están vacíos, se dispara el shake (`contact-form.shake`) y no se envía la petición. Sin validación adicional de formato (queda al `type="email"` nativo del input).
8. **Nav**: se agrega el enlace "Acerca de" (→ `/acerca-de`) entre "Salón de la Fama" e "Iniciar Sesión", en el menú desktop y en el panel móvil, con su lógica de `active` (`pathname === "/acerca-de"`).
9. **CSS**: agregar a `app/globals.css` la sección `ABOUT PAGE` de `references/templates/home-about/styles.css` (líneas 1071–1150), incluyendo sus keyframes `pxblink` y `shake` (no existen aún pese a lo indicado en spec 02) y `.btn.press:active` (tampoco existe aún). Se reutilizan `.reveal`, `.fade-in`, `.field`, `.divider` ya existentes.
10. **Dependencia `resend`**: agregar a `package.json` y usarla solo dentro del route handler.
11. **Variables de entorno**: `.env.local.example` en la raíz del proyecto con `RESEND_API_KEY` y `CONTACT_TO_EMAIL` como placeholders (sin valores reales), migrando el contenido que ya existía en `specs/.env.template`. El remitente ("from") usa `onboarding@resend.dev` hardcodeado en el route handler (dominio de pruebas de Resend, sin verificación DNS).

**Fuera de alcance (para specs futuras):**

- Verificar un dominio propio en Resend y usarlo como remitente — mientras tanto se usa `onboarding@resend.dev`.
- Enviar un correo de confirmación al jugador que llenó el formulario (solo se notifica al equipo, igual que el template).
- Rate limiting o protección anti-spam del endpoint.
- Persistencia de los mensajes de contacto en base de datos — el correo es el único registro.
- Validación de formato de email en el servidor (queda para otra spec si se necesita).
- La sección `GAMEPAD` de `styles.css` (ya excluida desde spec 02).
- Pruebas automatizadas.

---

## Modelo de datos

Esta feature no introduce entidades persistentes ni almacenamiento nuevo. Solo define la forma del payload que viaja del formulario al route handler:

```ts
// Payload enviado por el formulario a POST /api/contacto
type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

// Respuesta del route handler
type ContactResponse =
  | { ok: true }
  | { ok: false; error: string };
```

Convenciones:

- `ContactPayload` no se tipa en un archivo compartido — vive inline en `components/about.tsx` y en `app/api/contacto/route.ts`, igual que otros payloads locales del proyecto (p. ej. el estado del formulario en `auth-form.tsx`).
- El correo enviado a Resend usa `CONTACT_TO_EMAIL` como destinatario fijo, `onboarding@resend.dev` como remitente, `replyTo: email` (el del formulario), y `subject`/`text` construidos a partir de `name` y `message`.

---

## Plan de implementación

Cada paso deja el proyecto compilando y navegable.

### Paso 1 — Dependencia y variables de entorno

Agregar `resend` a `package.json` (`npm install resend`). Mover `specs/.env.template` a `.env.local.example` en la raíz del proyecto (mismo contenido, eliminando la copia en `specs/`):

```
RESEND_API_KEY=
CONTACT_TO_EMAIL=
```

Sin código todavía que las use. `npm run build` sigue pasando.

### Paso 2 — CSS: portar la sección `ABOUT PAGE`

Agregar a `app/globals.css` las reglas de `references/templates/home-about/styles.css` líneas 1071–1150 (`about-hero`, `about-title`, `about-mission`, `highlight-row`, `.highlight` y variantes, `about-divider`, `.div-bar`, `.div-pixels`, `about-contact`, `.contact-grid`, `.contact-intro`, `.contact-title`, `.contact-sub`, `.contact-tips`, `.contact-form` y su `.shake`, `.terminal-success` y sub-clases, `.btn.press:active`), más los keyframes `pxblink` y `shake`. Sin componentes que las usen todavía, sin cambio visual. `npm run build` sigue pasando.

### Paso 3 — `app/api/contacto/route.ts`

Route handler `POST` que recibe `{ name, email, message }`, valida que ninguno esté vacío (400 si falta alguno), instancia `Resend` con `process.env.RESEND_API_KEY`, envía el correo a `process.env.CONTACT_TO_EMAIL` con `from: "onboarding@resend.dev"`, `replyTo: email`, `subject` y `text` armados con `name`/`message`, y responde `{ ok: true }` o `{ ok: false, error }` (500) si Resend falla. Probar manualmente con `curl` o Postman antes de conectar la UI.

### Paso 4 — `components/about.tsx`

Componente cliente (`"use client"`) que porta `about.jsx` completo: hero, highlights, `HighlightIcon`, divisor, sección de contacto y formulario. El `onSubmit` ahora hace `fetch("/api/contacto", { method: "POST", body: JSON.stringify(form) })`; en éxito setea `sent` (muestra `terminal-success` igual al template); en error setea un nuevo estado `error` (string) que renderiza un bloque breve de error dentro de `contact-form`, sin tocar el resto del markup. Monta `<RevealObserver />` una vez (reutilizado de `components/reveal-observer.tsx`, spec 02) para animar `.reveal`.

### Paso 5 — `app/acerca-de/page.tsx`

Página de servidor mínima que renderiza `<About />`.

### Paso 6 — Nav

En `components/nav.tsx`: agregar `aboutActive = pathname === "/acerca-de"` y el `<Link>` "Acerca de" → `/acerca-de` entre "Salón de la Fama" e "Iniciar Sesión", replicado en el panel móvil.

### Paso 7 — Verificación

`npm run lint`, `npx tsc --noEmit`, `npm run build` (confirmar que prerenderiza `/acerca-de`). Con `RESEND_API_KEY` real en `.env.local`, probar el formulario en `npm run dev`: envío exitoso muestra la terminal, envío con `RESEND_API_KEY` inválida muestra el bloque de error. Confirmar shake en campos vacíos y que `prefers-reduced-motion` sigue neutralizando las animaciones nuevas sin cambios adicionales al bloque de accesibilidad existente.

---

## Criterios de aceptación

### Rutas y compilación

- [ ] `npm run build` termina sin errores y prerenderiza `/acerca-de`.
- [ ] `npx tsc --noEmit` y `npm run lint` pasan sin errores ni advertencias nuevas.
- [ ] Ninguna advertencia de hidratación en la consola del navegador al cargar `/acerca-de`.

### Nav

- [ ] Aparece el enlace "Acerca de" entre "Salón de la Fama" e "Iniciar Sesión", en desktop y en el panel móvil.
- [ ] Estando en `/acerca-de`, el enlace "Acerca de" tiene la clase `active`; ningún otro enlace la tiene a la vez.

### Página About (`/acerca-de`)

- [ ] El hero muestra el kicker "▸ ACERCA DE", el título "ACERCA DE ARCADE VAULT", el párrafo de misión y los 3 highlights (HEART/BROWSER/PLANT) con sus colores (magenta, cyan, green).
- [ ] El divisor de 24 pixels aparece entre About y Contacto, con la animación `.reveal` al hacer scroll hasta él.
- [ ] La sección de contacto muestra el kicker, título, subtítulo y los 3 tips con LED (verde, amarillo, magenta).

### Formulario de contacto

- [ ] Enviar el formulario con algún campo vacío dispara el shake (`contact-form.shake`) y no hace ninguna petición de red.
- [ ] Enviar el formulario completo con `RESEND_API_KEY` válida hace una petición `POST` a `/api/contacto`, y al recibir éxito reemplaza el formulario por la terminal `terminal-success` con el nombre del jugador en mayúsculas.
- [ ] El botón "ENVIAR OTRO MENSAJE" dentro de la terminal de éxito vuelve a mostrar el formulario vacío.
- [ ] Si `/api/contacto` responde error (o la petición de red falla), se muestra un bloque de error dentro de `contact-form` sin perder los datos ya escritos, y el usuario puede reintentar el envío.
- [ ] El correo recibido en `CONTACT_TO_EMAIL` tiene como `reply-to` el correo ingresado en el formulario.

### Fidelidad al template y accesibilidad

- [ ] Comparado lado a lado con `references/templates/home-about/arcade-vault-standalone.html` (pantalla About), coincide en composición, colores, tipografías y animaciones.
- [ ] `app/globals.css` solo gana la sección `ABOUT PAGE` (líneas 1071–1150 del template) y sus keyframes `pxblink`/`shake` — nada de `GAMEPAD` ni cambios a tokens existentes.
- [ ] Con `prefers-reduced-motion: reduce` activo, el parpadeo de los pixels del divisor y el `.reveal` no muestran animación perceptible, sin tocar el bloque de accesibilidad ya existente en `globals.css`.

---

## Decisiones tomadas y descartadas

### Ruta `/acerca-de` en vez de `/about`

- **Sí:** sigue la convención en español de las demás rutas del proyecto (`/biblioteca`, `/salon`, `/acceso`). Decisión explícita del usuario.
- **No:** `/about`, aunque coincide con el nombre del archivo del template — rompería la consistencia de URLs en español ya establecida.

### Envío real vía Resend con dominio de pruebas `onboarding@resend.dev`

- **Sí:** permite implementar el envío funcional sin bloquear la spec en verificar DNS de un dominio propio. Decisión explícita del usuario.
- **No:** esperar a tener un dominio verificado. Se deja como trabajo futuro fuera de alcance.

### `CONTACT_TO_EMAIL` como variable de entorno sin valor real en la spec

- **Sí:** el destinatario real de los mensajes se define en `.env.local` (no versionado), no hardcodeado ni decidido en este documento. Decisión explícita del usuario.
- **No:** pedir la dirección ahora y hardcodearla o escribirla en la spec — sería un dato operativo, no una decisión de diseño.

### `.env.local.example` en la raíz, migrando `specs/.env.template`

- **Sí:** ese archivo ya existía en `specs/` con el contenido correcto (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`); se mueve a la raíz con el nombre convencional de Next.js para plantillas de entorno, en vez de crear un archivo nuevo desde cero. Decisión explícita del usuario.
- **No:** dejarlo en `specs/` y crear un archivo aparte en la raíz — duplicaría la fuente de verdad de las variables de entorno.

### Estado de error nuevo, no presente en el template

- **Sí:** el template solo modela el camino feliz (siempre `setSent`). Un fallo real de Resend sin feedback dejaría al usuario creyendo que su mensaje se envió. Decisión explícita del usuario, priorizando UX real sobre fidelidad 100% al mockup.
- **No:** tratar cualquier respuesta como éxito (fiel al template pero engañoso), o rediseñar todo el formulario para el caso de error — el bloque de error se mantiene mínimo y dentro de `contact-form` existente.

### Sin validación adicional de formato de email en servidor

- **Sí:** el `type="email"` del input ya da validación de formato en navegadores modernos; agregar otra capa en el route handler es validación redundante para el alcance actual. Decisión explícita del usuario.
- **No:** validar formato con regex en el servidor — se deja como mejora futura si se detecta abuso del endpoint.

### `reply-to` = correo del formulario

- **Sí:** permite al equipo responder directo al jugador desde su cliente de correo, sin exponer que el remitente real es `onboarding@resend.dev`. Decisión explícita del usuario.
- **No:** omitir `reply-to` — obligaría a copiar el correo del jugador manualmente del cuerpo del mensaje.

### Enlace "Acerca de" se agrega al Nav en esta misma spec

- **Sí:** `nav.jsx` ya lo incluye; spec 02 lo dejó pendiente explícitamente para "cuando se porte About". Decisión explícita del usuario.
- **No:** dejarlo fuera y publicar `/acerca-de` sin enlace visible — dejaría la página huérfana de navegación.

### `about.tsx` como componente cliente completo (no dividido en servidor + isla cliente)

- **Sí:** a diferencia de `home.tsx` (spec 02), aquí casi todo el contenido depende de estado (formulario) — dividirlo en servidor + cliente solo para el hero estático añadiría complejidad sin beneficio real de prerenderizado.
- **No:** replicar el patrón de `home.tsx` con secciones de servidor separadas. El hero y highlights de About no tienen suficiente peso estático para justificar la división.

---

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| **`RESEND_API_KEY` ausente o inválida en producción.** El formulario fallaría silenciosamente para todos los usuarios sin que nadie lo note hasta revisar logs. | El estado de error visible en la UI (paso 4) hace evidente el fallo a cada usuario que lo sufre, en vez de fallar en silencio como haría el template original. |
| **`onboarding@resend.dev` tiene límites de envío/reputación al ser un dominio compartido de pruebas.** Podría bloquear o marcar como spam correos en volumen. | Aceptado explícitamente para esta spec; migrar a dominio propio verificado queda fuera de alcance y documentado como pendiente. |
| **Sin rate limiting, el endpoint `/api/contacto` puede recibir abuso (spam o flood).** Cada envío consume cuota de Resend. | Aceptado explícitamente para esta spec; se documenta como fuera de alcance, a resolver en spec futura si se detecta abuso real. |
| **CSS duplicado o insuficiente.** Copiar de más o de menos de las líneas 1071–1150 de `styles.css` puede inflar `globals.css` o dejar estilos rotos (p. ej. omitir `.btn.press:active` rompería el feedback visual del botón enviar). | El paso 2 delimita exactamente el rango de líneas y la lista de clases/keyframes a portar; el criterio de aceptación de "Fidelidad al template" lo verifica explícitamente. |

---

## Qué **no** está en esta spec

- Verificar un dominio propio en Resend (se usa `onboarding@resend.dev`).
- Correo de confirmación al jugador.
- Rate limiting o anti-spam del endpoint.
- Persistencia de mensajes en base de datos.
- Validación de formato de email en servidor.
- Pruebas automatizadas.

Cada uno de estos, si se necesita, va en su propia spec.
