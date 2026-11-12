"use server";

import * as acoes from "@/lib/acoes/jogador";
import { revalidandoOGrupo } from "@/lib/acoes/revalidar";
import { createClient } from "@/lib/supabase/server";

// Adapters: the Supabase client from the request's cookies, then lib/acoes (ADR 0007).

export async function salvarJogador(slug: string, dados: unknown) {
  return revalidandoOGrupo(slug, await acoes.salvarJogador(await createClient(), slug, dados));
}

export async function excluirJogador(slug: string, jogadorId: string) {
  return revalidandoOGrupo(slug, await acoes.excluirJogador(await createClient(), slug, jogadorId));
}

export async function importarJogadores(slug: string, dados: unknown) {
  return revalidandoOGrupo(slug, await acoes.importarJogadores(await createClient(), slug, dados));
}
