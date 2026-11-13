import type { Metadata } from "next";
import { PessoasView } from "@/components/pessoas/pessoas-view";
import { carregarGrupo } from "@/lib/grupo-server";
import type { Pessoa } from "@/lib/pessoas";

export const metadata: Metadata = { title: "Pessoas · Squadra" };

/** Who's in the fut, with their papéis (pessoas_do_grupo: emails only for the dono and admins). */
export default async function PessoasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await carregarGrupo(slug);
  // The layout shows the sign-in or not-found screen.
  if (ctx.status !== "pronto") return null;

  const { supabase, user, grupo } = ctx;
  const { data, error } = await supabase.rpc("pessoas_do_grupo", { grupo: grupo.id });
  if (error) throw new Error(`Could not load the fut's people: ${error.message}`);

  return <PessoasView key={grupo.id} grupo={grupo} pessoas={(data ?? []) as Pessoa[]} userId={user.id} />;
}
