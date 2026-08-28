import type { Metadata } from "next";
import Counter from "@/components/counter";

export const metadata: Metadata = {
  title: "Contador · Arcade Vault",
  description: "Página de contador con imágenes de Pokémon.",
};

export default function ContadorPage() {
  return (
    <main className="av-main">
      <Counter />
    </main>
  );
}
