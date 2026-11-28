import { useCallback, useState } from "react";
import type { PartidaAoVivo } from "@/lib/leitura-da-partida";
import { estadoDaPartida } from "@/lib/partida";

/**
 * A stand-in for hooks/use-partida-ao-vivo in component tests, with no Supabase
 * or Realtime. `servidor` is what the database would hold: a test (or a mocked
 * Server Action) changes it, and the page sees the change when it calls
 * `recarregar`, the way Realtime would make it read again.
 *
 *   vi.mock("@/hooks/use-partida-ao-vivo", () => import("@/tests/componentes/partida-ao-vivo"));
 */
export const servidor: { dados: PartidaAoVivo | null } = { dados: null };

export function usePartidaAoVivo(_grupoId: string, inicial: PartidaAoVivo, agora: number) {
  const [dados, setDados] = useState(inicial);
  const recarregar = useCallback(async () => {
    if (servidor.dados) setDados(servidor.dados);
  }, []);
  return { ...dados, aoVivo: true, recarregar, estado: estadoDaPartida(dados.partida, new Date(agora)) };
}
