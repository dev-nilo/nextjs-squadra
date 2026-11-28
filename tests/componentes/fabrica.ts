import { DEFAULT_ATTRIBUTES } from "@/lib/jogador";
import type { Player } from "@/types";

/** A Jogador for a test, with only what the test cares about given. */
export function jogador(nome: string, extra: Partial<Player> = {}): Player {
  return {
    id: nome.toLowerCase().replace(/\W+/g, "-"),
    name: nome,
    position: "ATA",
    nationality: "BR",
    image: null,
    rating: 70,
    attributes: { ...DEFAULT_ATTRIBUTES },
    versao: 1,
    ...extra,
  };
}
