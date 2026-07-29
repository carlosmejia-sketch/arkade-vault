@AGENTS.md

# CLAUDE.md

Este archivo brinda orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Idioma

**Todo el contenido de este proyecto se maneja en español**: documentación, comentarios, mensajes de commit, textos de UI y las respuestas al usuario. Cualquier actualización futura a este archivo también debe hacerse en español.

## Proyecto

Arcade Vault — plataforma para jugar online y competir por puntaje (ver `README.md`).
Actualmente es un scaffold sin modificar de `create-next-app`: solo `app/layout.tsx` y `app/page.tsx`. Aún no hay código de dominio, ni base de datos, ni pruebas.

## Comandos

```bash
npm run dev     # servidor de desarrollo (Turbopack por defecto en Next 16)
npm run build   # build de producción — también el único chequeo de tipos completo (tsconfig usa noEmit)
npm start       # sirve el build de producción
npm run lint    # eslint (flat config, no requiere argumento de ruta)
npx tsc --noEmit # chequeo de tipos sin generar build
```

No hay runner de pruebas configurado. Si se agregan pruebas, documentar el script aquí.

## Restricciones del stack

- **Next.js 16.2.12 / React 19.2.4, App Router.** Aplica lo indicado en AGENTS.md: esta versión de Next tiene cambios incompatibles frente al conocimiento previo del modelo. Leer el archivo correspondiente en `node_modules/next/dist/docs/01-app/` antes de escribir rutas, obtención de datos, caché, metadata o route handlers — p. ej. `01-getting-started/06-fetching-data.md`, `08-caching.md`, `15-route-handlers.md`. `02-guides/` cubre autenticación, formularios, variables de entorno y migración a cache components.
- **Tailwind CSS v4** vía `@tailwindcss/postcss`. No existe `tailwind.config.js` — los tokens de diseño viven en `app/globals.css` bajo `@theme inline`. Agregar colores/tipografías ahí, no en un config de JS.
- **TypeScript strict**, alias de rutas `@/*` → raíz del repositorio.

## Convenciones vigentes

- El layout define el contenedor de la página (`html.h-full`, `body.min-h-full flex flex-col`); las páginas usan `flex-1` para ocuparlo.
- Las tipografías se cargan en `app/layout.tsx` con `next/font/google` y se exponen como variables CSS (`--font-geist-sans`, `--font-geist-mono`).
- El modo oscuro se maneja con `prefers-color-scheme` (variables CSS en `globals.css` + utilidades `dark:`). No hay toggle de tema ni estrategia por clase.

## Flujo de trabajo

El README indica Spec Driven Design mediante las skills `/spec` y `/spec-impl` de `Klerith/fernando-skills`. Esas skills **no están instaladas actualmente** en este repositorio ni en las skills globales del usuario — instalar con `npx skills@latest add Klerith/fernando-skills` antes de depender de ese flujo.

Nota: la metadata en `app/layout.tsx` aún dice "Create Next App" — actualizar cuando exista el branding real.
