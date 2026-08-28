"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user, signOut } = useSession();

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const homeActive = pathname === "/";
  // "Biblioteca" cubre /biblioteca y todo el árbol de /juegos (detalle y reproductor).
  const libraryActive =
    pathname === "/biblioteca" || pathname.startsWith("/juegos");
  const hallActive = pathname === "/salon";
  const aboutActive = pathname === "/acerca-de";
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
          <Link className={aboutActive ? "active" : ""} href="/acerca-de">
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <div className="user-menu" ref={menuRef}>
            <button
              className="btn ghost auth-btn user-trigger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
            >
              <span className="avatar" aria-hidden="true">
                {user.name.charAt(0)}
              </span>
              {user.name} ▾
            </button>
            {menuOpen && (
              <div className="user-dropdown">
                <button
                  className="user-dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
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
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link className={homeActive ? "active" : ""} href="/" onClick={close}>
          Inicio
        </Link>
        <Link
          className={libraryActive ? "active" : ""}
          href="/biblioteca"
          onClick={close}
        >
          Biblioteca
        </Link>
        <Link
          className={hallActive ? "active" : ""}
          href="/salon"
          onClick={close}
        >
          Salón de la Fama
        </Link>
        <Link
          className={aboutActive ? "active" : ""}
          href="/acerca-de"
          onClick={close}
        >
          Acerca de
        </Link>
        <Link
          className={authActive ? "active" : ""}
          href="/acceso"
          onClick={close}
        >
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
