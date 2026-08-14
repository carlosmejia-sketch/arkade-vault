"use client";

import { useRef } from "react";
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
    window.dispatchEvent(new KeyboardEvent(type, { code }));
  };

  const press = (code: string) => (e: ReactPointerEvent) => {
    e.preventDefault();
    dispatch(code, "keydown");
    if (config.repeatCodes.includes(code) && !intervalRef.current.has(code)) {
      const id = setInterval(() => dispatch(code, "keydown"), REPEAT_MS);
      intervalRef.current.set(code, id);
    }
  };

  const release = (code: string) => (e: ReactPointerEvent) => {
    e.preventDefault();
    const id = intervalRef.current.get(code);
    if (id) {
      clearInterval(id);
      intervalRef.current.delete(code);
    }
    dispatch(code, "keyup");
  };

  const hasButtons = Boolean(config.buttonA || config.buttonB);

  return (
    <div className="touch-controls">
      <div className="dpad">
        {config.up && (
          <button
            className="dpad-btn dpad-up"
            onPointerDown={press(config.up)}
            onPointerUp={release(config.up)}
            onPointerLeave={release(config.up)}
            onPointerCancel={release(config.up)}
            aria-label="Arriba"
          >
            ▲
          </button>
        )}
        <button
          className="dpad-btn dpad-left"
          onPointerDown={press(config.left)}
          onPointerUp={release(config.left)}
          onPointerLeave={release(config.left)}
          onPointerCancel={release(config.left)}
          aria-label="Izquierda"
        >
          ◀
        </button>
        <button
          className="dpad-btn dpad-right"
          onPointerDown={press(config.right)}
          onPointerUp={release(config.right)}
          onPointerLeave={release(config.right)}
          onPointerCancel={release(config.right)}
          aria-label="Derecha"
        >
          ▶
        </button>
        {config.down && (
          <button
            className="dpad-btn dpad-down"
            onPointerDown={press(config.down)}
            onPointerUp={release(config.down)}
            onPointerLeave={release(config.down)}
            onPointerCancel={release(config.down)}
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
              onPointerDown={press(config.buttonA.code)}
              onPointerUp={release(config.buttonA.code)}
              onPointerLeave={release(config.buttonA.code)}
              onPointerCancel={release(config.buttonA.code)}
            >
              {config.buttonA.label}
            </button>
          )}
          {config.buttonB && (
            <button
              className="action-btn"
              onPointerDown={press(config.buttonB.code)}
              onPointerUp={release(config.buttonB.code)}
              onPointerLeave={release(config.buttonB.code)}
              onPointerCancel={release(config.buttonB.code)}
            >
              {config.buttonB.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
