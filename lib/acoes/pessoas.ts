import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validarNomeDoGrupo } from "@/lib/grupo";
import { MOTIVO_DAS_PESSOAS, papelDadoSchema, type Pessoa } from "@/lib/pessoas";
import { PLAYER_IMAGES_BUCKET } from "@/lib/player-image";
import { exigir, idSchema, noGrupo, recusar, validar } from "./executar";

/*
 * People and the fut itself. Every rule (who may, never zero or two donos,
 * leaving unlinks your Jogador, the typed name) lives in the database
 * function each action calls; these only validate input and translate the
 * refusal (ADR 0007).
 */

const opcoes = (acao: string, generica: string) => ({ acao, generica, motivos: MOTIVO_DAS_PESSOAS });

/** Who's in the fut, dono first. Emails only come back for the dono and admins. */
export const lerPessoas = (supabase: SupabaseClient, slug: unknown) =>
  noGrupo(supabase, slug, opcoes("lerPessoas", "Não deu pra carregar as pessoas agora."), async ({ grupo }) =>
    exigir(await supabase.rpc("pessoas_do_grupo", { grupo: grupo.id })) as Pessoa[],
  );

/** The dono makes someone admin or membro. */
export const mudarPapel = (supabase: SupabaseClient, slug: unknown, pessoaId: unknown, papel: unknown) =>
  noGrupo(supabase, slug, opcoes("mudarPapel", "Não deu pra mudar o papel agora. Tenta de novo."), async ({ grupo }) => {
    const pessoa = validar(idSchema, pessoaId, "Pessoa inválida.");
    const novo = validar(papelDadoSchema, papel, "Papel inválido.");
    exigir(await supabase.rpc("mudar_papel", { grupo: grupo.id, pessoa, novo }));
    return null;
  });

/** The dono removes someone; their Jogador stays in the Elenco, unlinked. */
export const removerDoFut = (supabase: SupabaseClient, slug: unknown, pessoaId: unknown) =>
  noGrupo(supabase, slug, opcoes("removerDoFut", "Não deu pra remover agora. Tenta de novo."), async ({ grupo }) => {
    const pessoa = validar(idSchema, pessoaId, "Pessoa inválida.");
    exigir(await supabase.rpc("remover_do_grupo", { grupo: grupo.id, pessoa }).then(semValor));
    return null;
  });

/** A membro or admin leaves; the dono hands the fut over first. */
export const sairDoFut = (supabase: SupabaseClient, slug: unknown) =>
  noGrupo(supabase, slug, opcoes("sairDoFut", "Não deu pra sair agora. Tenta de novo."), async ({ grupo }) => {
    exigir(await supabase.rpc("sair_do_grupo", { grupo: grupo.id }).then(semValor));
    return { nome: grupo.nome };
  });

/** The dono hands the fut to an admin and becomes an admin. */
export const passarPosse = (supabase: SupabaseClient, slug: unknown, pessoaId: unknown) =>
  noGrupo(supabase, slug, opcoes("passarPosse", "Não deu pra passar o fut agora. Tenta de novo."), async ({ grupo }) => {
    const pessoa = validar(idSchema, pessoaId, "Pessoa inválida.");
    exigir(await supabase.rpc("passar_posse", { grupo: grupo.id, pessoa }).then(semValor));
    return null;
  });

/** The dono renames the fut; the slug (and every link) stays. */
export const renomearFut = (supabase: SupabaseClient, slug: unknown, nome: unknown) =>
  noGrupo(supabase, slug, opcoes("renomearFut", "Não deu pra renomear agora. Tenta de novo."), async ({ grupo }) => {
    const validacao = validarNomeDoGrupo(nome);
    if (!validacao.ok) recusar(validacao.message);
    exigir(await supabase.rpc("renomear_grupo", { grupo: grupo.id, nome: validacao.nome }));
    return { nome: validacao.nome };
  });

/**
 * The dono deletes the fut, with its name typed to confirm. Photos first: the
 * Storage policy needs the dono's papel, which goes with the fut.
 */
export const excluirFut = (supabase: SupabaseClient, slug: unknown, confirmacao: unknown) =>
  noGrupo(supabase, slug, opcoes("excluirFut", "Não deu pra excluir agora. Tenta de novo."), async ({ grupo }) => {
    const digitado = typeof confirmacao === "string" ? confirmacao.trim() : "";
    // The one place a papel is checked here (ADR 0007): deleting the photos
    // can't be undone, and an admin may delete photos, so refuse before
    // touching Storage. excluir_grupo checks both again.
    if (grupo.papel !== "dono") recusar(MOTIVO_DAS_PESSOAS["sem-permissao"]);
    if (digitado.toLowerCase() !== grupo.nome.trim().toLowerCase()) recusar(MOTIVO_DAS_PESSOAS["nome-nao-confere"]);
    await apagarFotos(supabase, grupo.id);
    exigir(await supabase.rpc("excluir_grupo", { grupo: grupo.id, confirmacao: digitado }).then(semValor));
    return { nome: grupo.nome };
  });

/** A void function returns no data: give `exigir` a value to tell success from "no row". */
function semValor<E>({ error }: { error: E }) {
  return { data: true as const, error };
}

/** The fut's photos in Storage (`<grupo_id>/…`). Best effort: a leftover file costs storage, not correctness. */
async function apagarFotos(supabase: SupabaseClient, grupoId: string) {
  try {
    const bucket = supabase.storage.from(PLAYER_IMAGES_BUCKET);
    const { data } = await bucket.list(grupoId, { limit: 1000 });
    const caminhos = (data ?? []).map((f) => `${grupoId}/${f.name}`);
    if (caminhos.length > 0) await bucket.remove(caminhos);
  } catch (e) {
    console.error("[excluirFut] Photo cleanup failed:", e);
  }
}
