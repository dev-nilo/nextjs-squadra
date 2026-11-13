import type { Metadata } from "next";
import { PartidasView } from "@/components/partida/partidas-view";
import { carregarGrupo } from "@/lib/grupo-server";
import { lerHistorico } from "@/lib/leitura-da-partida";

export const metadata: Metadata = { title: "Partidas · Squadra" };

/** Every Partida of the fut, upcoming first, then the history and Frequência. */
export default async function PartidasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await carregarGrupo(slug);
  // The layout shows the sign-in or not-found screen.
  if (ctx.status !== "pronto") return null;

  const { supabase, grupo, agora } = ctx;
  const { partidas, frequencia } = await lerHistorico(supabase, grupo.id);
  return <PartidasView grupo={grupo} partidas={partidas} frequencia={frequencia} agora={agora} />;
}
