"use client";

import { useEffect, useMemo, useState } from "react";
import { GAMES, getGame } from "@/lib/games";
import { fetchTopScores, seededScores, type RealScoreRow } from "@/lib/scores";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/session";

export default function HallOfFame() {
  const { user } = useSession();
  const [tab, setTab] = useState(GAMES[0].id);
  const game = getGame(tab);
  const hasRealLeaderboard = Boolean(game?.engine);

  // Misma semilla que el template para que el ranking coincida.
  const mockRows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);

  const [realData, setRealData] = useState<{
    tab: string;
    rows: RealScoreRow[];
  } | null>(null);

  useEffect(() => {
    if (!hasRealLeaderboard) return;
    let cancelled = false;
    fetchTopScores(createClient(), tab, 12).then((data) => {
      if (!cancelled) setRealData({ tab, rows: data });
    });
    return () => {
      cancelled = true;
    };
  }, [hasRealLeaderboard, tab]);

  const realRows = realData?.tab === tab ? realData.rows : null;
  const rows = hasRealLeaderboard ? (realRows ?? []) : mockRows;
  const youRank = Math.floor(8 + (tab.length % 4));
  const youScore = mockRows[5]?.score - 2400;

  const youReal = hasRealLeaderboard
    ? rows
        .filter((r) => r.name === user?.name)
        .sort((a, b) => b.score - a.score)[0]
    : undefined;

  const loading = hasRealLeaderboard && realRows === null;
  const showPodium = !hasRealLeaderboard || rows.length >= 3;
  const showTable = !hasRealLeaderboard || rows.length > 0;
  const showEmpty = hasRealLeaderboard && !loading && rows.length === 0;

  return (
    <>
      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: "var(--ink-dim)" }}>CARGANDO...</p>}

      {showEmpty && (
        <p style={{ color: "var(--ink-dim)" }}>AÚN NO HAY PUNTAJES</p>
      )}

      {showPodium && rows.length >= 3 && (
        <div className="podium">
          <div className="podium-slot silver">
            <div className="rank-num">02</div>
            <div className="name">{rows[1].name}</div>
            <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
            <div className="date">{rows[1].date}</div>
          </div>
          <div className="podium-slot gold">
            <div
              className="pixel"
              style={{
                fontSize: 9,
                color: "var(--gold)",
                letterSpacing: "0.18em",
              }}
            >
              CAMPEÓN
            </div>
            <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
              01
            </div>
            <div className="name">{rows[0].name}</div>
            <div className="score" style={{ fontSize: 20 }}>
              {rows[0].score.toLocaleString("es-ES")}
            </div>
            <div className="date">{rows[0].date}</div>
          </div>
          <div className="podium-slot bronze">
            <div className="rank-num">03</div>
            <div className="name">{rows[2].name}</div>
            <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
            <div className="date">{rows[2].date}</div>
          </div>
        </div>
      )}

      {showTable && rows.length > 0 && (
        <div className="hall-table">
          <div className="th">
            <div>RANGO</div>
            <div>JUGADOR</div>
            <div>PUNTUACIÓN</div>
            <div>FECHA</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.name + i}
              className={
                "tr" +
                (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
              }
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              <div className="dt">{r.date}</div>
            </div>
          ))}
          {!hasRealLeaderboard && user && (
            <>
              <div className="tr you-label">
                ▸ TU MEJOR MARCA EN {game?.title}
              </div>
              <div
                className="tr you"
                style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
              >
                <div className="rk" style={{ color: "var(--yellow)" }}>
                  #{String(youRank).padStart(2, "0")}
                </div>
                <div className="pl" style={{ color: "var(--yellow)" }}>
                  {user.name}
                </div>
                <div
                  className="sc"
                  style={{
                    color: "var(--yellow)",
                    textShadow: "0 0 6px rgba(245,255,0,0.5)",
                  }}
                >
                  {(youScore || 9999).toLocaleString("es-ES")}
                </div>
                <div className="dt">11/05/2026</div>
              </div>
            </>
          )}
          {hasRealLeaderboard && user && youReal && (
            <>
              <div className="tr you-label">
                ▸ TU MEJOR MARCA EN {game?.title}
              </div>
              <div
                className="tr you"
                style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
              >
                <div className="rk" style={{ color: "var(--yellow)" }}>
                  #{String(youReal.rank).padStart(2, "0")}
                </div>
                <div className="pl" style={{ color: "var(--yellow)" }}>
                  {user.name}
                </div>
                <div
                  className="sc"
                  style={{
                    color: "var(--yellow)",
                    textShadow: "0 0 6px rgba(245,255,0,0.5)",
                  }}
                >
                  {youReal.score.toLocaleString("es-ES")}
                </div>
                <div className="dt">{youReal.date}</div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
