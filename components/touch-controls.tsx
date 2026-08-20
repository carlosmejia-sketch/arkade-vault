"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { TouchControlConfig } from "@/lib/games/touch-config";

const REPEAT_MS = 120;

// Memoizado: game-player.tsx re-renderiza en cada cambio de score/lives/level
// (uno por evento de juego, no por frame, pero frecuente en juegos como
// Asteroides). `config` es la misma referencia estable de TOUCH_CONFIG por
// juego, así que sin memo este árbol de botones se reconciliaba de nuevo en
// cada uno de esos renders sin ninguna prop distinta (checklist de
// performance, regla 20).
function TouchControls({ config }: { config: TouchControlConfig }) {
  const intervalRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );

  // Limpia cualquier timer de auto-repeat que haya quedado activo si el
  // componente se desmonta con un botón presionado (ej. el jugador pulsa
  // SALIR/FIN sin soltar el dpad) — evita que el setInterval siga disparando
  // `dispatchEvent` indefinidamente (checklist de performance, regla 21).
  useEffect(() => {
    const intervals = intervalRef.current;
    return () => {
      intervals.forEach((id) => clearInterval(id));
      intervals.clear();
    };
  }, []);

  const dispatch = (code: string, type: "keydown" | "keyup") => {
    // Arkanoid lee e.key en vez de e.code; los demás motores leen e.code.
    // Enviar ambos con el mismo valor cubre los dos casos sin tocar ningún engine.ts.
    window.dispatchEvent(new KeyboardEvent(type, { code, key: code }));
  };

  const handlePress = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const code = e.currentTarget.dataset.code;
      if (!code) return;
      const intervals = intervalRef.current;
      dispatch(code, "keydown");
      if (config.repeatCodes.includes(code) && !intervals.has(code)) {
        const id = setInterval(() => dispatch(code, "keydown"), REPEAT_MS);
        intervals.set(code, id);
      }
    },
    [config.repeatCodes],
  );

  const handleRelease = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const code = e.currentTarget.dataset.code;
      if (!code) return;
      const intervals = intervalRef.current;
      const id = intervals.get(code);
      if (id) {
        clearInterval(id);
        intervals.delete(code);
      }
      dispatch(code, "keyup");
    },
    [],
  );

  const hasButtons = Boolean(config.buttonA || config.buttonB);

  return (
    <div className="touch-controls">
      <div className="dpad">
        {config.up && (
          <button
            className="dpad-btn dpad-up"
            data-code={config.up}
            onPointerDown={handlePress}
            onPointerUp={handleRelease}
            onPointerLeave={handleRelease}
            onPointerCancel={handleRelease}
            aria-label="Arriba"
          >
            ▲
          </button>
        )}
        <button
          className="dpad-btn dpad-left"
          data-code={config.left}
          onPointerDown={handlePress}
          onPointerUp={handleRelease}
          onPointerLeave={handleRelease}
          onPointerCancel={handleRelease}
          aria-label="Izquierda"
        >
          ◀
        </button>
        <button
          className="dpad-btn dpad-right"
          data-code={config.right}
          onPointerDown={handlePress}
          onPointerUp={handleRelease}
          onPointerLeave={handleRelease}
          onPointerCancel={handleRelease}
          aria-label="Derecha"
        >
          ▶
        </button>
        {config.down && (
          <button
            className="dpad-btn dpad-down"
            data-code={config.down}
            onPointerDown={handlePress}
            onPointerUp={handleRelease}
            onPointerLeave={handleRelease}
            onPointerCancel={handleRelease}
            aria-label="Abajo"
          >
            ▼
          </button>
        )}
      </div>
      {hasButtons && (
        <div className="action-buttons">
          {config.buttonA && (
            <button
              className="action-btn"
              data-code={config.buttonA.code}
              onPointerDown={handlePress}
              onPointerUp={handleRelease}
              onPointerLeave={handleRelease}
              onPointerCancel={handleRelease}
            >
              {config.buttonA.label}
            </button>
          )}
          {config.buttonB && (
            <button
              className="action-btn"
              data-code={config.buttonB.code}
              onPointerDown={handlePress}
              onPointerUp={handleRelease}
              onPointerLeave={handleRelease}
              onPointerCancel={handleRelease}
            >
              {config.buttonB.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(TouchControls);
