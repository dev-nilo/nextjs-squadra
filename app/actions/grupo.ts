"use server";

import * as acoes from "@/lib/acoes/grupo";
import type { Participacao } from "@/lib/grupo";
import { createClient } from "@/lib/supabase/server";

export type CriarGrupoState =
  | { status: "idle" }
  | { status: "error"; message: string; nome: string }
  | { status: "ok"; grupo: Participacao };

/** Adapter for useActionState: the form's name in, lib/acoes/grupo's Resultado out as a state (ADR 0007). */
export async function criarGrupo(_prev: CriarGrupoState, formData: FormData): Promise<CriarGrupoState> {
  const raw = formData.get("nome");
  const nome = typeof raw === "string" ? raw : "";
  const resultado = await acoes.criarGrupo(await createClient(), nome);
  return resultado.ok ? { status: "ok", grupo: resultado.valor } : { status: "error", message: resultado.message, nome };
}
