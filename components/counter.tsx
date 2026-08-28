"use client";

import { useState } from "react";

const MAX_POKEMON = 1025;

export default function Counter() {
  const [count, setCount] = useState(1);

  const pokemonId = ((count - 1) % MAX_POKEMON) + 1;
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

  return (
    <div
      className="fade-in"
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "48px 16px",
      }}
    >
      <div
        className="card"
        style={{ textAlign: "center", maxWidth: 360, width: "100%" }}
      >
        <div className="kicker pixel neon-cyan" style={{ marginBottom: 16 }}>
          ▸ CONTADOR
        </div>

        <div
          className="mono"
          style={{ fontSize: 48, color: "var(--cyan)", marginBottom: 16 }}
        >
          {count}
        </div>

        <img
          key={pokemonId}
          src={spriteUrl}
          alt={`Pokémon #${pokemonId}`}
          width={160}
          height={160}
          style={{ imageRendering: "pixelated", margin: "0 auto 24px" }}
        />

        <button
          className="btn xl press"
          type="button"
          onClick={() => setCount((c) => c + 1)}
        >
          ▶ INCREMENTAR
        </button>
      </div>
    </div>
  );
}
