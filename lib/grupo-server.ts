import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Papel, Participacao } from "@/lib/grupo";

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

  const { data } = await supabase
    .from("grupo_membros")
    .select("papel, grupos!inner(id, slug, nome)")
    .eq("user_id", user.id)
    .eq("grupos.slug", slug)
    .maybeSingle();

  const linha = data as { papel: Papel; grupos: { id: string; slug: string; nome: string } } | null;
  if (!linha?.grupos) return { status: "nao-encontrado", user };
  return { status: "pronto", user, grupo: { ...linha.grupos, papel: linha.papel }, supabase, agora: Date.now() };
}

export const ehGestor = (papel: Papel) => papel === "dono" || papel === "admin";
