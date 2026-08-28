"use client";

// Sesión real vía Supabase Auth (email/password, Google, GitHub).

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
  email: string;
};

export type SavedScore = {
  game: string;
  score: number;
  name: string;
  at: number;
};

const SCORES_KEY = "av_scores";

type SessionValue = {
  user: SessionUser | null;
  signOut: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  // Arranca en null en servidor y cliente; la sesión real se resuelve tras
  // montar para no romper la hidratación.
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          name: deriveAlias(session.user),
          email: session.user.email ?? "",
        });
      } else {
        setUser(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          name: deriveAlias(session.user),
          email: session.user.email ?? "",
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = useCallback(() => {
    setUser(null);
    supabase.auth.signOut();
  }, [supabase]);

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
    () => ({ user, signOut, saveScore }),
    [user, signOut, saveScore],
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
