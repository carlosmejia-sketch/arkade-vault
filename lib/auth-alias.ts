type AliasSource = {
  user_metadata?: Record<string, unknown>;
  email?: string | null;
};

function normalize(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "").slice(0, 10);
}

/**
 * Deriva el alias de leaderboard (mayúsculas, sin espacios, máx 10 chars) de
 * un usuario de Supabase Auth. Prioriza el username elegido en el registro
 * por email/password, luego metadata específica de OAuth, y cae al email.
 */
export function deriveAlias(user: AliasSource): string {
  const metadata = user.user_metadata ?? {};

  const candidates = [
    metadata.username, // email/password: elegido en el formulario de registro
    metadata.user_name, // GitHub: handle
    metadata.full_name, // Google: nombre completo
    metadata.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return normalize(candidate);
    }
  }

  const emailLocalPart = user.email?.split("@")[0];
  if (emailLocalPart) {
    return normalize(emailLocalPart);
  }

  return "JUGADOR";
}
