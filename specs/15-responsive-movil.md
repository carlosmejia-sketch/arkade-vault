# SPEC 15 — Diseño responsivo en pantallas móviles

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (pantallas base), SPEC 02 (home), SPEC 03 (about/contacto), SPEC 14 (controles táctiles del reproductor)
> **Fecha:** 2026-08-14
> **Objetivo:** Eliminar el desbordamiento horizontal y los elementos recortados en pantallas de celular (~360–428px) en las 7 pantallas del sitio y el `Nav` compartido, sin alterar el canvas ni el panel de controles táctiles del reproductor (SPEC 14).

---

## Alcance

**Dentro:**

1. **`Nav` compartido (`components/nav.tsx` + `.av-nav` en `app/globals.css`)**: corregir que `.auth-btn` y `.hamburger` se corten o desborden en anchos ~360–412px. El panel lateral móvil (`.av-mobile-panel`) ya existente se mantiene; se ajusta solo lo necesario para que el nav colapsado no desborde (ej. mover "Iniciar Sesión" dentro del panel hamburguesa, o permitir wrap/achicar el botón).
2. **`/` (home, `components/home.tsx`)**: revisar todas las secciones (hero, grids de actividad, pricing, final) en viewport móvil por desbordamiento horizontal.
3. **`/biblioteca` (`components/library.tsx`)**: catálogo con búsqueda — grid de cards y buscador en móvil.
4. **`/juegos/[id]` (detalle, server component)**: grid de detalle + leaderboard top 10 en móvil.
5. **`/juegos/[id]/jugar` (`components/game-player.tsx`)**: **solo el HUD superior** (`.player-hud`, `.hud-actions`, selector de skins, botones pausa/fin/salir) — corregir que se corten en vez de apilarse. El canvas, el bloque `.crt` y el panel `touch-controls.tsx` de SPEC 14 no se tocan.
6. **`/salon` (`components/hall-of-fame.tsx`)**: tabs y grid top 12 en móvil.
7. **`/acceso` (`components/auth-form.tsx`)**: formulario en móvil.
8. **`/acerca-de` (`components/about.tsx`)**: contenido/contacto en móvil.
9. Fixes tanto en CSS (`app/globals.css`: `flex-wrap`, `clamp()`, ajustar/agregar `@media` en el rango ~360–428px) como en JSX de componentes cuando el CSS no alcance (ej. reordenar elementos, mover un botón a otro contenedor).
10. **Verificación con Playwright**: capturas en 2 viewports típicos (375×667 y 412×915) de las 7 pantallas + estado abierto del panel hamburguesa, confirmando ausencia de scroll horizontal y de elementos recortados.

**Fuera de alcance (para specs futuros):**

- Tablets (~768–834px) y desktop — ya cubiertos por breakpoints existentes, no se auditan en este spec.
- El canvas de juego y el panel `touch-controls.tsx` (SPEC 14) — se reutilizan tal cual, no se modifican.
- Cualquier cambio a `lib/games/*/engine.ts`.
- `app/api/contacto/route.ts` y `app/api/health/supabase/route.ts` — no son pantallas.
- Rediseño visual o de contenido (textos, colores, jerarquía) — solo se ajusta layout/responsividad, no estética nueva.
- Accesibilidad más allá de lo ya existente (`:focus-visible`, `prefers-reduced-motion`) — no se amplía en este spec.

---

## Modelo de datos

Esta feature no introduce datos nuevos (no toca `localStorage`, Supabase, ni tipos compartidos). Es puramente CSS/JSX de layout. Se omite esta sección.

---

## Plan de implementación

1. **Auditoría con Playwright**: capturar las 7 pantallas + panel hamburguesa del `Nav` en dos viewports (375×667 y 412×915), listando cada elemento que desborde o se corte. Esto reemplaza/confirma el diagnóstico ya hecho sobre `.auth-btn`/`.hamburger` y `.hud-actions`.
2. **Fix del `Nav`** (`components/nav.tsx`, `.av-nav` en `globals.css`): resolver el desborde de `.auth-btn` + `.hamburger` en el breakpoint móvil existente (`max-width: 840px`), moviendo "Iniciar Sesión" al panel lateral y/o ajustando `flex-wrap`/tamaños, sin romper el panel `.av-mobile-panel` ya funcional.
3. **Fix del HUD del reproductor** (`components/game-player.tsx`, `.player-hud`/`.hud-actions` en `globals.css`): permitir que el selector de skins y los botones de acción apilen en más de una línea en vez de cortarse, sin tocar `.crt`, el canvas ni `touch-controls.tsx`.
4. **Fix de `home.tsx`**: recorrer cada sección del home en los 2 viewports del paso 1 y corregir los desbordes encontrados.
5. **Fix de `library.tsx`**: grid de catálogo + buscador.
6. **Fix de `/juegos/[id]` (detalle)**: grid de detalle + leaderboard.
7. **Fix de `hall-of-fame.tsx`**: tabs + grid top 12.
8. **Fix de `auth-form.tsx`**: formulario de acceso.
9. **Fix de `about.tsx`**: contenido + contacto.
10. **Verificación final con Playwright**: repetir las capturas del paso 1 en las 7 pantallas + panel hamburguesa, confirmando cero desbordes. Complementar con una pasada manual en un celular real (como en las capturas que compartiste).
11. **Compilación**: `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

- [ ] En viewport 375×667 y 412×915, ninguna de las 7 pantallas (`/`, `/biblioteca`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/acceso`, `/acerca-de`) genera scroll horizontal.
- [ ] El `Nav` (colapsado y con el panel hamburguesa abierto) no muestra elementos cortados ni desbordados en ninguno de los 2 viewports.
- [ ] El HUD del reproductor (`.player-hud`/`.hud-actions`, incluyendo selector de skins y botones pausa/fin/salir) apila en varias líneas en vez de cortarse, en los 4 juegos (asteroides, tetris, arkanoid, snake).
- [ ] El canvas de juego, el bloque `.crt` y el panel `touch-controls.tsx` (SPEC 14) no cambian de comportamiento ni de posición respecto al estado actual.
- [ ] Ningún archivo `lib/games/*/engine.ts` se modifica.
- [ ] Las capturas de Playwright del paso de verificación final (7 pantallas × 2 viewports + panel hamburguesa) no muestran ningún elemento recortado ni fuera del viewport.
- [ ] Verificación manual en un celular real confirma lo mismo que las capturas automatizadas (sin scroll horizontal, sin botones/cajas cortadas).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Decisiones tomadas y descartadas

### Alcance limitado a celulares (~360–428px), tablets fuera de este spec

- **Sí:** el usuario reportó el problema específicamente en celular (capturas a 360×800 aprox.); los breakpoints de tablet/desktop ya existentes (`900px`, `980px`, `1100px`) no fueron señalados como rotos.
- **No:** auditar también tablets en el mismo spec — ampliaría el trabajo sin evidencia de que estén rotas; si aparecen problemas ahí, es un spec propio.

### Se permiten cambios de JSX además de CSS

- **Sí:** algunos desbordes (ej. "Iniciar Sesión" + hamburguesa compitiendo por espacio en el `Nav`) se resuelven mejor moviendo el botón a otro contenedor (el panel lateral) que forzando su tamaño por CSS, que degradaría la usabilidad del botón.
- **No:** restringir a solo CSS — hubiera dejado casos sin una solución limpia, forzando hacks de `clamp()`/font-size agresivos que afectan la legibilidad del tema pixel-art.

### El HUD del reproductor se corrige, pero el canvas y `touch-controls.tsx` no se tocan

- **Sí:** cumple la restricción explícita del usuario de no perder la funcionalidad de juego móvil ya entregada en SPEC 14; el problema reportado está en el HUD (fila de skins), no en el panel táctil ni el canvas.
- **No:** revisar también el canvas/controles táctiles por si tienen desbordes propios — fuera de lo pedido y agrega riesgo de romper SPEC 14 sin necesidad.

### Verificación con Playwright (2 viewports) + pasada manual en celular real

- **Sí:** Playwright permite capturar y comparar consistentemente los 7+1 puntos de verificación sin depender de un dispositivo físico disponible en cada iteración; la pasada manual final confirma que el fix se sostiene fuera del emulador (el propio usuario notó el problema en un celular real, no en DevTools).
- **No:** solo verificación manual — no es reproducible ni auditable como criterio de aceptación; solo Playwright — un emulador de viewport no siempre refleja el comportamiento real de un navegador móvil (mismo argumento que en SPEC 14 sobre `pointer: coarse`).

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                    | Mitigación                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mover "Iniciar Sesión" al panel lateral (`.av-mobile-panel`) podría duplicar o desalinear la lógica de estado activo (`authActive`) ya usada en los links del panel.                                                      | Reutilizar el mismo patrón `className={authActive ? "active" : ""}` que ya usan los demás links del panel, sin lógica nueva.                                                       |
| El HUD de Tetris y Arkanoid tiene casos especiales en `game-player.tsx` (game over a un solo golpe, overlay de pausa dibujado en el canvas) — un cambio de estructura en `.hud-actions` podría interferir con esos casos. | Verificar los 4 juegos (no solo asteroides) en el paso de verificación final, con especial atención a Tetris/Arkanoid.                                                             |
| Ajustar breakpoints existentes (`840px` del nav, `900px`/`980px`/`1100px` de otras secciones) podría alterar el comportamiento ya validado en tablet/desktop si se tocan por error.                                       | Preferir agregar/ajustar reglas dentro de un rango móvil explícito (`max-width: ~480px` o el breakpoint móvil ya existente) en vez de modificar los breakpoints de tablet/desktop. |
| Deuda conocida heredada (no se arregla en este spec): `game.best`/`game.plays` no sincronizados con Supabase; sin `preventDefault()` en teclado físico; `insertScore` falla en silencio.                                  | Aceptado como riesgo conocido, igual que en specs anteriores.                                                                                                                      |
