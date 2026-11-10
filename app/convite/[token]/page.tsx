import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { situacaoDoConvite, tokenDoConviteSchema, type SituacaoDoConvite } from "@/lib/convite";
import { ConviteView } from "@/components/convite/convite-view";

export const metadata: Metadata = {
  title: "Convite pro fut · Squadra",
  // The link is a secret: keep it out of search results and link previews' referrers.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function verConvite(token: string): Promise<{ situacao: SituacaoDoConvite; grupoNome: string | null }> {
  if (!tokenDoConviteSchema.safeParse(token).success) return { situacao: "inexistente", grupoNome: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("ver_convite", { token_do_convite: token })
    .single<{ situacao: string; grupo_nome: string | null }>();
  if (error || !data) return { situacao: "inexistente", grupoNome: null };
  return { situacao: situacaoDoConvite(data.situacao), grupoNome: data.grupo_nome };
}

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { situacao, grupoNome } = await verConvite(token);
  return <ConviteView token={token} situacao={situacao} grupoNome={grupoNome} />;
}
