import { notFound } from "next/navigation";
import GamePlayer from "@/components/game-player";
import { GAMES, getGame } from "@/lib/games";

export function generateStaticParams() {
  return GAMES.map((game) => ({ id: game.id }));
}

export default async function GamePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return (
    <main className="av-main">
      <GamePlayer game={game} />
    </main>
  );
}
