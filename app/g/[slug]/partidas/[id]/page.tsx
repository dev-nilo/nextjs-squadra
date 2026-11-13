import type { Metadata } from "next";
import { z } from "zod";
import Link from "next/link";
import { PartidaView } from "@/components/partida/partida-view";
import { carregarGrupo } from "@/lib/grupo-server";
import { lerPartida } from "@/lib/leitura-da-partida";

export const metadata: Metadata = { title: "Partida · Squadra" };

/**
 * One Partida. The first render comes from the server through the read model
 * (RLS-filtered); after that usePartidaAoVivo keeps it current in the browser.
 */
export default async function PartidaPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const ctx = await carregarGrupo(slug);
  // The layout shows the sign-in or not-found screen.
  if (ctx.status !== "pronto") return null;
  if (!z.string().uuid().safeParse(id).success) return <PartidaNaoEncontrada slug={slug} />;

  const { supabase, grupo, user, agora } = ctx;
  const lida = await lerPartida(supabase, grupo.id, id);
  if (!lida) return <PartidaNaoEncontrada slug={slug} />;
  const { jogadores, ...inicial } = lida;

  return (
    <PartidaView grupo={grupo} userId={user.id} inicial={inicial} jogadores={jogadores} agora={agora} />
  );
}

/** Inside the fut's frame: a Partida id that isn't this fut's (or doesn't exist). */
function PartidaNaoEncontrada({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <h1 className="text-title">Essa partida não existe</h1>
      <p className="text-muted">Ou ela é de outro fut.</p>
      <Link href={`/g/${encodeURIComponent(slug)}/partidas`} className="mt-2 font-semibold text-foreground underline-offset-4 hover:underline">
        Ver as partidas do fut
      </Link>
    </div>
  );
}
