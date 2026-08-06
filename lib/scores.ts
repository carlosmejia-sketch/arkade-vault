import type { SupabaseClient } from "@supabase/supabase-js";

export type RealScoreRow = {
  rank: number;
  name: string;
  score: number;
  /** Fecha ya renderizada en formato dd/mm/yyyy. */
  date: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getFullYear()}`;
}

export async function fetchTopScores(
  supabase: SupabaseClient,
  gameId: string,
  limit: number,
): Promise<RealScoreRow[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

export type RecentScoreRow = {
  playerName: string;
  gameId: string;
  score: number;
  /** ISO, el consumidor calcula el "hace X min". */
  createdAt: string;
};

export async function fetchRecentScores(
  supabase: SupabaseClient,
  limit: number,
): Promise<RecentScoreRow[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, game_id, score, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    playerName: row.player_name,
    gameId: row.game_id,
    score: row.score,
    createdAt: row.created_at,
  }));
}

export async function fetchTopScoresAllGames(
  supabase: SupabaseClient,
  limit: number,
): Promise<RealScoreRow[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

export async function insertScore(
  supabase: SupabaseClient,
  entry: { gameId: string; playerName: string; score: number },
): Promise<void> {
  const { error } = await supabase.from("scores").insert({
    game_id: entry.gameId,
    player_name: entry.playerName,
    score: entry.score,
  });

  if (error) throw error;
}
