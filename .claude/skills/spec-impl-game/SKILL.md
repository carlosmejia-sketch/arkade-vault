---
name: spec-impl-game
description: Implementa el spec de un juego nuevo y luego, en cadena secuencial, genera e implementa su spec de skins (skin-designer) y su spec móvil (mobile-porter). Delega las fases de implementación en la skill spec-impl.
disable-model-invocation: true
argument-hint: <NN-nombre-del-spec-del-juego>
allowed-tools: Read, Write, Edit, Glob, Grep, Task, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git add:*), Bash(git commit:*), Bash(cat:*), Bash(ls:*), Bash(date:*)
---

# /spec-impl-game — Implementador encadenado: juego + skins + móvil

## Por qué existe

`/spec-impl` implementa un solo spec y termina ahí. Para un juego nuevo completo hacían falta 5 pasos manuales: implementar el motor, invocar `skin-designer`, aprobar e implementar ese spec, invocar `mobile-porter`, aprobar e implementar ese spec. `/spec-impl-game` hace las 3 implementaciones en una sola corrida, lanzando los dos agentes **secuencialmente, nunca en paralelo**.

`allowed-tools` aquí es más amplio que en `/spec-impl` porque, a diferencia de ese comando, este sí lanza agentes (`Task`) y sí edita el estado de specs que genera en la misma corrida (`Edit`).

## Sesión — contexto

Estado del repo:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Config de rama:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, sin archivo de config)"`

---

## Fase 0 — Cargar el motor de implementación

Lee `.claude/skills/spec-impl/SKILL.md` completo con la herramienta Read. Sus Fases 1 a 4 (identificar spec, validar estado, crear/cambiar rama, implementar paso a paso con pausas) son "el motor". Se ejecutan **tal cual están escritas ahí, tres veces en total** a lo largo de esta skill — una por cada spec (juego, skins, móvil). No resumas ni reescribas ese contenido aquí: ábrelo y síguelo literalmente cada vez que este documento diga "correr el motor".

No saltes esta fase asumiendo que ya conoces el contenido de una corrida anterior — vuelve a leer el archivo si `spec-impl` pudo haber cambiado.

---

## Fase 1 — Implementar el spec del juego

Argumento recibido: `$ARGUMENTS`.

Corre el motor (Fases 1–4 de `spec-impl`) usando `$ARGUMENTS` como su argumento, incluyendo la creación/cambio de rama según `AutoCreateBranch` y las pausas de revisión por paso.

**Si el motor se detiene** (spec no encontrado, argumento vacío, o estado que no significa "Aprobado"): `/spec-impl-game` termina exactamente ahí. No avances a la Fase 2. Muestra el mismo bloque de error/aviso que produjo el motor, sin suavizarlo ni ofrecer alternativas no solicitadas.

Anota la rama activa que quedó tras esta fase — las Fases 4 y 6 reutilizan esa misma rama, no crean una nueva.

---

## Fase 2 — Derivar el objetivo (game id) para los agentes

Del nombre de archivo del spec implementado (`specs/NN-<algo>-<id>.md` o similar) extrae el candidato a game id y verifícalo contra las entradas reales de `lib/games.ts` (Read).

- Si hay una coincidencia clara y única → continúa con ese id.
- Si es ambiguo, no aparece en `lib/games.ts`, o el spec no sigue el patrón de nombre esperado → **pregunta al usuario** cuál es el id correcto y espera la respuesta. No adivines: un id equivocado hace que los dos agentes siguientes escriban specs sobre el juego incorrecto.

---

## Fase 3 — Lanzar `skin-designer`

Lanza vía Task un agente `subagent_type: skin-designer`, un solo agente, con el game id de la Fase 2 como objetivo único. Espera a que termine por completo antes de seguir — no lo lances en paralelo con nada.

Su salida esperada: `specs/NN-skins-<id>.md` (estado `Borrador`) + fila actualizada en `references/game-with-themes.md`. Confirma con Read que el archivo de spec existe y captura su ruta exacta para la siguiente fase.

---

## Fase 4 — Implementar el spec de skins

El spec que acaba de escribir `skin-designer` está en `Estado: Borrador`. `spec-impl` Fase 2 rechazaría eso ("ese cambio lo hace el humano, no el agente").

**Excepción acotada de esta skill:** aquí sí puedes voltear `Estado: Borrador → Aprobado`, pero **solo** en el spec que el agente acaba de generar en esta misma corrida — nunca en un spec preexistente que ya traías de antes. Antes de editar, anuncia al usuario exactamente qué archivo y qué línea vas a cambiar y por qué (es la excepción documentada de este comando, no un hábito general).

Hecho el flip, corre el motor de la Fase 0 sobre esta ruta. En la Fase 3 del motor (creación de rama), si detecta que ya estás en una rama de spec activa (la de la Fase 1 de este documento), indícale explícitamente que reutilice esa rama en vez de crear `spec-NN-skins-...` — todo el flujo vive en una sola rama.

---

## Fase 5 — Lanzar `mobile-porter`

Solo arranca esta fase después de que la Fase 4 terminó por completo (implementación de skins con sus pausas de revisión ya cerradas). El orden es intencional: `mobile-porter` audita CSS/JSX de forma estática, y necesita ver el CSS de los skins ya escrito para no dejar reglas responsivas huérfanas o duplicadas.

Lanza vía Task un agente `subagent_type: mobile-porter`, un solo agente, mismo game id. Espera a que termine antes de seguir.

Salida esperada: `specs/NN-movil-<id>.md` (o el nombre que use la convención de mobile-porter) + fila actualizada en `references/mobile-ported.md`. Confirma con Read que existe y captura su ruta.

---

## Fase 6 — Implementar el spec móvil

Misma mecánica que la Fase 4: flip acotado `Borrador → Aprobado` únicamente en este spec recién generado, anunciado al usuario, y luego correr el motor de la Fase 0 sobre esta ruta, reutilizando la rama activa.

---

## Fase 7 — Cierre

Al terminar la Fase 6, muestra un resumen final:

```
✅ Cadena completa: juego + skins + móvil implementados.

Rama activa: <rama>
Specs implementados en esta corrida:
  - specs/NN-....md      (juego)
  - specs/NN-skins-....md
  - specs/NN-movil-....md

Antes de mergear:
  1. Verifica los criterios de aceptación de los 3 specs, uno por uno.
  2. Pasa el estado de cada uno a "Implementado".
  3. Haz el commit final.
```

---

## Reglas transversales (aplican durante toda la corrida)

- **Secuencial, nunca paralelo.** Un agente a la vez; espera a que cierre antes de lanzar el siguiente. `skin-designer` y `mobile-porter` escriben en `specs/` y en sus respectivos `references/*.md` — en paralelo colisionarían tomando el mismo número consecutivo `NN`.
- **Una sola rama para todo el flujo.** La que crea la Fase 1. Las Fases 4 y 6 no deben crear ramas nuevas.
- **Las pausas de revisión de diff del motor se conservan siempre.** Auto-implementar los specs de skins y móvil no significa saltarse la revisión paso a paso — sigue pausando tras cada paso del plan y esperando confirmación, igual que en cualquier corrida de `spec-impl`.
- **Todo el output en español**, según CLAUDE.md del proyecto.
- **El flip de estado está acotado**: solo aplica a los 2 specs generados por los agentes en esta misma corrida, jamás a un spec preexistente que ya estuviera en `Borrador` por otra razón.
- El hook `PostToolUse` (`.claude/hooks/format-on-write.js`) corre Prettier/ESLint tras cada Write/Edit, incluyendo los `.md` de `specs/` y `references/` — es esperado, no un error.
- Si en cualquier fase surge una ambigüedad que el spec correspondiente no resuelve, detente, descríbela y presenta opciones concretas — no improvises, igual que exige `spec-impl` Fase 4.
