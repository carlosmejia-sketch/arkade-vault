@AGENTS.md

# CLAUDE.md

Este archivo brinda orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Idioma

**Todo el contenido de este proyecto se maneja en español**: documentación, comentarios, mensajes de commit, textos de UI y las respuestas al usuario. Cualquier actualización futura a este archivo también debe hacerse en español.

## Proyecto

Arcade Vault — plataforma para jugar online y competir por puntaje (ver `README.md`).
Estado actual: `app/layout.tsx`, `app/page.tsx` y el tema global en `app/globals.css`. La maqueta de referencia completa (biblioteca, detalle, reproductor, auth, salón de la fama) está en `references/templates/` como HTML + JSX sueltos, pendiente de portar a App Router. Aún no hay código de dominio, ni base de datos, ni pruebas.

No hay runner de pruebas configurado. Si se agregan pruebas, documentar el script aquí.

## Restricciones del stack

- **Next.js 16.2.12 / React 19.2.4, App Router.** Aplica lo indicado en AGENTS.md: esta versión de Next tiene cambios incompatibles frente al conocimiento previo del modelo. Leer el archivo correspondiente en `node_modules/next/dist/docs/01-app/` antes de escribir rutas, obtención de datos, caché, metadata o route handlers — p. ej. `01-getting-started/06-fetching-data.md`, `08-caching.md`, `15-route-handlers.md`. `02-guides/` cubre autenticación, formularios, variables de entorno y migración a cache components.
- **Tailwind CSS v4** vía `@tailwindcss/postcss`. No existe `tailwind.config.js` — los tokens de diseño viven en `app/globals.css` bajo `@theme inline`. Agregar colores/tipografías ahí, no en un config de JS.
- **TypeScript strict**, alias de rutas `@/*` → raíz del repositorio.

## Skills
Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Convenciones vigentes

- **Tema Arcade Vault** portado de `references/templates/styles.css` a `app/globals.css`. Ese archivo es la fuente única del estilo: variables crudas en `:root` (`--bg`, `--cyan`, `--pixel`, `--mono`, …) + clases de componente (`.av-nav`, `.btn`, `.card`, `.crt`, `.leaderboard`, `.podium`, `.cover-*`, …). Al portar nuevas pantallas del template, reutilizar esas clases tal cual.
- El layout renderiza los fondos fijos (`.av-bg` con rejilla en perspectiva + scanlines, `.av-noise`) y envuelve el contenido en `.av-root` (flex column, `z-index: 2`); las páginas usan `.av-main` (`flex: 1`) para ocupar el alto.
- Tipografías vía `next/font/google` en `app/layout.tsx`, expuestas como variables CSS: Press Start 2P (`--font-press-start`), JetBrains Mono (`--font-jetbrains-mono`) y Courier Prime (`--font-courier-prime`). El CSS las consume a través de `--pixel` y `--mono`; usar esas dos, no los nombres de fuente directos.
- Los tokens también se exponen a Tailwind en `@theme inline` con prefijo `av-` (`bg-av-bg-2`, `text-av-cyan`, `border-av-line`) más `font-pixel` / `font-mono`, para no chocar con la paleta por defecto de Tailwind.
- **Tema oscuro único.** No hay `prefers-color-scheme` ni variante clara: la paleta es fija. No agregar utilidades `dark:`.
- Accesibilidad: `:focus-visible` con contorno cian y bloque `prefers-reduced-motion` al final de `globals.css` que neutraliza animaciones. Mantenerlos al agregar animaciones nuevas.

## Flujo de trabajo

El README indica Spec Driven Design mediante las skills `/spec` y `/spec-impl` de `Klerith/fernando-skills`. Esas skills **no están instaladas actualmente** en este repositorio ni en las skills globales del usuario — instalar con `npx skills@latest add Klerith/fernando-skills` antes de depender de ese flujo.
