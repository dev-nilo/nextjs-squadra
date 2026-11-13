import type { Papel } from "@/lib/grupo";
import type { EstadoDaPartida } from "@/lib/partida";

/**
 * What a Membro can do in their Grupo, by papel, so every screen shows the
 * same buttons the database accepts. This only decides what's shown: RLS and
 * the database functions enforce each rule (named next to it), and the Server
 * Actions don't check papéis in TypeScript (ADR 0007).
 *
 * Pure, so a client component computes it from the Grupo's papel it already
 * has. Functions can't travel from a Server Component to a client one.
 */

/** A Jogador as far as these rules care: whose account it's linked to, if anyone's. */
type JogadorComConta = { conta_id?: string | null };

export type Capacidades = {
  /** Create, edit, delete and import Jogadores. Policies players_*_gestor. */
  editaElenco: boolean;
  /** Create and cancel Convites. Policies on convites. */
  convida: boolean;
  /** Create, edit and cancel Partidas; draw, adjust and publish the Sorteio. Policies on partidas; salvar_sorteio, mover_no_sorteio, publicar_sorteio. */
  gerePartidas: boolean;
  /** Answer vou / não vou for this Jogador. responder_presenca. */
  respondePor(jogador: JogadorComConta, estado: EstadoDaPartida): boolean;
  /** Unlink this Jogador from its account. desvincular_jogador. */
  desvincula(jogador: JogadorComConta): boolean;
};

export function capacidades(papel: Papel, userId: string | null): Capacidades {
  const organiza = papel === "dono" || papel === "admin";
  const ehDela = (jogador: JogadorComConta) => userId !== null && jogador.conta_id === userId;

  return {
    editaElenco: organiza,
    convida: organiza,
    gerePartidas: organiza,
    // A Membro answers for their own Jogador until the Partida starts; the
    // dono and admins answer for anyone until it's cancelled, to record who
    // really showed up.
    respondePor: (jogador, estado) => estado !== "cancelada" && (organiza || (estado === "aberta" && ehDela(jogador))),
    // Whoever linked the wrong Jogador can undo it themselves.
    desvincula: (jogador) => jogador.conta_id != null && (organiza || ehDela(jogador)),
  };
}
