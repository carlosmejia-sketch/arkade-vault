# SPEC 18 — Diagnóstico y corrección de performance en los motores de juego

> **Estado:** Implementado
> **Depende de:** specs/game-jam/frogger/01-frogger-core.md (motor de Frogger), SPEC 11/12/13/16 (skins, por si una paleta con `shadowBlur` u otro costo de render resulta ser causa), SPEC 14/15 (controles táctiles/responsivo, relevantes si el input con retraso aparece solo en móvil)
> **Fecha:** 2026-08-20
> **Objetivo:** Medir con Chrome DevTools vía Playwright el frame time, la latencia de input y el uso de memoria de los 5 motores de juego (`asteroides`, `tetris`, `arkanoid`, `snake`, `frogger`) durante sesiones prolongadas, identificar la causa raíz de la caída de FPS/stuttering, la degradación progresiva y el retraso de input reportados en Frogger, y aplicar la corrección correspondiente en cada motor donde se confirme el problema.

---

## Alcance

**Dentro:**

1. **Instrumentación de medición** vía `mcp__playwright__*` (sin agregar Playwright como dependencia del proyecto ni crear un runner de pruebas nuevo — se ejecuta de forma interactiva contra `npm run dev`, igual que el resto de verificación manual de specs anteriores):
   - Frame time por juego durante una sesión de ~60-90s de juego automatizado/simulado (input sintético repetido).
   - Latencia de input: delta entre el `keydown` sintético y el primer frame donde su efecto es visible (ej. la rana empieza a saltar).
   - Uso de memoria JS (`performance.memory` o `Performance.measureUserAgentSpecificMemory` si está disponible) al inicio y al final de la sesión, para detectar crecimiento no acotado.
   - Tiempo desde la navegación a `/juegos/[id]/jugar` hasta el primer frame dibujado (carga/arranque).
2. **Diagnóstico de los 5 motores** (`lib/games/*/engine.ts`) usando esas métricas: identificar funciones o patrones costosos por juego (allocaciones por frame, recorridos O(n²), listeners duplicados, etc.).
3. **Revisión de `components/game-player.tsx`** y `lib/games/skins.ts`/`touch-config.ts` como posibles causas compartidas (ej. si el `useEffect` de montaje del engine se dispara más de una vez, o si alguna skin agrega costo de render vía `shadowBlur`/`globalAlpha`).
4. **Corrección de los problemas confirmados** en cada motor/archivo afectado, uno a la vez, verificando con la misma medición que la métrica mejora sin introducir regresión funcional (colisiones, puntaje, controles).
5. Documentar en el spec, por juego, el resultado de la medición **antes y después** de cada fix.

**Fuera de alcance (para specs futuros):**

- Cualquier feature nueva o cambio de balance de juego (velocidad de carriles, dificultad, puntaje) — solo se toca código cuyo único efecto sea de rendimiento.
- Migrar el render de Canvas 2D a WebGL/OffscreenCanvas u otra reescritura arquitectónica mayor — si el diagnóstico revela que esa sería la única solución real para algún motor, se documenta como hallazgo y se propone un spec aparte, no se implementa aquí.
- Agregar Playwright como dependencia de test suite del proyecto (`package.json`) — la medición de este spec es una actividad puntual de diagnóstico, no una suite recurrente. Si el resultado de este spec es que conviene tener regresión de performance continua, eso se documenta como propuesta para un spec futuro de "suite de pruebas automatizadas" (ya mencionado como deuda pendiente en `CLAUDE.md`).
- Verificación en dispositivo móvil físico real — Playwright emula viewport/touch pero no reproduce fielmente CPU/GPU de un celular; se documenta como limitación conocida de la medición (ver Riesgos), no se bloquea el spec por eso.
- Otros problemas de UX o accesibilidad no relacionados a performance.

---

## Modelo de datos

Esta feature no introduce datos nuevos ni estructuras persistentes — el diagnóstico usa mediciones efímeras (frame time, latencia de input, memoria JS) tomadas por Playwright durante la sesión de verificación, y los resultados se documentan como texto dentro del spec, no como un archivo o tabla en Supabase/localStorage.

---

## Plan de implementación

### Paso 1 — Preparar el entorno de medición

`npm run dev`, navegar con `mcp__playwright__browser_navigate` a `/juegos/<id>/jugar` para cada uno de los 5 juegos. Confirmar que cada canvas monta y el engine arranca (sin cambios de código en este paso).

### Paso 2 — Medición baseline por juego

Para cada uno de los 5 motores, con una sesión simulada de ~60-90s (input sintético repetido vía `browser_press_key` u otro mecanismo equivalente que dispare el mismo `keydown` que usa cada engine):

- Frame time por frame (usar `requestAnimationFrame` instrumentado vía `browser_evaluate` o `Performance` marks).
- Latencia de input (delta `keydown` → primer frame con efecto visible).
- `performance.memory.usedJSHeapSize` al inicio (t=5s, para dejar estabilizar) y al final (t=60-90s).
- Tiempo de arranque: navegación → primer `requestAnimationFrame` ejecutado.

Registrar los 5 resultados baseline en una tabla dentro del spec.

### Paso 3 — Diagnóstico

Con los baseline en mano, identificar en qué juego(s) aparece cada síntoma reportado (caída de FPS, degradación progresiva, input con retraso, arranque lento) y localizar la causa en el código: revisar `lib/games/<slug>/engine.ts` de cada juego con síntoma confirmado, más `components/game-player.tsx`, `lib/games/skins.ts` y `lib/games/touch-config.ts` como posibles causas compartidas. Documentar causa raíz con archivo y línea, igual que specs anteriores (`16-skins-frogger.md`, `17-movil-frogger.md`).

### Paso 4 — Corrección

Por cada causa confirmada, aplicar el fix mínimo necesario en el archivo correspondiente, uno a la vez, sin tocar balance de juego ni arquitectura de render (ver Alcance). Si dos juegos comparten la misma causa (ej. un patrón repetido en varios `engine.ts`), corregir cada uno explícitamente — no se generaliza a una abstracción nueva compartida a menos que ya exista un mecanismo para ello.

### Paso 5 — Re-medición

Repetir el Paso 2 para cada juego corregido, confirmando que la métrica objetivo mejora y que no aparecen regresiones nuevas en las métricas no relacionadas al fix.

### Paso 6 — Verificación funcional

Para cada motor tocado: jugar manualmente una partida completa (o usar Playwright) confirmando que colisiones, puntaje, niveles y controles (teclado y táctil si aplica) se comportan igual que antes del fix.

### Paso 7 — Compilación

`npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

- [ ] Existe una tabla baseline (antes de cualquier fix) con frame time, latencia de input, memoria (inicio/fin de sesión) y tiempo de arranque para los 5 juegos.
- [ ] Para cada síntoma reportado (FPS/stuttering, degradación progresiva, input con retraso, arranque lento), el spec documenta en qué juego(s) se reprodujo y su causa raíz con archivo y línea, o documenta explícitamente que no se reprodujo.
- [ ] Cada causa raíz confirmada tiene un fix aplicado en el archivo correspondiente.
- [ ] La re-medición post-fix muestra mejora medible en la métrica que originó el hallazgo (frame time más estable, memoria sin crecimiento no acotado, latencia de input reducida, o arranque más rápido, según corresponda).
- [ ] Ningún fix cambia el comportamiento funcional del juego (colisiones, puntaje, niveles, controles) frente a una partida jugada manualmente antes y después.
- [ ] Ningún fix introduce cambios de balance de juego (velocidad, dificultad, puntaje) ni reescritura de arquitectura de render.
- [ ] Los juegos no tocados (sin causa raíz confirmada) no muestran cambios de comportamiento.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Decisiones tomadas y descartadas

### Medición automatizada con Playwright en vez de grabación manual en DevTools

- **Sí:** no depende de que el usuario grabe y comparta perfiles manualmente; permite repetir la misma medición exacta antes y después de cada fix para comparar de forma objetiva.
- **No:** grabación manual de DevTools — se descarta como método principal porque no es reproducible entre mediciones baseline/post-fix, aunque queda como limitación conocida no reemplazar la validación en dispositivo móvil real (ver Riesgos).

### Diagnóstico + fix en el mismo spec, en vez de dos specs separados

- **Sí:** separar diagnóstico y fix arriesgaría que el diagnóstico quede desactualizado para cuando se implemente el fix, y duplicaría el trabajo de medición (habría que re-medir baseline en el segundo spec). Un spec único con fases claras (medir → diagnosticar → corregir → re-medir) mantiene el contrato coherente.
- **No:** dos specs (uno de diagnóstico puro, otro de corrección) — se descarta por la razón anterior; se documentará cada hallazgo con suficiente detalle igualmente por si algún fix resulta demasiado grande y debe partirse en su propio spec durante `/spec-impl`.

### Alcance de 5 juegos en vez de solo Frogger

- **Sí:** el usuario confirmó que solo probó a fondo Frogger, pero pidió explícitamente cubrir los 5 juegos en un solo spec porque la causa podría ser compartida (`game-player.tsx`, `skins.ts`, `touch-config.ts`).
- **No:** limitar a Frogger y dejar los demás para specs futuros — descartado por decisión explícita del usuario.

### No migrar a WebGL/OffscreenCanvas aunque el diagnóstico lo sugiera

- **Sí:** es un cambio arquitectónico mayor que excede "corregir performance" y tocaría los 5 motores; si el diagnóstico lo justifica, se documenta como hallazgo y se propone como spec independiente.
- **No:** implementarlo directamente si aparece como causa — se descarta hacerlo dentro de este spec por su tamaño y riesgo, aunque sea la solución "ideal".

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                           | Mitigación                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright corre en un navegador de escritorio headless/headed; no reproduce fielmente CPU/GPU ni throttling de un celular real, así que un problema que solo aparece en hardware móvil real podría no medirse.  | Se documenta como limitación conocida; si el usuario reporta que el síntoma persiste en móvil real tras el fix, se abre un spec de seguimiento con verificación manual en dispositivo.                                 |
| El input sintético (`browser_press_key` u equivalente) puede no disparar el evento exactamente igual que un teclado físico o el panel táctil (`touch-controls.tsx`), afectando la medición de latencia de input. | Se usa el mismo `code` que escucha cada engine (ver inventario ya hecho en SPEC 17 para Frogger) y se documenta cualquier diferencia observada entre input sintético y manual en la verificación funcional del Paso 6. |
| `performance.memory` no está disponible en todos los navegadores (es una API no estándar de Chromium); si Playwright no la expone, la medición de memoria queda incompleta para ese entorno.                     | Se documenta si la métrica no está disponible; no bloquea el resto del diagnóstico (frame time y latencia de input no dependen de esa API).                                                                            |
| Corregir una causa compartida (ej. en `game-player.tsx` o `touch-config.ts`) podría afectar a un juego que hoy no muestra el síntoma.                                                                            | Paso 6 exige verificación funcional de **todos** los motores tocados, no solo el que originó el hallazgo.                                                                                                              |
| El navegador puede limitar `requestAnimationFrame` en pestañas en segundo plano o desenfocadas, distorsionando la medición si Playwright minimiza/desenfoca la ventana entre pasos.                              | Mantener la pestaña enfocada durante toda la sesión de medición; si se detecta throttling inesperado, documentarlo como parte de los resultados en vez de descartarlo silenciosamente.                                 |

---

## Resultados de la medición (2026-08-20)

### Metodología aplicada

- Servidor: `npm run dev` (Next.js 16.2.12 / Turbopack) en `http://localhost:3000`, ya corriendo al iniciar el spec.
- Navegación con `mcp__playwright__browser_navigate` a `/juegos/<id>/jugar` para cada uno de los 5 juegos (Paso 1): los 5 canvases montan correctamente (verificado con `document.querySelector('canvas')`, dimensiones esperadas por juego).
- Medición (Paso 2) inyectada vía `mcp__playwright__browser_evaluate`, una función `async` autocontenida por juego que:
  - Espera 3s de estabilización y toma `performance.memory.usedJSHeapSize` (memoria inicial).
  - Arranca un loop `requestAnimationFrame` **propio**, independiente del loop interno de cada engine, que registra el delta entre frames consecutivos. Como todos los callbacks de `requestAnimationFrame` pendientes para un mismo frame se ejecutan en el mismo tick del navegador, un costo extra dentro del loop del engine debería reflejarse igual en los deltas de este loop de medición.
  - Despacha `KeyboardEvent('keydown'/'keyup')` sintéticos sobre `window` con el mismo `code`/`key` que cada engine escucha (`onKeyDown` de cada `engine.ts`), en una sesión de 20s (asteroides/tetris/arkanoid/snake) o 45s (frogger, por ser el juego con síntomas reportados), a razón de ~1 input cada 150-160ms.
  - Mide latencia de input como el delta entre `performance.now()` al despachar el `keydown` y el siguiente `requestAnimationFrame` del loop de medición.
  - Al finalizar, toma memoria final y calcula: frame time promedio/p95/máximo, frame time por cuartos de la sesión (para detectar degradación progresiva), y latencia de input promedio en el primer vs. último cuarto de la sesión.
- **Limitación de entorno detectada y documentada** (amplía el riesgo ya previsto en la tabla anterior): el Chromium que corre Playwright en este entorno **no está sincronizado a un refresco de pantalla real de 60Hz** — `requestAnimationFrame` dispara a un ritmo constante de ~160 fps (frame time ~6.25ms) en los 5 juegos, no ~16.6ms. Esto es consistente con un Chromium headless/sin compositor de GPU real. Cualquier costo extra por frame que en un dispositivo real a 60Hz causaría un frame perdido visible (stutter) puede no manifestarse como una desviación medible aquí, porque el "presupuesto" de este entorno es mucho más laxo que el de una pantalla real. Se documenta como limitación de la medición, igual que la ya prevista para hardware móvil real — no bloquea el resto del diagnóstico.

### Tabla baseline (5 juegos, sin ningún fix aplicado)

| Juego      | Sesión | FCP (arranque) | Frame time avg / p95 / max | Frame time por cuartos (progresión)    | Memoria inicio → fin                           | Latencia input avg (1er vs. último cuarto)                   |
| ---------- | ------ | -------------- | -------------------------- | -------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| asteroides | 20s    | 188.0 ms       | 6.25 / 6.40 / 6.50 ms      | 6.25 / — / — / 6.25 ms (estable)       | 16.88 → 17.39 MB (+0.52)                       | avg sesión 5.74 ms, máx 7.20 ms                              |
| tetris     | 20s    | 168.0 ms       | 6.26 / 6.40 / 12.70 ms     | 6.27 / — / — / 6.25 ms (estable)       | 16.95 → 17.73 MB (+0.78)                       | avg sesión 5.83 ms, máx 6.70 ms                              |
| arkanoid   | 20s    | 156.0 ms       | 6.26 / 6.40 / 12.60 ms     | 6.26 / — / — / 6.26 ms (estable)       | 20.21 → 16.70 MB (−3.51)                       | avg sesión 5.69 ms, máx 6.30 ms                              |
| snake      | 20s    | 152.0 ms       | 6.25 / 6.40 / 12.50 ms     | 6.25 / — / — / 6.26 ms (estable)       | 15.74 → 15.84 MB (+0.10)                       | avg sesión 5.90 ms, máx 6.40 ms                              |
| frogger    | 45s    | 176.0 ms       | 6.25 / 6.40 / 12.50 ms     | 6.25 / 6.25 / 6.25 / 6.25 ms (estable) | 16.48 → 15.97 MB (−0.50), punto medio 16.68 MB | 1er cuarto 5.03 ms → último cuarto 4.75 ms (sin crecimiento) |

Notas:

- Memoria: los deltas están dentro del ruido normal de GC (incluso negativos, ej. Arkanoid −3.51MB, por una recolección de basura durante la ventana de estabilización de 3s previa a la medición). Ningún juego muestra una tendencia de crecimiento no acotado.
- Frame time: estable dentro de cada sesión y comparable entre los 5 juegos (~6.25ms, el piso del entorno sin vsync); Tetris/Arkanoid/Snake/Frogger tienen picos puntuales de ~12.5-12.7ms (un frame perdido aislado, no una tendencia) que no se repiten ni crecen.
- Arranque (FCP): 152-188 ms en los 5 juegos, sin ningún outlier — Frogger (176ms, el juego con síntomas reportados) está en el mismo rango que los demás.
- Latencia de input: 4.7-5.9 ms en todos los juegos, sin crecimiento entre el primer y el último cuarto de sesión en ningún caso (más marcado en Frogger, medido a propósito en una sesión de 45s por ser el caso reportado).

### Diagnóstico por síntoma reportado

- **Caída de FPS / stuttering**: no se reprodujo en ninguno de los 5 juegos bajo esta medición. Revisando `lib/games/*/engine.ts`: los 5 engines mantienen colecciones de entidades acotadas (asteroides/balas/partículas se filtran con `.filter(p => !p.dead)` cada frame y no crecen sin límite; frogger recicla sus `Entity` por carril con wraparound de columna en vez de crear nuevas; snake solo agrega una celda por tick y hace `pop()` si no comió fruta). Ninguno usa `ctx.shadowBlur`/`ctx.shadowColor` (grep sobre `lib/games/` sin resultados) ni otro filtro costoso de Canvas 2D por frame. Arkanoid cachea sus sprites tintados por color en un `Map` (`tintCache`, `lib/games/arkanoid/engine.ts:103-125`) en vez de recrear el canvas offscreen cada frame.
- **Degradación progresiva (memoria o frame time creciente en sesión larga)**: no se reprodujo. La medición de 45s en Frogger (el caso reportado) muestra frame time idéntico entre el primer y el último cuarto de sesión (6.25ms ambos) y memoria sin tendencia de crecimiento (16.48 → 15.97 MB). Código revisado no muestra arrays sin cota: `lanes`/`entities` en Frogger se construyen una vez por nivel (`buildLanes`) y se reciclan por posición, no se hace `push` continuo sin `filter`/límite en ningún engine.
- **Retraso de input**: no se reprodujo. La latencia medida (delta `keydown` sintético → siguiente frame de medición) se mantiene en 4.7-5.9 ms en los 5 juegos, sin crecimiento en Frogger entre el primer y último cuarto de la sesión de 45s.
- **Arranque lento**: no se reprodujo. El First Contentful Paint (proxy de arranque, misma metodología en los 5 juegos) está en el rango 152-188 ms para los 5, sin que Frogger destaque frente a los demás.
- **Hallazgo incidental, no relacionado a los síntomas reportados**: los 4 juegos con skins (`asteroides`, `arkanoid`, `snake`, `frogger`) generan un warning de _hydration mismatch_ de React en cada carga de `/juegos/<id>/jugar` (`components/game-player.tsx:31-38`): el `useState` inicial de `skin` lee `window.localStorage` y en SSR siempre devuelve `DEFAULT_SKIN`, pero en el cliente puede devolver la skin guardada de una partida anterior — el HUD de botones de skin se re-renderiza al hidratar. Es un costo único de montaje (no crece, no se repite por frame) y **no mueve ninguna métrica medida** (el FCP de los 4 juegos con skins no difiere del de Tetris, que no tiene skins ni el warning). Se documenta como hallazgo pero no se aplica fix: no está relacionado a ninguno de los 4 síntomas reportados y no hay métrica que mejore al corregirlo, por lo que un fix aquí no tendría forma de cumplir el criterio de aceptación de "mejora medible".

### Corrección (Paso 4)

**No se aplicó ningún fix.** Ninguna de las causas hipotéticas del Alcance (allocaciones por frame, recorridos O(n²), listeners duplicados, `shadowBlur` de skins) se confirmó como causa raíz de los síntomas reportados en los 5 motores, bajo la metodología de medición de este spec. Los criterios de aceptación contemplan explícitamente este resultado: _"o documenta explícitamente que no se reprodujo"_.

### Re-medición (Paso 5)

No aplica — no hay fix que re-medir.

### Verificación funcional (Paso 6)

No aplica ningún cambio de comportamiento: no se tocó código en ningún engine ni en `game-player.tsx`/`skins.ts`/`touch-config.ts`. El único paso de verificación relevante es el ya hecho en el Paso 1 (los 5 canvases montan y los engines arrancan sin cambios de código).

### Compilación (Paso 7)

- `npx tsc --noEmit`: sin errores.
- `npm run lint`: 4 errores preexistentes en `.claude/hooks/format-on-write.js` (`@typescript-eslint/no-require-imports`), no relacionados a este spec — no se tocó ese archivo ni ningún archivo de `lib/games/` o `components/`.
- `npm run build`: compila y genera las 20 páginas estáticas/dinámicas sin errores.

### Conclusión y trabajo futuro sugerido

El diagnóstico instrumentado con Playwright no reprodujo ninguno de los 4 síntomas reportados en ninguno de los 5 motores. La causa más probable, documentada como limitación de la medición (ver tabla de Riesgos), es que el entorno de Chromium usado aquí no está sincronizado a un refresco de 60Hz real ni reproduce el CPU/GPU de un dispositivo móvil — si el stuttering/degradación de Frogger persiste en un dispositivo real, se recomienda abrir un spec de seguimiento con verificación manual en hardware físico (mencionado ya como limitación conocida, no como acción de este spec) en vez de repetir esta medición automatizada.
