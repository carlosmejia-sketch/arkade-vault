"use client";

import { useState } from "react";

const MAX_POKEMON = 1025;
const SPRITES_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export default function Counter() {
  const [count, setCount] = useState(1);

  const pokemonId = ((count - 1) % MAX_POKEMON) + 1;

  return (
    <div className="fade-in" style={{ padding: "48px 16px" }}>
      <div
        className="card"
        style={{ textAlign: "center", maxWidth: 360, margin: "0 auto" }}
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
          src={`${SPRITES_URL}/${pokemonId}.png`}
          alt={`Pokémon #${pokemonId}`}
          width={160}
          height={160}
          style={{ imageRendering: "pixelated", marginBottom: 24 }}
        />

        <button
          className="btn xl press"
          type="button"
          onClick={() => setCount((actual) => actual + 1)}
        >
          ▶ INCREMENTAR
        </button>
      </div>
    </div>
  );
}
