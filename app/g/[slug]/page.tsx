import type { Metadata } from "next";
import { PartidaView } from "@/components/partida/partida-view";
import { PartidasView } from "@/components/partida/partidas-view";
import { carregarGrupo } from "@/lib/grupo-server";
import { lerHistorico, lerPartida, lerProximaPartida } from "@/lib/leitura-da-partida";

export const metadata: Metadata = { title: "Squadra" };

/**
 * The fut's home, where the app opens: the next Partida, since answering
 * "vou" and checking the list is what people come for. With none scheduled,
 * the history and, for organizers, "Nova partida".
 */
export default async function InicioDoFut({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await carregarGrupo(slug);
  // The layout shows the sign-in or not-found screen.
  if (ctx.status !== "pronto") return null;

  const { supabase, grupo, user, agora } = ctx;
  const proxima = await lerProximaPartida(supabase, grupo.id, agora);
  const lida = proxima ? await lerPartida(supabase, grupo.id, proxima) : null;

  if (lida) {
    const { jogadores, ...inicial } = lida;
    return (
      <PartidaView key={inicial.partida.id} grupo={grupo} userId={user.id} inicial={inicial} jogadores={jogadores} agora={agora} naInicio />
    );
  }

  const { partidas, frequencia } = await lerHistorico(supabase, grupo.id);
  return <PartidasView grupo={grupo} partidas={partidas} frequencia={frequencia} agora={agora} />;
}
