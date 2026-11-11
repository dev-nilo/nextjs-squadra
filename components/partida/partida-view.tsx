"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, MapPin, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { cancelarPartida, editarPartida, responderPresenca } from "@/app/actions/partida";
import { GrupoNav } from "@/components/partida/grupo-nav";
import { PartidaForm } from "@/components/partida/partida-form";
import { SorteioDaPartida } from "@/components/partida/sorteio-da-partida";
import type { SorteioSalvo } from "@/lib/sorteio-partida";
import { Button } from "@/components/ui/button";
import type { Participacao } from "@/lib/grupo";
import {
  estadoDaPartida,
  formatarInicio,
  oQueVouFaz,
  organizarPresencas,
  situacaoDoJogador,
  type Partida,
  type Presenca,
} from "@/lib/partida";
import { createClient } from "@/lib/supabase/client";

export type JogadorDaLista = { id: string; name: string; position: string; ovr: number; conta_id: string | null };

/** `/g/<slug>/partidas/<id>`: the Partida, your answer, and the presence list, live. */
export function PartidaView({
  grupo,
  userId,
  podeGerir,
  partidaInicial,
  presencasIniciais,
  jogadores,
  sorteioInicial,
  agora,
}: {
  grupo: Participacao;
  userId: string;
  podeGerir: boolean;
  partidaInicial: Partida;
  presencasIniciais: Presenca[];
  jogadores: JogadorDaLista[];
  sorteioInicial: SorteioSalvo | null;
  agora: number;
}) {
  const router = useRouter();
  const [partida, setPartida] = useState(partidaInicial);
  const [presencas, setPresencas] = useState(presencasIniciais);
  const [sorteio, setSorteio] = useState(sorteioInicial);
  const [aoVivo, setAoVivo] = useState(false);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  const id = partida.id;

  const recarregar = useCallback(async () => {
    const { data } = await createClient().from("presencas").select("jogador_id, situacao, pediu_vaga_em").eq("partida_id", id);
    if (data) setPresencas(data as Presenca[]);
  }, [id]);

  const recarregarSorteio = useCallback(async () => {
    const { data } = await createClient()
      .from("sorteios")
      .select("times, publicado_em, sorteado_em")
      .eq("partida_id", id)
      .maybeSingle();
    setSorteio((data ?? null) as SorteioSalvo | null);
  }, [id]);

  // Supabase Realtime, filtered by this Partida and by the subscriber's RLS:
  // any change to its presence list or to the Partida itself re-renders it.
  useEffect(() => {
    const supabase = createClient();
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let ativo = true;

    (async () => {
      // Join with the user's token, so RLS lets the changes through.
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (!ativo) return;
      canal = supabase
        .channel(`partida:${id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "presencas", filter: `partida_id=eq.${id}` }, () => {
          void recarregar();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "sorteios", filter: `partida_id=eq.${id}` }, () => {
          void recarregarSorteio();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "partidas", filter: `id=eq.${id}` }, (payload) => {
          setPartida((atual) => ({ ...atual, ...(payload.new as Partial<Partida>) }));
        })
        .subscribe((status) => {
          setAoVivo(status === "SUBSCRIBED");
          // Catch up on anything that changed between the server render and the subscription.
          if (status === "SUBSCRIBED") {
            void recarregar();
            void recarregarSorteio();
          }
        });
    })();

    return () => {
      ativo = false;
      if (canal) void supabase.removeChannel(canal);
    };
  }, [id, recarregar, recarregarSorteio]);

  const lista = useMemo(() => organizarPresencas(presencas, partida.vagas), [presencas, partida.vagas]);
  const estado = estadoDaPartida(partida, new Date(agora));
  const porId = useMemo(() => new Map(jogadores.map((j) => [j.id, j])), [jogadores]);
  const meu = jogadores.find((j) => j.conta_id === userId) ?? null;
  const respondidos = new Set(presencas.map((p) => p.jogador_id));
  const semResposta = jogadores.filter((j) => !respondidos.has(j.id));

  const podeResponder = (jogadorId: string) =>
    estado !== "cancelada" && (podeGerir || (estado === "aberta" && jogadorId === meu?.id));

  const responder = async (jogadorId: string, vou: boolean) => {
    setRespondendo(jogadorId);
    try {
      const resultado = await responderPresenca(id, jogadorId, vou);
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
    if (!window.confirm("Cancelar essa Partida? Ninguém mais consegue responder.")) return;
    const resultado = await cancelarPartida(grupo.slug, id);
    if (!resultado.ok) {
      toast.error("Não deu pra cancelar", { description: resultado.message });
      return;
    }
    setPartida((atual) => ({ ...atual, cancelada_em: new Date().toISOString() }));
    toast.success("Partida cancelada");
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
          {estado === "encerrada" && <p className="font-semibold text-default-500">Essa Partida já começou.</p>}

          <p className="text-sm text-default-600" aria-live="polite">
            <span className="font-bold tabular-nums text-foreground">
              {lista.confirmados.length} de {partida.vagas}
            </span>{" "}
            vagas confirmadas
            {lista.espera.length > 0 && <> · {lista.espera.length} na lista de espera</>}
          </p>

          {podeGerir && estado !== "cancelada" && (
            <div className="flex gap-2">
              <Button size="sm" variant="flat" startContent={<Pencil size={14} />} onClick={() => setEditando(true)}>
                Editar
              </Button>
              <Button size="sm" variant="flat" color="danger" onClick={cancelar}>
                Cancelar Partida
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
              Pra responder, diga qual Jogador é você no{" "}
              <Link href={`/g/${grupo.slug}`} className="font-semibold text-foreground underline underline-offset-4">
                Elenco
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
          onMudou={recarregarSorteio}
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
          titulo="Editar Partida"
          acao="Salvar"
          inicial={partida}
          onClose={() => setEditando(false)}
          onSalvo={async (dados) => {
            const resultado = await editarPartida(grupo.slug, id, dados);
            if (resultado.ok) {
              setPartida((atual) => ({ ...atual, ...dados }));
              setEditando(false);
              toast.success("Partida salva");
              router.refresh();
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
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${ativo ? "bg-success animate-pulse" : "bg-default-300"}`} />
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
      <h2 className="text-sm font-bold uppercase tracking-wide text-default-500">{titulo}</h2>
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
