"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/session";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useSession();

  const homeActive = pathname === "/";
  // "Biblioteca" cubre /biblioteca y todo el árbol de /juegos (detalle y reproductor).
  const libraryActive = pathname === "/biblioteca" || pathname.startsWith("/juegos");
  const hallActive = pathname === "/salon";
  const authActive = pathname === "/acceso";

  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link className="logo" href="/">
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link className={homeActive ? "active" : ""} href="/">
            Inicio
          </Link>
          <Link className={libraryActive ? "active" : ""} href="/biblioteca">
            Biblioteca
          </Link>
          <Link className={hallActive ? "active" : ""} href="/salon">
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={signOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link className="btn auth-btn" href="/acceso">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link className={homeActive ? "active" : ""} href="/" onClick={close}>
          Inicio
        </Link>
        <Link className={libraryActive ? "active" : ""} href="/biblioteca" onClick={close}>
          Biblioteca
        </Link>
        <Link className={hallActive ? "active" : ""} href="/salon" onClick={close}>
          Salón de la Fama
        </Link>
        <Link className={authActive ? "active" : ""} href="/acceso" onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
