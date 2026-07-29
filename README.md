## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```

## Comandos

```bash
npm run dev     # servidor de desarrollo (Turbopack por defecto en Next 16)
npm run build   # build de producción — también el único chequeo de tipos completo (tsconfig usa noEmit)
npm start       # sirve el build de producción
npm run lint    # eslint (flat config, no requiere argumento de ruta)
npx tsc --noEmit # chequeo de tipos sin generar build
```