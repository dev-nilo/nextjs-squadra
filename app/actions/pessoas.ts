"use server";

import { revalidatePath } from "next/cache";
import * as acoes from "@/lib/acoes/pessoas";
import { revalidandoOGrupo } from "@/lib/acoes/revalidar";
import { createClient } from "@/lib/supabase/server";

// Adapters: the Supabase client from the request's cookies, then lib/acoes (ADR 0007).

export async function mudarPapel(slug: string, pessoaId: string, papel: string) {
  return revalidandoOGrupo(slug, await acoes.mudarPapel(await createClient(), slug, pessoaId, papel));
}

export async function removerDoFut(slug: string, pessoaId: string) {
  return revalidandoOGrupo(slug, await acoes.removerDoFut(await createClient(), slug, pessoaId));
}

export async function passarPosse(slug: string, pessoaId: string) {
  return revalidandoOGrupo(slug, await acoes.passarPosse(await createClient(), slug, pessoaId));
}

export async function renomearFut(slug: string, nome: string) {
  return revalidandoOGrupo(slug, await acoes.renomearFut(await createClient(), slug, nome));
}

/** Leaving or deleting: the fut's pages and `/` (which picks where to land) render again. */
export async function sairDoFut(slug: string) {
  const resultado = await acoes.sairDoFut(await createClient(), slug);
  if (resultado.ok) revalidatePath("/", "layout");
  return resultado;
}

export async function excluirFut(slug: string, confirmacao: string) {
  const resultado = await acoes.excluirFut(await createClient(), slug, confirmacao);
  if (resultado.ok) revalidatePath("/", "layout");
  return resultado;
}
