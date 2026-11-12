"use server";

import * as acoes from "@/lib/acoes/vinculo";
import { revalidandoOGrupo } from "@/lib/acoes/revalidar";
import { createClient } from "@/lib/supabase/server";

// Adapters: the Supabase client from the request's cookies, then lib/acoes (ADR 0007).

export async function vincularJogador(slug: string, jogadorId: string) {
  return revalidandoOGrupo(slug, await acoes.vincularJogador(await createClient(), slug, jogadorId));
}

export async function criarMeuJogador(slug: string, nome: string, posicao: string) {
  return revalidandoOGrupo(slug, await acoes.criarMeuJogador(await createClient(), slug, nome, posicao));
}

export async function desvincularJogador(slug: string, jogadorId: string) {
  return revalidandoOGrupo(slug, await acoes.desvincularJogador(await createClient(), slug, jogadorId));
}
