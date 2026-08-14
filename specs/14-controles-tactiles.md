# SPEC 14 — Controles táctiles del reproductor

> **Estado:** Aprobado
> **Depende de:** SPEC 05 (motor Asteroides), SPEC 07 (motor Tetris), SPEC 08 (motor Arkanoid), SPEC 09 (motor Snake)
> **Fecha:** 2026-08-14
> **Objetivo:** Agregar en `/juegos/[id]/jugar` un panel táctil (D-pad + hasta 2 botones) debajo del canvas, visible solo en pantallas táctiles, que dispara los mismos eventos de teclado que ya escuchan los 4 motores sin modificar ningún `engine.ts`.

---

## Alcance

**Dentro:**

1. **Nuevo componente `components/touch-controls.tsx`**: D-pad de 4 direcciones + hasta 2 botones de acción, reutilizable por los 4 juegos. Visible solo cuando se detecta pantalla táctil real (`window.matchMedia("(pointer: coarse)")`), no por ancho de viewport — un desktop con mouse en ventana angosta no lo ve.
2. **Mapeo de controles por juego** (mismo `code` que ya escucha cada `engine.ts`, sin tocar ningún engine):
   - **Asteroides**: D-pad izq/der → rotar (`ArrowLeft`/`ArrowRight`), D-pad arriba → impulso (`ArrowUp`), D-pad abajo sin uso. Botón A → disparar (`Space`). Sin botón B.
   - **Tetris**: D-pad izq/der → mover (`ArrowLeft`/`ArrowRight`), D-pad abajo → caída suave (`ArrowDown`), D-pad arriba → rotar (`ArrowUp`). Botón A → caída rápida (`Space`). Sin botón B.
   - **Arkanoid**: D-pad izq/der → mover paleta (`ArrowLeft`/`ArrowRight`). D-pad arriba/abajo y ambos botones sin uso (no se renderizan).
   - **Snake**: D-pad 4 direcciones → cambiar dirección (`ArrowUp/Down/Left/Right`). Ambos botones sin uso (no se renderizan).
3. **Mecanismo de input**: cada botón del panel dispara `window.dispatchEvent(new KeyboardEvent("keydown"/"keyup", { code }))` en `pointerdown`/`pointerup`, reutilizando el listener `keydown`/`keyup` que cada engine ya tiene. Para Tetris (movimiento por paso discreto) se agrega repetición manual mientras el botón sigue presionado, ya que el navegador no auto-repite eventos de teclado sintéticos como lo hace con una tecla física mantenida. Asteroides y Arkanoid no la necesitan porque sus engines leen un estado booleano continuo (`keys[code]`) en cada frame.
4. **`components/game-player.tsx`**: monta `<TouchControls>` debajo del bloque `.crt` (canvas exclusivamente arriba, panel debajo), pasando el mapeo correspondiente a `game.id`. El HUD superior (jugador/puntuación/vidas/nivel/skin/pausa/fin/salir) no cambia de posición ni de comportamiento.
5. **CSS en `app/globals.css`**: estilos del nuevo panel (`.touch-controls`, `.dpad`, `.dpad-btn`, `.action-btn`) siguiendo la paleta/tema existente (`--cyan`, `--pixel`, `--mono`, bordes tipo `.crt`), visible solo bajo `@media (pointer: coarse)`.
6. **Verificación manual**: los 4 juegos jugados en un dispositivo/emulador táctil real (Chrome DevTools con emulación táctil no siempre dispara `pointer: coarse`; se recomienda un teléfono real o el emulador de Android Studio), confirmando que el panel aparece, que cada botón produce el mismo efecto que su tecla equivalente, y que en desktop con mouse el panel no aparece.

**Fuera de alcance (para specs futuros):**

- Rediseño responsivo de otras pantallas (`home`, `biblioteca`, `salón`, `acerca-de`, `acceso`, detalle de juego) — ya cubiertas por `@media` de specs previos, no se tocan en este spec.
- Cualquier cambio a la lógica de juego de los 4 motores (`lib/games/*/engine.ts`) — se reutiliza tal cual el listener de teclado existente.
- Gestos táctiles directamente sobre el canvas (swipe, drag, tap-to-shoot) — solo el panel de botones fijo debajo del canvas.
- `preventDefault()` en eventos de teclado real — deuda ya documentada, no se resuelve aquí.
- Vibración háptica o sonido al presionar los botones táctiles.
- Soporte de gamepad físico (Bluetooth/USB) — otro spec si se necesita.

---

## Modelo de datos

Esta feature no persiste nada nuevo (no toca `localStorage` ni Supabase). Introduce solo un objeto de configuración estático por juego, en un nuevo archivo `lib/games/touch-config.ts`:

```ts
export type TouchButton = { code: string; label: string } | null;

export type TouchControlConfig = {
  up: string | null;
  down: string | null;
  left: string;
  right: string;
  buttonA: TouchButton;
  buttonB: TouchButton;
  repeatCodes: string[]; // codes que necesitan repetición manual mientras se mantiene presionado
};

export const TOUCH_CONFIG: Record<GameId, TouchControlConfig> = {
  asteroides: {
    up: "ArrowUp",
    down: null,
    left: "ArrowLeft",
    right: "ArrowRight",
    buttonA: { code: "Space", label: "DISPARAR" },
    buttonB: null,
    repeatCodes: [],
  },
  tetris: {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    buttonA: { code: "Space", label: "CAÍDA RÁPIDA" },
    buttonB: null,
    repeatCodes: ["ArrowLeft", "ArrowRight", "ArrowDown"],
  },
  arkanoid: {
    up: null,
    down: null,
    left: "ArrowLeft",
    right: "ArrowRight",
    buttonA: null,
    buttonB: null,
    repeatCodes: [],
  },
  snake: {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    buttonA: null,
    buttonB: null,
    repeatCodes: [],
  },
};
```

`GameId` se reutiliza de `lib/games/skins.ts` (ya existe, no se duplica). `TouchControls` recibe `TOUCH_CONFIG[game.id]` desde `game-player.tsx` y renderiza únicamente las flechas/botones cuyo campo no es `null`.

---

## Plan de implementación

1. **Crear `lib/games/touch-config.ts`**: tipo `TouchButton`/`TouchControlConfig` y el mapa `TOUCH_CONFIG` con las 4 entradas (`asteroides`/`tetris`/`arkanoid`/`snake`) según el modelo de datos de arriba. Sin efecto visible todavía (archivo no consumido aún).
2. **Crear `components/touch-controls.tsx`**: recibe `config: TouchControlConfig` por props. Renderiza el D-pad (4 flechas, oculta la que tenga `code: null`) y hasta 2 botones de acción (oculta `buttonA`/`buttonB` en `null`). Cada control usa `onPointerDown`/`onPointerUp`/`onPointerLeave` para disparar `window.dispatchEvent(new KeyboardEvent("keydown"/"keyup", { code }))`. Para los `code` presentes en `repeatCodes`, además de la primera `keydown` inicia un `setInterval` (~120ms) que re-dispara `keydown` mientras el botón sigue presionado, y lo limpia en `keyup`/`pointerleave`. El componente en sí no decide visibilidad por dispositivo todavía (paso 4).
3. **Estilos en `app/globals.css`**: agregar `.touch-controls` (contenedor flex, D-pad a la izquierda, botones a la derecha, tema `--cyan`/`--pixel`/bordes tipo `.crt`) dentro de un bloque `@media (pointer: coarse)` para que solo pantallas táctiles reales lo vean, sin afectar el resto de breakpoints existentes.
4. **Wire en `components/game-player.tsx`**: importar `TOUCH_CONFIG` y montar `<TouchControls config={TOUCH_CONFIG[game.id as GameId]} />` inmediatamente después del bloque `.crt` (canvas arriba, panel debajo, fuera del `.crt` para no interferir con sus overlays de pausa/fin). Sin cambios al HUD superior existente.
5. **Verificación manual**: probar los 4 juegos en un dispositivo táctil real (teléfono) o emulador con `pointer: coarse` real (no solo redimensionar DevTools): el panel aparece, cada botón produce el mismo efecto que su tecla equivalente, la repetición de Tetris permite mover una pieza sosteniendo el D-pad, y en una laptop con mouse el panel no aparece.
6. **Compilación**: `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Criterios de aceptación

- [ ] `lib/games/touch-config.ts` exporta `TOUCH_CONFIG` con exactamente las 4 claves `asteroides`/`tetris`/`arkanoid`/`snake`, cada una con la configuración descrita en el modelo de datos.
- [ ] `components/touch-controls.tsx` no renderiza una flecha del D-pad ni un botón de acción cuyo `code` sea `null`.
- [ ] En Asteroides táctil: mantener presionada la flecha izq/der rota la nave, la flecha arriba impulsa, y el botón A dispara — mismo comportamiento que las teclas equivalentes.
- [ ] En Tetris táctil: tap en flecha arriba rota la pieza, sostener flecha izq/der/abajo mueve/baja la pieza de forma repetida (no un solo paso), y el botón A hace caída rápida.
- [ ] En Arkanoid táctil: solo se ve el D-pad izq/der (sin flechas arriba/abajo ni botones), y mueve la paleta mientras se mantiene presionado.
- [ ] En Snake táctil: las 4 flechas cambian de dirección, sin botones visibles.
- [ ] El panel de controles táctiles no aparece en un navegador de escritorio con mouse (verificado con `pointer: coarse` real, no solo ventana angosta).
- [ ] El teclado físico sigue funcionando exactamente igual que antes de este spec en los 4 juegos (el panel táctil es aditivo, no reemplaza el listener existente).
- [ ] Ningún archivo `lib/games/*/engine.ts` se modifica.
- [ ] El HUD superior (jugador/puntuación/vidas/nivel/skin/pausa/fin/salir) no cambia de posición ni pierde funcionalidad.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni advertencias nuevas.

---

## Decisiones tomadas y descartadas

### Eventos de teclado sintéticos (`dispatchEvent(new KeyboardEvent(...))`) en vez de una nueva API de input en los engines

- **Sí:** los 4 motores ya escuchan `keydown`/`keyup` por `e.code` en `window`/`document`; un evento sintético con el mismo `code` activa exactamente el mismo camino de código, sin distinguir si vino de un teclado físico o de `dispatchEvent`. Mantiene la regla ya establecida en specs de skins ("los engines no se tocan") y evita reescribir el manejo de input de 4 motores distintos.
- **No:** extender `Engine`/`EngineFactory` con `press(action)`/`release(action)` — más "correcto" arquitectónicamente pero obliga a modificar los 4 `engine.ts`, con riesgo de regresión en juegos que ya funcionan, para un beneficio que no se necesita hoy.

### Repetición manual solo para los `code` de Tetris marcados en `repeatCodes`

- **Sí:** Asteroides y Arkanoid leen un estado booleano continuo (`keys[code]`) en cada frame — un solo `keydown`/`keyup` del panel táctil ya simula sostener la tecla, sin lógica adicional. Tetris avanza por paso discreto en cada `keydown` y depende del auto-repeat del sistema operativo cuando la tecla es física; los eventos sintéticos no disparan ese auto-repeat, así que el panel táctil debe simularlo con un `setInterval`.
- **No:** aplicar repetición manual a los 4 juegos por igual — innecesario y más código para Asteroides/Arkanoid, que ya funcionan con un solo evento por toque.

### Visibilidad vía `pointer: coarse` en vez de un breakpoint de ancho de viewport

- **Sí:** un dispositivo con mouse en ventana angosta (ej. DevTools redimensionado) no debe ver un panel pensado para dedos; `pointer: coarse` refleja el tipo de puntero real, no el tamaño de pantalla.
- **No:** un `@media (max-width: Npx)` como el resto de breakpoints del sitio — más fácil de probar en desarrollo, pero mostraría el panel a usuarios de mouse con ventana angosta y lo ocultaría en tablets grandes con pantalla táctil, que es exactamente el caso que este spec quiere cubrir.

### El panel se monta debajo de `.crt`, no dentro ni superpuesto al canvas

- **Sí:** cumple el pedido explícito ("canvas exclusivamente arriba, abajo un pequeño control"), y evita cualquier conflicto con los overlays que Arkanoid/pausa ya dibujan sobre el propio canvas (documentado en SPEC 13).
- **No:** overlay flotante sobre el canvas (semi-transparente encima del juego) — tapa parte de la pantalla de juego, que en Arkanoid/Tetris ya es angosta.

### 2 botones fijos que se ocultan si el juego no los usa (no siempre visibles deshabilitados)

- **Sí:** Arkanoid y Snake no tienen ninguna acción de botón — mostrar botones deshabilitados sin función confundiría al jugador y ocuparía espacio de pantalla sin propósito.
- **No:** mantener el panel con altura/elementos idénticos en los 4 juegos — más "consistente" pixel a pixel pero a costa de UI muerta en 2 de los 4 juegos.

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                                            | Mitigación                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un `setInterval` de repetición (Tetris) que no se limpia en `pointerleave`/`pointercancel` (ej. el dedo se desliza fuera del botón sin disparar `pointerup`) dejaría la pieza moviéndose sola.                    | Escuchar también `pointercancel`/`pointerleave` además de `pointerup` para limpiar el intervalo y disparar el `keyup` final.                                                                                |
| `pointer: coarse` puede no reflejar bien dispositivos híbridos (laptops 2-en-1 con pantalla táctil y mouse conectado); el panel podría aparecer/desaparecer de forma inesperada al conectar/desconectar un mouse. | Aceptado como comportamiento estándar de la media feature — es el mismo criterio que usa cualquier sitio responsivo; no se intenta detección más sofisticada (ej. combinar con `hover: none`) en este spec. |
| Doble disparo de input en dispositivos que emiten tanto eventos táctiles como eventos de mouse sintéticos (algunos navegadores móviles disparan `click` ~300ms después de un `touchend`).                         | Usar exclusivamente eventos Pointer (`onPointerDown`/`onPointerUp`), no `onClick` ni `onTouchStart`, y `e.preventDefault()` en el `pointerdown` del botón para suprimir el evento de mouse fantasma.        |
| El panel táctil ocupa espacio vertical adicional; en pantallas muy bajas (móviles en horizontal, teléfonos pequeños) podría empujar el canvas fuera del viewport visible sin scroll.                              | Verificación manual del Paso 5 incluye probar en una pantalla de alto reducido; si el canvas queda cortado, reducir el tamaño del panel (`.dpad-btn`/`.action-btn` más pequeños) antes de agregar scroll.   |
| Deuda conocida heredada (no se arregla en este spec): `game.best`/`game.plays` no sincronizados con Supabase; sin `preventDefault()` en teclado físico; `insertScore` falla en silencio.                          | Aceptado como riesgo conocido, igual que en specs anteriores.                                                                                                                                               |

---

## Qué **no** está en esta spec

- Rediseño responsivo de otras pantallas del sitio (`home`, `biblioteca`, `salón`, `acerca-de`, `acceso`, detalle de juego).
- Cambios a la lógica de juego de los 4 motores (`lib/games/*/engine.ts`).
- Gestos táctiles sobre el canvas (swipe, drag, tap-to-shoot).
- `preventDefault()` en eventos de teclado real.
- Vibración háptica o sonido en los botones táctiles.
- Soporte de gamepad físico (Bluetooth/USB).

Cada uno de estos, si se necesita, va en su propia spec.
