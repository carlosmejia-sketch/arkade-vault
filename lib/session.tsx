"use client";

// Sesión real vía Supabase Auth (email/password, Google, GitHub), con un modo
// invitado aparte que sigue sin tocar Supabase (solo localStorage).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { deriveAlias } from "@/lib/auth-alias";

export type SessionUser = {
  /** Alias en mayúsculas, máximo 10 caracteres: "PX_KAI". */
  name: string;
  email: string | null;
  isGuest: boolean;
};

export type SavedScore = {
  game: string;
  score: number;
  name: string;
  at: number;
};

const GUEST_KEY = "av_guest";
const SCORES_KEY = "av_scores";

type SessionValue = {
  user: SessionUser | null;
  signInGuest: (name: string) => void;
  signOut: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  // Arranca en null en servidor y cliente; la sesión real/invitado se resuelve
  // tras montar para no romper la hidratación.
  const [user, setUser] = useState<SessionUser | null>(null);

  const loadGuest = useCallback(() => {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (raw) {
        const guest = JSON.parse(raw) as { name: string };
        setUser({ name: guest.name, email: null, isGuest: true });
        return;
      }
    } catch {
      // JSON corrupto: se descarta y se trata como sin sesión.
    }
    setUser(null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          name: deriveAlias(session.user),
          email: session.user.email ?? null,
          isGuest: false,
        });
      } else {
        loadGuest();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        try {
          localStorage.removeItem(GUEST_KEY);
        } catch {}
        setUser({
          name: deriveAlias(session.user),
          email: session.user.email ?? null,
          isGuest: false,
        });
      } else {
        loadGuest();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadGuest]);

  const signInGuest = useCallback((name: string) => {
    const alias = (name || "PLAYER1").toUpperCase().slice(0, 10);
    setUser({ name: alias, email: null, isGuest: true });
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify({ name: alias }));
    } catch {}
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {}
    if (!user?.isGuest) {
      supabase.auth.signOut();
    }
  }, [supabase, user]);

  const saveScore = useCallback((entry: Omit<SavedScore, "at">) => {
    try {
      const all = JSON.parse(
        localStorage.getItem(SCORES_KEY) || "[]",
      ) as SavedScore[];
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {}
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, signInGuest, signOut, saveScore }),
    [user, signInGuest, signOut, saveScore],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  }
  return value;
}
