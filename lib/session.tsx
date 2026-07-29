"use client";

// Sesión simulada sobre localStorage, equivalente al estado que app.jsx tenía
// en el componente App. No hay autenticación real: cualquier nombre entra.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type SessionUser = {
  /** Alias en mayúsculas, máximo 10 caracteres: "PX_KAI". */
  name: string;
};

export type SavedScore = {
  game: string;
  score: number;
  name: string;
  at: number;
};

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

type SessionValue = {
  user: SessionUser | null;
  signIn: (user: SessionUser) => void;
  signOut: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Arranca en null en servidor y cliente; av_user se lee tras montar para no
  // romper la hidratación.
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      // Lectura diferida intencional: av_user no existe en el servidor, así que
      // el primer render debe pintar sin sesión para no romper la hidratación.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setUser(JSON.parse(raw) as SessionUser);
    } catch {
      // JSON corrupto: se descarta y se trata como sin sesión.
    }
  }, []);

  const signIn = useCallback((next: SessionUser) => {
    setUser(next);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {}
  }, []);

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
    () => ({ user, signIn, signOut, saveScore }),
    [user, signIn, signOut, saveScore],
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
