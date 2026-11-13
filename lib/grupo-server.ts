import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Papel, Participacao, ParticipacaoDesde } from "@/lib/grupo";

export type ContextoDoGrupo =
  | { status: "sem-sessao" }
  | { status: "nao-encontrado"; user: User }
  | {
      status: "pronto";
      user: User;
      grupo: Participacao;
      supabase: Awaited<ReturnType<typeof createClient>>;
      /** When this request was handled, so the page and the browser agree on what's upcoming. */
      agora: number;
    };

/**
 * For Server Components under /g/<slug>: who is signed in and their papel in
 * that Grupo. RLS only returns Grupos the user is a Membro of, so a slug of
 * someone else's Grupo reads the same as one that doesn't exist.
 */
export async function carregarGrupo(slug: string): Promise<ContextoDoGrupo> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "sem-sessao" };

  const grupo = await resolverGrupo(supabase, user.id, slug);
  if (!grupo) return { status: "nao-encontrado", user };
  return { status: "pronto", user, grupo, supabase, agora: Date.now() };
}

/**
 * The Grupo at `slug` with the user's papel, or null when they aren't a
 * Membro of it (or it doesn't exist: RLS makes the two look the same). Pages
 * and Server Actions resolve the Grupo here, so neither trusts a Grupo id
 * from the browser.
 */
export async function resolverGrupo(supabase: SupabaseClient, userId: string, slug: string): Promise<Participacao | null> {
  const { data } = await supabase
    .from("grupo_membros")
    .select("papel, grupos!inner(id, slug, nome)")
    .eq("user_id", userId)
    .eq("grupos.slug", slug)
    .maybeSingle();

  const linha = data as { papel: Papel; grupos: { id: string; slug: string; nome: string } } | null;
  return linha?.grupos ? { ...linha.grupos, papel: linha.papel } : null;
}

type ClienteDoServidor = Awaited<ReturnType<typeof createClient>>;

/** Every Grupo the user is a Membro of, with since when. Null when the query failed. */
export async function carregarParticipacoes(
  supabase: ClienteDoServidor,
  userId: string,
): Promise<ParticipacaoDesde[] | null> {
  const { data, error } = await supabase
    .from("grupo_membros")
    .select("papel, created_at, grupos(id, slug, nome)")
    .eq("user_id", userId);
  if (error) return null;
  type Linha = { papel: Papel; created_at: string; grupos: { id: string; slug: string; nome: string } | null };
  return ((data ?? []) as unknown as Linha[]).flatMap((linha) =>
    linha.grupos ? [{ ...linha.grupos, papel: linha.papel, desde: linha.created_at }] : [],
  );
}
