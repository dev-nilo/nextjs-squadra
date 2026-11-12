"use server";

import * as acoes from "@/lib/acoes/sorteio";
import { revalidandoOGrupo } from "@/lib/acoes/revalidar";
import { createClient } from "@/lib/supabase/server";

// Adapters: the Supabase client from the request's cookies, then lib/acoes (ADR 0007).

export async function sortearDaPartida(slug: string, partidaId: string, numTimes: number) {
  return revalidandoOGrupo(slug, await acoes.sortearDaPartida(await createClient(), slug, partidaId, numTimes));
}

export async function moverNoSorteio(slug: string, partidaId: string, jogadorId: string, paraTime: number, sorteadoEm: string) {
  return revalidandoOGrupo(slug, await acoes.moverNoSorteio(await createClient(), slug, partidaId, jogadorId, paraTime, sorteadoEm));
}

export async function publicarSorteio(slug: string, partidaId: string) {
  return revalidandoOGrupo(slug, await acoes.publicarSorteio(await createClient(), slug, partidaId));
}
