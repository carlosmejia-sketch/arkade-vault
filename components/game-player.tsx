"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/games";
import { ENGINE_REGISTRY } from "@/lib/games/registry";
import type { Engine } from "@/lib/games/types";
import { DEFAULT_SKIN, getPalette, SKINS } from "@/lib/games/skins";
import type { GameId, SkinId } from "@/lib/games/skins";
import { useSession } from "@/lib/session";
import { insertScore } from "@/lib/scores";
import { createClient } from "@/lib/supabase/client";
import TouchControls from "@/components/touch-controls";
import { TOUCH_CONFIG } from "@/lib/games/touch-config";

export default function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const { user, saveScore } = useSession();
  const engineFactory = ENGINE_REGISTRY[game.engine];
  // Tetris no tiene vidas múltiples (game over es un solo golpe) y su canvas
  // es vertical (300×600) en vez del 800×600 de Asteroides.
  const isTetris = game.id === "tetris";
  // Arkanoid dibuja su propio overlay de pausa (con selector de nivel) sobre
  // el canvas; el overlay genérico de React lo tapa y bloquea sus clics.
  const isArkanoid = game.id === "arkanoid";
  // Frogger usa canvas 640x560 (16x14 celdas de 40px) en vez del 800x600
  // estándar.
  const isFrogger = game.id === "frogger";
  const hasSkins = Boolean(SKINS[game.id as GameId]);

  // Arranca siempre en DEFAULT_SKIN para que el primer render del cliente
  // coincida con el HTML del servidor; la skin guardada se aplica después
  // de montar (ver efecto abajo), evitando un hydration mismatch.
  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [engineLevel, setEngineLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  // null = el jugador no ha escrito sus iniciales, así que manda la sesión.
  // La sesión llega después de montar (localStorage), por eso el nombre se
  // deriva en el render en vez de copiarse a estado con un efecto.
  const [typedName, setTypedName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const name = typedName ?? user?.name ?? "INVITADO";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);

  // Motor real: se monta una vez sobre el canvas y refleja su estado en el HUD.
  // La skin guardada en localStorage se lee aquí (client-only, post-montaje)
  // en vez de en el useState inicial, para que el primer render coincida con
  // el HTML del servidor y no dispare un hydration mismatch.
  useEffect(() => {
    if (!canvasRef.current) return;
    let initialSkin: SkinId = DEFAULT_SKIN;
    if (hasSkins) {
      const stored = window.localStorage.getItem("av_skin");
      if (stored === "clasico" || stored === "neon" || stored === "retro") {
        initialSkin = stored;
      }
    }
    setSkin(initialSkin);
    const palette = hasSkins
      ? getPalette(game.id as GameId, initialSkin)
      : undefined;
    const engine = engineFactory(
      canvasRef.current,
      {
        onScore: setScore,
        onLives: setLives,
        onLevel: setEngineLevel,
        onGameOver: () => setOver(true),
      },
      palette,
    );
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineFactory]);

  const changeSkin = (next: SkinId) => {
    setSkin(next);
    try {
      window.localStorage.setItem("av_skin", next);
    } catch {
      // localStorage puede fallar (modo privado); la skin sigue en memoria.
    }
    const palette = getPalette(game.id as GameId, next);
    if (palette) engineRef.current?.setPalette?.(palette);
  };

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      if (next) engineRef.current?.pause();
      else engineRef.current?.resume();
      return next;
    });
  };

  const finish = () => {
    engineRef.current?.pause();
    setOver(true);
  };

  const restart = () => {
    engineRef.current?.restart();
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          {!isTetris && (
            <div className="hud-stat lives">
              <div className="l">Vidas</div>
              <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
            </div>
          )}
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(engineLevel).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          {hasSkins && (
            <>
              <button
                className={`btn${skin === "clasico" ? " yellow" : " ghost"}`}
                onClick={() => changeSkin("clasico")}
              >
                CLÁSICO
              </button>
              <button
                className={`btn${skin === "neon" ? " yellow" : " ghost"}`}
                onClick={() => changeSkin("neon")}
              >
                NEÓN
              </button>
              <button
                className={`btn${skin === "retro" ? " yellow" : " ghost"}`}
                onClick={() => changeSkin("retro")}
              >
                RETRO
              </button>
            </>
          )}
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={finish}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/juegos/${game.id}`)}
          >
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            width={isTetris ? 300 : isFrogger ? 640 : 800}
            height={isFrogger ? 560 : 600}
            className={
              isTetris
                ? "tetris-canvas"
                : isFrogger
                  ? "frogger-canvas"
                  : "asteroides-canvas"
            }
          />
          {paused && !isArkanoid && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      <TouchControls config={TOUCH_CONFIG[game.id as GameId]} />

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setTypedName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={() => {
                    saveScore({ game: game.id, score, name });
                    insertScore(createClient(), {
                      gameId: game.id,
                      playerName: name,
                      score,
                    }).catch((err) => {
                      console.error(
                        "Error al guardar puntaje en Supabase:",
                        err,
                      );
                    });
                    setSaved(true);
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/biblioteca")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
