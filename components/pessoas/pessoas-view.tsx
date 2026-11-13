"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { capacidades, SO_LEITURA } from "@/lib/capacidades";
import type { Participacao } from "@/lib/grupo";
import { caminhoDaAba } from "@/lib/navegacao";
import { nomeDaPessoa, O_QUE_O_PAPEL_FAZ, type Pessoa } from "@/lib/pessoas";
import { useSemConexao } from "@/lib/pwa/conexao";
import { ConvitesDoFut } from "./convites-do-fut";
import { FolhaDaPessoa } from "./folha-da-pessoa";
import { ZonaDePerigo } from "./zona-de-perigo";

/**
 * `/g/<slug>/pessoas`: who's in the fut and with which papel. Everyone sees
 * the list; the dono taps a person to change their papel, hand the fut over or
 * remove them. The dono and admins get the Convites; the dono, the fut itself.
 */
export function PessoasView({ grupo, pessoas, userId }: { grupo: Participacao; pessoas: Pessoa[]; userId: string }) {
  const semConexao = useSemConexao();
  const pode = semConexao ? SO_LEITURA : capacidades(grupo.papel, userId);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  // From the props, so the sheet follows the page as it re-renders after a change.
  const aberta = pessoas.find((p) => p.user_id === abertaId) ?? null;

  const organizam = pessoas.filter((p) => p.papel !== "membro");
  const membros = pessoas.filter((p) => p.papel === "membro");

  const lista = (titulo: string, quem: Pessoa[]) =>
    quem.length > 0 && (
      <section aria-label={titulo} className="flex flex-col gap-2">
        <h2 className="text-label">
          {titulo} <span className="tabular-nums">{quem.length}</span>
        </h2>
        <ul className="flex flex-col divide-y divide-divider rounded-2xl border border-divider bg-content1">
          {quem.map((pessoa) => (
            <LinhaDaPessoa
              key={pessoa.user_id}
              pessoa={pessoa}
              eVoce={pessoa.user_id === userId}
              mostraEmail={pode.veEmails}
              onAbrir={pode.gerePessoas && pessoa.user_id !== userId && pessoa.papel !== "dono" ? () => setAbertaId(pessoa.user_id) : undefined}
            />
          ))}
        </ul>
      </section>
    );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link href={caminhoDaAba(grupo.slug, "voce")} className="flex w-fit items-center gap-1 text-sm font-medium text-default-500 hover:text-foreground">
          <ArrowLeft size={16} aria-hidden="true" /> Você
        </Link>
        <h1 className="text-title">
          Pessoas <span className="tabular-nums text-default-400">{pessoas.length}</span>
        </h1>
        {pode.gerePessoas && <p className="text-sm text-default-500">Toque em alguém pra mudar o papel, passar o fut ou remover.</p>}
      </div>

      {lista("Quem organiza", organizam)}
      {lista("Membros", membros)}

      {pode.convida && <ConvitesDoFut grupo={grupo} />}
      {pode.gereFut && <ZonaDePerigo grupo={grupo} />}

      {aberta && <FolhaDaPessoa grupo={grupo} pessoa={aberta} onClose={() => setAbertaId(null)} />}
    </div>
  );
}

function LinhaDaPessoa({
  pessoa,
  eVoce,
  mostraEmail,
  onAbrir,
}: {
  pessoa: Pessoa;
  eVoce: boolean;
  mostraEmail: boolean;
  onAbrir?: () => void;
}) {
  const nome = nomeDaPessoa(pessoa);
  // The second line: the email when the name is the Jogador's (organizers only), or why there's no name.
  const detalhe = pessoa.jogador_nome ? (mostraEmail ? pessoa.email : null) : mostraEmail ? "Sem jogador no elenco" : null;
  const conteudo = (
    <>
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-default-100 text-sm font-bold uppercase text-default-600"
      >
        {pessoa.jogador_nome ? pessoa.jogador_nome.slice(0, 2) : "?"}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-foreground">{pessoa.jogador_nome ?? (mostraEmail ? pessoa.email : "Sem jogador")}</span>
          {eVoce && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">você</span>}
        </span>
        {detalhe && <span className="truncate text-xs text-default-500">{detalhe}</span>}
      </span>
      {pessoa.papel !== "membro" && (
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{O_QUE_O_PAPEL_FAZ[pessoa.papel].nome}</span>
      )}
      {onAbrir && <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-default-400" />}
    </>
  );

  return (
    <li>
      {onAbrir ? (
        <button
          type="button"
          onClick={onAbrir}
          aria-label={`${nome}, ${O_QUE_O_PAPEL_FAZ[pessoa.papel].nome.toLowerCase()}`}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-default-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          {conteudo}
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3">{conteudo}</div>
      )}
    </li>
  );
}
