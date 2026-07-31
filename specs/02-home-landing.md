# SPEC 02 — Home (landing de marketing)

> **Estado:** Aprobado
> **Depende de:** 01-mvp-visual-screens
> **Fecha:** 2026-07-31
> **Objetivo:** Portar la pantalla Home de `references/templates/home-about/` a `/`, moviendo la Biblioteca actual a `/biblioteca` y actualizando el chrome y los links internos en consecuencia.

---

## Alcance

**Dentro:**

1. **Home en `/`**: hero con silueta pixel flotante decorativa, título de 3 líneas, subtítulo, dos CTAs (EXPLORAR JUEGOS → `/biblioteca`, CREAR CUENTA → `/acceso`), indicador de scroll.
2. **Sección "¿Por qué Arcade Vault?"**: grid de 4 tarjetas de feature (ícono pixel + título + descripción), con animación `.reveal` al hacer scroll.
3. **Sección "Juegos disponibles ahora"**: `MiniCard` (sin tilt 3D) de los primeros 6 `GAMES` de `lib/games.ts`, cada una navega a `/juegos/{id}`; botón "VER TODOS LOS JUEGOS →" a `/biblioteca`.
4. **Sección de estadísticas**: 3 bloques (`12+ JUEGOS`, `MILES DE PARTIDAS`, `GLOBAL RANKING`), texto estático igual al template.
5. **Sección "Actividad en vivo"**: ticker de últimas puntuaciones + top 5 jugadores del día, con datos hardcodeados literales del template (no conectados a `lib/scores.ts` ni a `GAMES` reales); botón "VER SALÓN →" a `/salon`.
6. **Sección de precios**: tarjeta única "JUGADOR VAULT $0/SIEMPRE" con lista de beneficios y botón "EMPEZAR GRATIS →" a `/acceso`, más 3 preguntas frecuentes.
7. **CTA final**: título + botón "INSERTAR MONEDA →" a `/biblioteca`.
8. **Mover la Biblioteca actual a `/biblioteca`**: el contenido íntegro de `app/page.tsx` (hero `.av-hero` + `<Library />`) pasa a `app/biblioteca/page.tsx` sin cambios de comportamiento.
9. **Actualizar Nav**: agregar enlace "Inicio" (→ `/`) antes de "Biblioteca" (→ `/biblioteca`); el logo pasa a apuntar a `/`; la lógica de estado activo separa Home de Biblioteca (Biblioteca activa en `/biblioteca` y en todo `/juegos/*`).
10. **Actualizar todos los links internos que hoy significan "volver/ir a la Biblioteca"** para que apunten a `/biblioteca` en vez de `/`: `game-player.tsx` (VOLVER AL VAULT), `auth-form.tsx` (redirects tras login/invitado), `app/salon/page.tsx` y `app/juegos/[id]/page.tsx` (VOLVER AL VAULT).
11. **CSS**: agregar a `app/globals.css` solo las secciones `HOME PAGE`, `ACTIVITY` y `PRICING` de `references/templates/home-about/styles.css` (con sus keyframes: `bounce`, `float`, `tickin`, `pulse-led`, `pxblink`, `shake`), reutilizando `.field`, `.reveal`, `.fade-in`, `.slide-in`, `.btn`, `.card`-adjacent tokens ya existentes.

**Fuera de alcance (para specs futuras):**

- La pantalla **About** (`about.jsx`), incluido el enlace "Acerca de" en el Nav — spec aparte.
- La sección `GAMEPAD` de `styles.css` (líneas 1151–1600): no la usa ningún componente actual, no se porta.
- Conectar el ticker de actividad y el top de jugadores a datos reales (`lib/scores.ts` o `GAMES`).
- Cualquier cambio a la paleta, tipografías o tokens de diseño.
- Pruebas automatizadas.

---

## Modelo de datos

No hay modelo de datos nuevo. El Home reutiliza `Game` y `GAMES` de `lib/games.ts` (spec 01), tomando `GAMES.slice(0, 6)` para la vitrina. Los datos del ticker de actividad y del top de jugadores son arreglos literales hardcodeados dentro del propio componente (copiados tal cual del template), sin tipo ni archivo compartido — igual que la arena CRT decorativa de spec 01.

---

## Plan de implementación

Cada paso deja el proyecto compilando y navegable.

### Paso 1 — CSS: portar las secciones que Home necesita

Agregar a `app/globals.css` las secciones `HOME PAGE`, `ACTIVITY` y `PRICING` de `references/templates/home-about/styles.css`, junto con sus keyframes (`bounce`, `float`, `tickin`, `pulse-led`, `pxblink`, `shake`). Sin componentes que las usen todavía, así que no hay cambio visual. `npm run build` debe seguir pasando.

### Paso 2 — `components/reveal-observer.tsx`

Componente cliente (`"use client"`) sin salida visual (`return null`): en un `useEffect` monta el mismo `IntersectionObserver` del template sobre `document.querySelectorAll(".reveal")`, agregando `.in` al entrar en viewport. Reutilizable para futuras pantallas (p. ej. About).

### Paso 3 — `components/home.tsx`

Componente de servidor que arma las 7 secciones del Home (hero, why, juegos, stats, actividad, precios, CTA final), espejando `home.jsx`: `FloatingSilhouettes` y `FeatureIcon` como funciones locales, `MiniCard` local envuelto en `<Link href={`/juegos/${game.id}`}>` (sin tilt, sin `onClick`, por eso no necesita ser cliente). Importa `GAMES` de `lib/games.ts` y toma `GAMES.slice(0, 6)`. Los datos del ticker y del top de jugadores quedan como arreglos literales dentro del archivo. Monta `<RevealObserver />` una vez. Todos los CTAs son `<Link>`: `/biblioteca`, `/acceso`, `/salon` según corresponda.

### Paso 4 — `app/page.tsx`

Se reemplaza por completo: solo renderiza `<Home />`. Deja de ser dueño del hero `.av-hero` y de `<Library />`.

### Paso 5 — `app/biblioteca/page.tsx`

Se crea moviendo el contenido íntegro que tenía `app/page.tsx` antes del paso 4 (hero `.av-hero` + `<Library />`), sin cambios de comportamiento.

### Paso 6 — Nav

En `components/nav.tsx`: el logo pasa a `href="/"`; se agrega el enlace "Inicio" (`href="/"`) antes de "Biblioteca"; "Biblioteca" pasa a `href="/biblioteca"`. La lógica de activo cambia a `homeActive = pathname === "/"` y `libraryActive = pathname === "/biblioteca" || pathname.startsWith("/juegos")`. Se replica en el panel móvil.

### Paso 7 — Links internos que hoy significan "ir a la Biblioteca"

Actualizar a `/biblioteca`:
- `components/game-player.tsx`: botón VOLVER AL VAULT (`router.push("/")` → `router.push("/biblioteca")`).
- `components/auth-form.tsx`: los dos `router.push("/")` tras login/invitado.
- `app/salon/page.tsx`: `<Link href="/">`.
- `app/juegos/[id]/page.tsx`: `<Link href="/">` (VOLVER AL VAULT).

### Paso 8 — Verificación

`npm run lint`, `npx tsc --noEmit`, `npm run build` (confirmar que prerenderiza `/` y `/biblioteca`), y recorrer ambas rutas con `npm run dev` comparando contra `references/templates/home-about/arcade-vault-standalone.html`. Confirmar ausencia de advertencias de hidratación y que el `prefers-reduced-motion` existente sigue neutralizando las animaciones nuevas sin cambios adicionales.

---

## Criterios de aceptación

### Rutas y compilación

- [ ] `npm run build` termina sin errores y prerenderiza `/` y `/biblioteca`.
- [ ] `npx tsc --noEmit` y `npm run lint` pasan sin errores ni advertencias nuevas.
- [ ] Ninguna advertencia de hidratación en la consola del navegador al cargar `/` o `/biblioteca`.

### Nav

- [ ] El logo lleva a `/`.
- [ ] Aparece el enlace "Inicio" antes de "Biblioteca"; "Inicio" apunta a `/` y "Biblioteca" a `/biblioteca`.
- [ ] Estando en `/`, "Inicio" tiene la clase `active`. Estando en `/biblioteca` o en cualquier `/juegos/*`, la tiene "Biblioteca". Nunca ambos a la vez.
- [ ] El comportamiento se replica igual en el panel móvil (hamburguesa).

### Home (`/`)

- [ ] El hero muestra las 8 siluetas pixel flotantes, el título de 3 líneas con degradados, el subtítulo y los dos CTAs: "EXPLORAR JUEGOS" → `/biblioteca`, "CREAR CUENTA" → `/acceso`.
- [ ] La sección "¿POR QUÉ ARCADE VAULT?" muestra las 4 tarjetas de feature (cyan, amarillo, magenta, verde) con ícono, título y descripción; entran con la animación `.reveal` al hacer scroll hasta ellas.
- [ ] La sección "JUEGOS DISPONIBLES AHORA" muestra exactamente los primeros 6 juegos de `GAMES` (mismo orden que `lib/games.ts`), cada tarjeta con portada, título y categoría; al hacer click en cualquiera navega a `/juegos/{id}`. El botón "VER TODOS LOS JUEGOS →" navega a `/biblioteca`.
- [ ] La sección de estadísticas muestra los 3 bloques (`12+ JUEGOS`, `MILES DE PARTIDAS`, `GLOBAL RANKING`) con sus subtítulos.
- [ ] "ACTIVIDAD EN VIVO" muestra el ticker de 7 filas y el top 5 de jugadores (con el primer puesto destacado en dorado), datos idénticos al template. El botón "VER SALÓN →" navega a `/salon`.
- [ ] "PRECIOS" muestra la tarjeta "$0 / SIEMPRE" con las 6 viñetas y las 3 preguntas frecuentes; "EMPEZAR GRATIS →" navega a `/acceso`.
- [ ] El CTA final "INSERTAR MONEDA →" navega a `/biblioteca`.
- [ ] Todas las secciones marcadas `.reveal` (why, actividad, precios, CTA final) aparecen con la animación de scroll la primera vez que entran en viewport, y no se repite al volver a hacer scroll sobre ellas.

### Biblioteca (`/biblioteca`)

- [ ] El hero (`.av-hero`, `.flicker`, `.blink`) y el `<Library />` se comportan exactamente igual que antes de mover el archivo (buscador, chips, grid de 8 tarjetas, tilt 3D, estado vacío), sin regresiones respecto a los criterios ya verificados en spec 01.

### Links internos actualizados

- [ ] En el Reproductor, "VOLVER AL VAULT" navega a `/biblioteca`.
- [ ] En Acceso, enviar el formulario (con o sin datos) y "JUGAR COMO INVITADO" redirigen a `/biblioteca`.
- [ ] En Salón de la Fama y en Detalle, el botón/enlace que antes llevaba a `/` ahora lleva a `/biblioteca`.

### Fidelidad al template y accesibilidad

- [ ] Comparado lado a lado con `references/templates/home-about/arcade-vault-standalone.html`, el Home coincide en composición, colores, tipografías y animaciones.
- [ ] `app/globals.css` solo gana las secciones `HOME PAGE`, `ACTIVITY` y `PRICING` (y sus keyframes) — nada de `GAMEPAD` ni cambios a tokens existentes.
- [ ] Con `prefers-reduced-motion: reduce` activo, las siluetas flotantes, el ticker, el pulso del LED "EN VIVO" y el `.reveal` no muestran animación perceptible, sin tocar el bloque de accesibilidad ya existente en `globals.css`.

---

## Decisiones tomadas y descartadas

### Home pasa a "/", Biblioteca se mueve a "/biblioteca"

- **Sí:** replica la separación que ya trae `nav.jsx` del template (enlaces "Inicio" y "Biblioteca" distintos). "/" pasa a significar la landing de marketing.
- **No:** dejar la Biblioteca en "/" y meter el Home en otra ruta. Habría dejado el Nav con "Inicio" apuntando a una URL secundaria, al revés de cómo lo diseña el template.

### About queda fuera de esta spec

- **Sí:** solo se porta Home. El enlace "Acerca de" del Nav no se agrega todavía.
- **No:** portar About ahora o dejar un link roto/placeholder a una página vacía. Decisión explícita del usuario al iniciar esta spec.

### Actividad en vivo con datos literales del template

- **Sí:** el ticker y el top de jugadores son arreglos hardcodeados, iguales al template, no conectados a `lib/scores.ts` ni a `GAMES` reales.
- **No:** generarlos con `seededScores()` o derivarlos de `GAMES`. El template no define ninguna regla de selección para eso, y hacerlo ahora sería inventar lógica de producto fuera de alcance — mismo criterio que la arena CRT decorativa de spec 01.

### Sección GAMEPAD de `styles.css` no se porta

- **Sí:** ninguna pantalla del proyecto (ni Home) usa esas clases; se documenta como CSS sobrante del template, no como parte de esta spec.
- **No:** copiarla "por si acaso". Sería CSS muerto sin consumidor, contrario a la convención del proyecto de no anticipar necesidades futuras.

### Sección de precios sí se porta

- **Sí:** el plan mostrado es `$0 / SIEMPRE`, refuerza el mensaje "gratis" ya establecido en spec 01, no introduce ningún muro de pago real.
- **No:** omitirla. Habría dejado el Home con una sección menos que el template sin ninguna razón funcional.

### `MiniCard` sin tilt 3D, envuelta en `<Link>` en vez de `onClick` + `router.push`

- **Sí:** el template no le da tilt 3D al mini-card del Home (a diferencia de `GameCard` en Biblioteca), y al no tener un botón anidado dentro (a diferencia de `GameCard`, que sí tiene el botón JUGAR), puede envolverse entera en un `<Link>` real — más simple y accesible que replicar el patrón de div + onClick.
- **No:** agregarle el mismo tilt que `GameCard` o usar `onClick` con `useRouter()`. Ninguna de las dos está en el template ni fue pedida.

### `reveal-observer.tsx` como componente cliente reusable, sin estado ni salida visual

- **Sí:** aísla el único fragmento verdaderamente interactivo del Home (el `IntersectionObserver` de `.reveal`) en un componente mínimo, dejando `components/home.tsx` como servidor. Queda disponible para la futura spec de About, que usa el mismo patrón.
- **No:** marcar `components/home.tsx` completo como `"use client"`. Perdería el prerenderizado de todo el contenido estático del Home sin necesidad.

### Todos los links que hoy significan "ir/volver a la Biblioteca" apuntan a `/biblioteca`

- **Sí:** Reproductor, Acceso, Salón y Detalle se actualizan explícitamente (paso 7 del plan).
- **No:** dejar algunos apuntando a "/" por descuido. Rompería la navegación real: "/" ya no es la Biblioteca.

---

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| **Link olvidado apuntando a "/".** Al mover la Biblioteca, cualquier `href="/"` o `router.push("/")` que quedara sin actualizar llevaría silenciosamente al Home en vez de a la Biblioteca. | El paso 7 del plan enumera explícitamente los 4 archivos a cambiar; el criterio de aceptación de "Links internos actualizados" los verifica uno por uno. |
| **Desajuste entre el Nav y la ruta real.** Si `homeActive`/`libraryActive` quedan mal calculados, ambos enlaces (o ninguno) podrían marcarse `active` a la vez. | Criterio de aceptación explícito: "Nunca ambos a la vez", verificado en `/`, `/biblioteca` y `/juegos/*`. |
| **Deriva silenciosa del orden de `GAMES`.** La vitrina del Home depende de `GAMES.slice(0, 6)`; reordenar `lib/games.ts` en el futuro cambia el Home sin que nadie lo note. | Aceptado para esta spec — el criterio de aceptación fija "mismo orden que `lib/games.ts`" como comportamiento esperado, no un bug. |
| **CSS muerto o duplicado.** Copiar de más de `styles.css` (p. ej. arrastrar `GAMEPAD` sin querer) infla `globals.css` sin consumidor. | El paso 1 delimita exactamente las 3 secciones a copiar; el criterio de aceptación de "Fidelidad al template" lo verifica explícitamente. |
