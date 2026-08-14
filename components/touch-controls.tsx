"use client";

import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { TouchControlConfig } from "@/lib/games/touch-config";

const REPEAT_MS = 120;

export default function TouchControls({
  config,
}: {
  config: TouchControlConfig;
}) {
  const intervalRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );

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
