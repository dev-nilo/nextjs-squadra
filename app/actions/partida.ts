"use server";

import * as acoes from "@/lib/acoes/partida";
import type { DadosDaPartida } from "@/lib/acoes/partida";
import { revalidandoOGrupo } from "@/lib/acoes/revalidar";
import { createClient } from "@/lib/supabase/server";

// Adapters: the Supabase client from the request's cookies, then lib/acoes (ADR 0007).

export async function criarPartida(slug: string, dados: DadosDaPartida) {
  return revalidandoOGrupo(slug, await acoes.criarPartida(await createClient(), slug, dados));
}

export async function editarPartida(slug: string, partidaId: string, dados: DadosDaPartida) {
  return revalidandoOGrupo(slug, await acoes.editarPartida(await createClient(), slug, partidaId, dados));
}

export async function cancelarPartida(slug: string, partidaId: string) {
  return revalidandoOGrupo(slug, await acoes.cancelarPartida(await createClient(), slug, partidaId));
}

export async function responderPresenca(slug: string, partidaId: string, jogadorId: string, vou: boolean) {
  return revalidandoOGrupo(slug, await acoes.responderPresenca(await createClient(), slug, partidaId, jogadorId, vou));
}
