"use server";

import * as acoes from "@/lib/acoes/convite";
import { revalidandoOGrupo } from "@/lib/acoes/revalidar";
import { createClient } from "@/lib/supabase/server";

export type { Convite } from "@/lib/acoes/convite";

// Adapters: the Supabase client from the request's cookies, then lib/acoes (ADR 0007).

export async function criarConvite(slug: string) {
  return acoes.criarConvite(await createClient(), slug);
}

export async function revogarConvite(slug: string, conviteId: string) {
  return acoes.revogarConvite(await createClient(), slug, conviteId);
}

export async function aceitarConvite(token: string) {
  const resultado = await acoes.aceitarConvite(await createClient(), token);
  return resultado.ok ? revalidandoOGrupo(resultado.valor.slug, resultado) : resultado;
}
