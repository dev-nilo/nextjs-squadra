"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, MapPin, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { cancelarPartida, editarPartida, responderPresenca } from "@/app/actions/partida";
import { GrupoNav } from "@/components/partida/grupo-nav";
import { PartidaForm } from "@/components/partida/partida-form";
import { SorteioDaPartida } from "@/components/partida/sorteio-da-partida";
import { Button } from "@/components/ui/button";
import type { Participacao } from "@/lib/grupo";
import { usePartidaAoVivo } from "@/hooks/use-partida-ao-vivo";
import { capacidades } from "@/lib/capacidades";
import type { JogadorDaLista, PartidaAoVivo } from "@/lib/leitura-da-partida";
import {
  formatarInicio,
  oQueVouFaz,
  organizarPresencas,
  situacaoDoJogador,
  type Partida,
  type Presenca,
} from "@/lib/partida";

/** `/g/<slug>/partidas/<id>`: the Partida, your answer, and the presence list, live. */
export function PartidaView({
  grupo,
  userId,
  inicial,
  jogadores,
  agora,
}: {
  grupo: Participacao;
  userId: string;
  inicial: PartidaAoVivo;
  jogadores: JogadorDaLista[];
  agora: number;
}) {
  const { partida, presencas, sorteio, aoVivo, recarregar, estado } = usePartidaAoVivo(grupo.id, inicial, agora);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  const id = partida.id;

  const lista = useMemo(() => organizarPresencas(presencas, partida.vagas), [presencas, partida.vagas]);
  const porId = useMemo(() => new Map(jogadores.map((j) => [j.id, j])), [jogadores]);
  const meu = jogadores.find((j) => j.conta_id === userId) ?? null;
  const respondidos = new Set(presencas.map((p) => p.jogador_id));
  const semResposta = jogadores.filter((j) => !respondidos.has(j.id));

  const pode = capacidades(grupo.papel, userId);
  const podeGerir = pode.gerePartidas;
  const podeResponder = (jogadorId: string) => {
    const jogador = porId.get(jogadorId);
    return !!jogador && pode.respondePor(jogador, estado);
  };

  const responder = async (jogadorId: string, vou: boolean) => {
    setRespondendo(jogadorId);
    try {
      const resultado = await responderPresenca(grupo.slug, id, jogadorId, vou);
      if (!resultado.ok) {
        toast.error("Não deu pra responder", { description: resultado.message });
        return;
      }
      if (resultado.valor.situacao === "espera") toast.info("Partida lotada", { description: "Entrou na lista de espera." });
      await recarregar();
    } finally {
      setRespondendo(null);
    }
  };

  const cancelar = async () => {
    if (!window.confirm("Cancelar essa partida? Ninguém mais consegue responder.")) return;
    const resultado = await cancelarPartida(grupo.slug, id);
    if (!resultado.ok) {
      toast.error("Não deu pra cancelar", { description: resultado.message });
      return;
    }
    toast.success("Partida cancelada");
    await recarregar();
  };

  const nome = (jogadorId: string) => porId.get(jogadorId)?.name ?? "Jogador";
  const minha = meu ? situacaoDoJogador(lista, meu.id) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GrupoNav slug={grupo.slug} nome={grupo.nome} aba="partidas" />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-3 py-6 sm:px-6 sm:py-8">
        <Link href={`/g/${grupo.slug}/partidas`} className="flex items-center gap-1 text-sm font-semibold text-default-500 hover:text-foreground">
          <ArrowLeft size={16} aria-hidden="true" /> Partidas
        </Link>

        <section className="flex flex-col gap-3 rounded-2xl border border-divider bg-content1 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-title capitalize">{formatarInicio(partida.inicio)}</h1>
              <p className="flex items-center gap-1 text-default-500">
                <MapPin size={16} aria-hidden="true" /> {partida.local}
              </p>
            </div>
            <AoVivo ativo={aoVivo} />
          </div>

          {estado === "cancelada" && <p className="font-semibold text-danger">Partida cancelada.</p>}
          {estado === "encerrada" && <p className="font-semibold text-default-500">Essa partida já começou.</p>}

          <p className="text-sm text-default-600" aria-live="polite">
            <span className="font-bold tabular-nums text-foreground">
              {lista.confirmados.length} de {partida.vagas}
            </span>{" "}
            vagas confirmadas
            {lista.espera.length > 0 && <>, {lista.espera.length} na lista de espera</>}
          </p>

          {podeGerir && estado !== "cancelada" && (
            <div className="flex gap-2">
              <Button size="sm" variant="flat" startContent={<Pencil size={14} />} onClick={() => setEditando(true)}>
                Editar
              </Button>
              <Button size="sm" variant="flat" color="danger" onClick={cancelar}>
                Cancelar partida
              </Button>
            </div>
          )}
        </section>

        <section aria-label="Sua presença" className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          {meu ? (
            <>
              <p className="text-sm text-default-600">
                <span className="font-bold text-foreground">{meu.name}</span>:{" "}
                {minha?.situacao === "confirmado"
                  ? "você vai. ✔"
                  : minha?.situacao === "espera"
                    ? `você está na lista de espera (${minha.posicao}º).`
                    : minha?.situacao === "nao_vou"
                      ? "você não vai."
                      : "você ainda não respondeu."}
              </p>
              {podeResponder(meu.id) && (
                <div className="flex gap-2">
                  <Button
                    color="primary"
                    startContent={<Check size={16} />}
                    isLoading={respondendo === meu.id}
                    isDisabled={minha?.situacao === "confirmado" || minha?.situacao === "espera"}
                    onClick={() => responder(meu.id, true)}
                  >
                    {oQueVouFaz(lista) === "entra-na-espera" ? "Entrar na lista de espera" : "Vou"}
                  </Button>
                  <Button
                    variant="flat"
                    startContent={<X size={16} />}
                    isDisabled={respondendo === meu.id || minha?.situacao === "nao_vou"}
                    onClick={() => responder(meu.id, false)}
                  >
                    Não vou
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-default-600">
              Pra responder, diga qual jogador é você no{" "}
              <Link href={`/g/${grupo.slug}`} className="font-semibold text-foreground underline underline-offset-4">
                elenco
              </Link>
              .
            </p>
          )}
        </section>

        <SorteioDaPartida
          slug={grupo.slug}
          partidaId={id}
          sorteio={sorteio}
          confirmados={lista.confirmados.map((p) => p.jogador_id)}
          podeGerir={podeGerir}
          aberta={estado !== "cancelada"}
          onMudou={recarregar}
        />

        <ListaDeJogadores
          titulo={`Confirmados (${lista.confirmados.length}/${partida.vagas})`}
          itens={lista.confirmados.map((p) => ({ id: p.jogador_id, nome: nome(p.jogador_id) }))}
          vazio="Ninguém confirmou ainda."
          acoes={podeGerir ? (j) => <AcoesDoGestor jogadorId={j} vai responder={responder} ocupado={respondendo === j} podeResponder={podeResponder(j)} nome={nome(j)} /> : undefined}
        />

        {lista.espera.length > 0 && (
          <ListaDeJogadores
            titulo="Lista de espera"
            ordenada
            itens={lista.espera.map((p) => ({ id: p.jogador_id, nome: nome(p.jogador_id) }))}
            acoes={podeGerir ? (j) => <AcoesDoGestor jogadorId={j} vai responder={responder} ocupado={respondendo === j} podeResponder={podeResponder(j)} nome={nome(j)} /> : undefined}
          />
        )}

        {lista.naoVou.length > 0 && (
          <ListaDeJogadores
            titulo="Não vão"
            itens={lista.naoVou.map((p) => ({ id: p.jogador_id, nome: nome(p.jogador_id) }))}
            acoes={podeGerir ? (j) => <AcoesDoGestor jogadorId={j} vai={false} responder={responder} ocupado={respondendo === j} podeResponder={podeResponder(j)} nome={nome(j)} /> : undefined}
          />
        )}

        {semResposta.length > 0 && (
          <ListaDeJogadores
            titulo="Sem resposta"
            itens={semResposta.map((j) => ({ id: j.id, nome: j.name }))}
            acoes={
              podeGerir
                ? (j) => <AcoesDoGestor jogadorId={j} vai={null} responder={responder} ocupado={respondendo === j} podeResponder={podeResponder(j)} nome={nome(j)} />
                : undefined
            }
          />
        )}
      </main>

      {editando && (
        <PartidaForm
          titulo="Editar partida"
          acao="Salvar"
          inicial={partida}
          onClose={() => setEditando(false)}
          onSalvo={async (dados) => {
            const resultado = await editarPartida(grupo.slug, id, dados);
            if (resultado.ok) {
              setEditando(false);
              toast.success("Partida salva");
              await recarregar();
            }
            return resultado;
          }}
        />
      )}
    </div>
  );
}

function AoVivo({ ativo }: { ativo: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-default-500" title={ativo ? "A lista atualiza sozinha" : "Conectando..."}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${ativo ? "bg-accent animate-pulse" : "bg-default-300"}`} />
      {ativo ? "Ao vivo" : "Conectando"}
    </span>
  );
}

function ListaDeJogadores({
  titulo,
  itens,
  vazio,
  ordenada = false,
  acoes,
}: {
  titulo: string;
  itens: { id: string; nome: string }[];
  vazio?: string;
  ordenada?: boolean;
  acoes?: (jogadorId: string) => React.ReactNode;
}) {
  const Lista = ordenada ? "ol" : "ul";
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="text-label">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="text-sm text-default-500">{vazio}</p>
      ) : (
        <Lista className="flex flex-col divide-y divide-divider rounded-2xl border border-divider bg-content1">
          {itens.map((item, i) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 truncate font-semibold text-foreground">
                {ordenada && <span className="mr-2 tabular-nums text-default-500">{i + 1}º</span>}
                {item.nome}
              </span>
              {acoes?.(item.id)}
            </li>
          ))}
        </Lista>
      )}
    </section>
  );
}

/** The dono and admins answer for any Jogador, including those with no account. */
function AcoesDoGestor({
  jogadorId,
  nome,
  vai,
  ocupado,
  podeResponder,
  responder,
}: {
  jogadorId: string;
  nome: string;
  /** true: going or waiting · false: not going · null: no answer yet. */
  vai: boolean | null;
  ocupado: boolean;
  podeResponder: boolean;
  responder: (jogadorId: string, vou: boolean) => Promise<void>;
}) {
  if (!podeResponder) return null;
  return (
    <span className="flex shrink-0 gap-1">
      {vai !== true && (
        <Button size="sm" variant="flat" isDisabled={ocupado} aria-label={`Marcar ${nome}: vou`} onClick={() => responder(jogadorId, true)}>
          Vou
        </Button>
      )}
      {vai !== false && (
        <Button size="sm" variant="flat" isDisabled={ocupado} aria-label={`Marcar ${nome}: não vou`} onClick={() => responder(jogadorId, false)}>
          Não vou
        </Button>
      )}
    </span>
  );
}
