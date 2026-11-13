"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Clock, MapPin, Pencil, UserCheck, Users, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cancelarPartida, editarPartida, responderPresenca } from "@/app/actions/partida";
import { PartidaForm } from "@/components/partida/partida-form";
import { SorteioDaPartida } from "@/components/partida/sorteio-da-partida";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MenuDeAcoes } from "@/components/ui/menu-de-acoes";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import type { Participacao } from "@/lib/grupo";
import { usePartidaAoVivo } from "@/hooks/use-partida-ao-vivo";
import { capacidades, SO_LEITURA } from "@/lib/capacidades";
import { useSemConexao } from "@/lib/pwa/conexao";
import { deveOferecerInstalacao, instalar, INSTRUCOES_IOS, comoInstalar } from "@/lib/pwa/instalar";
import type { JogadorDaLista, PartidaAoVivo } from "@/lib/leitura-da-partida";
import { formatarInicio, oQueVouFaz, organizarPresencas, situacaoDoJogador, type ListaDePresenca } from "@/lib/partida";

/** Answers for a Jogador; true when it went through. */
type Responder = (jogadorId: string, vou: boolean) => Promise<boolean>;

/**
 * A Partida, live. At `/g/<slug>/partidas/<id>` and as the fut's home
 * (`naInicio`), where it's the next Partida.
 *
 * Built so a membro opens it, sees the question and answers: the Partida's card
 * asks "Você vai?" right under the date, then one numbered list of who's going
 * (the lista de espera under it), and everyone else folded into one line. Times
 * show up only once there's something to see. Managing (Editar, Cancelar,
 * answering for others) lives in the card's ⋯ menu, away from the list.
 */
export function PartidaView({
  grupo,
  userId,
  inicial,
  jogadores,
  agora,
  naInicio = false,
}: {
  grupo: Participacao;
  userId: string;
  inicial: PartidaAoVivo;
  jogadores: JogadorDaLista[];
  agora: number;
  /** The fut's home: says "Próxima partida" instead of linking back to the list. */
  naInicio?: boolean;
}) {
  const { partida, presencas, sorteio, aoVivo, recarregar, estado } = usePartidaAoVivo(grupo.id, inicial, agora);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [respondendoPorOutros, setRespondendoPorOutros] = useState(false);
  const semConexao = useSemConexao();

  const id = partida.id;
  const lista = useMemo(() => organizarPresencas(presencas, partida.vagas), [presencas, partida.vagas]);
  const porId = useMemo(() => new Map(jogadores.map((j) => [j.id, j])), [jogadores]);
  const meu = jogadores.find((j) => j.conta_id === userId) ?? null;
  const respondidos = new Set(presencas.map((p) => p.jogador_id));
  const semResposta = jogadores.filter((j) => !respondidos.has(j.id));

  // With no signal nothing changes: no answering, no managing.
  const pode = semConexao ? SO_LEITURA : capacidades(grupo.papel, userId);
  const podeGerir = pode.gerePartidas && estado !== "cancelada";
  const podeResponder = (jogadorId: string) => {
    const jogador = porId.get(jogadorId);
    return !!jogador && pode.respondePor(jogador, estado);
  };

  const responder: Responder = async (jogadorId, vou) => {
    setRespondendo(jogadorId);
    try {
      const resultado = await responderPresenca(grupo.slug, id, jogadorId, vou);
      if (!resultado.ok) {
        toast.error("Não deu pra responder", { description: resultado.message });
        return false;
      }
      if (resultado.valor.situacao === "espera") toast.info("Partida lotada", { description: "Entrou na lista de espera." });
      await recarregar();
      return true;
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
  const fut = `/g/${encodeURIComponent(grupo.slug)}`;
  // Members only get a Sorteio once it's published; before that the Times column has nothing to show them.
  const temTimes = pode.gerePartidas || !!sorteio;

  return (
    // data-ao-vivo: the list is listening for changes (the E2E suite waits on it).
    <div data-ao-vivo={aoVivo} className={`flex flex-col gap-6 ${temTimes ? "" : "mx-auto w-full max-w-2xl"}`}>
      {!naInicio && (
        <Link href={`${fut}/partidas`} className="flex w-fit items-center gap-1 text-sm font-medium text-default-500 hover:text-foreground">
          <ArrowLeft size={16} aria-hidden="true" /> Partidas
        </Link>
      )}

      <div className={temTimes ? "grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-8" : "flex flex-col gap-6"}>
        <div className="flex flex-col gap-6">
          <section aria-label="Partida" className="flex flex-col gap-4 rounded-2xl border border-divider bg-content1 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                {naInicio && <p className="text-label">Próxima partida</p>}
                <h1 className="text-title capitalize">{formatarInicio(partida.inicio)}</h1>
                <p className="flex items-center gap-1 text-default-500">
                  <MapPin size={16} aria-hidden="true" /> {partida.local}
                </p>
              </div>
              {podeGerir && (
                <MenuDeAcoes
                  nome="Gerenciar partida"
                  acoes={[
                    ...(estado === "aberta"
                      ? [{ rotulo: "Responder por alguém", icone: <Users size={16} />, onSelect: () => setRespondendoPorOutros(true) }]
                      : []),
                    { rotulo: "Editar", icone: <Pencil size={16} />, onSelect: () => setEditando(true) },
                    { rotulo: "Cancelar partida", icone: <XCircle size={16} />, onSelect: cancelar, perigo: true },
                  ]}
                />
              )}
            </div>

            {estado === "cancelada" && <p className="font-semibold text-danger">Partida cancelada.</p>}
            {estado === "encerrada" && <p className="font-semibold text-default-500">Essa partida já começou.</p>}

            <SuaPresenca
              meu={meu}
              lista={lista}
              aberta={estado === "aberta"}
              podeResponder={!!meu && podeResponder(meu.id)}
              ocupado={!!meu && respondendo === meu.id}
              responder={async (jogadorId, vou) => {
                const foi = await responder(jogadorId, vou);
                if (foi) oferecerInstalacao();
                return foi;
              }}
              escolherHref={`${fut}/voce`}
            />
          </section>

          <QuemVai lista={lista} vagas={partida.vagas} nome={nome} meuId={meu?.id ?? null} />

          <Recolhidos naoVao={lista.naoVou.map((p) => nome(p.jogador_id))} semResposta={semResposta.map((j) => j.name)} />
        </div>

        {temTimes && (
          <div className="flex flex-col gap-6 lg:sticky lg:top-24">
            <SorteioDaPartida
              slug={grupo.slug}
              partidaId={id}
              sorteio={sorteio}
              confirmados={lista.confirmados.map((p) => p.jogador_id)}
              podeGerir={pode.gerePartidas}
              aberta={estado !== "cancelada"}
              onMudou={recarregar}
            />
          </div>
        )}
      </div>

      {naInicio && (
        <Link
          href={`${fut}/partidas`}
          className="mx-auto flex w-fit items-center gap-0.5 py-2 text-sm font-medium text-default-500 hover:text-foreground"
        >
          Ver todas as partidas <ChevronRight size={16} aria-hidden="true" />
        </Link>
      )}

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

      {respondendoPorOutros && (
        <ResponderPorAlguem
          jogadores={jogadores}
          lista={lista}
          respondendo={respondendo}
          podeResponder={podeResponder}
          responder={responder}
          onClose={() => setRespondendoPorOutros(false)}
        />
      )}
    </div>
  );
}

/**
 * Once, right after someone answers for the first time: put Squadra on the
 * home screen, so next time it's one tap.
 */
function oferecerInstalacao() {
  if (!deveOferecerInstalacao()) return;
  const ios = comoInstalar() === "ios";
  toast("Deixe o Squadra na tela inicial", {
    description: ios ? INSTRUCOES_IOS : "Na próxima, é só tocar no ícone pra responder.",
    duration: 12_000,
    action: ios ? undefined : { label: "Instalar", onClick: () => void instalar() },
  });
}

/**
 * The question, inside the Partida's card. Unanswered: "Você vai?" and two big
 * buttons. Answered: one line with where you stand and "Mudar".
 */
function SuaPresenca({
  meu,
  lista,
  aberta,
  podeResponder,
  ocupado,
  responder,
  escolherHref,
}: {
  meu: JogadorDaLista | null;
  lista: ListaDePresenca;
  aberta: boolean;
  podeResponder: boolean;
  ocupado: boolean;
  responder: Responder;
  escolherHref: string;
}) {
  const [mudando, setMudando] = useState(false);

  if (!meu) {
    if (!aberta) return null;
    return (
      <section aria-label="Sua presença" className="flex flex-col gap-3 border-t border-divider pt-4">
        <p className="font-semibold text-foreground">Escolha seu jogador para responder.</p>
        <Link
          href={escolherHref}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <UserCheck size={18} aria-hidden="true" /> Escolher meu jogador
        </Link>
      </section>
    );
  }

  const minha = situacaoDoJogador(lista, meu.id);
  const perguntando = podeResponder && (!minha || mudando);

  if (perguntando) {
    const vou = async (sim: boolean) => {
      await responder(meu.id, sim);
      setMudando(false);
    };
    return (
      <section aria-label="Sua presença" className="flex flex-col gap-3 border-t border-divider pt-4">
        <p className="text-section">Você vai?</p>
        {oQueVouFaz(lista) === "entra-na-espera" && minha?.situacao !== "confirmado" && (
          <p className="-mt-2 text-sm text-default-500">Lotou. Quem disser vou entra na lista de espera.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            color="primary"
            startContent={<Check size={18} />}
            isLoading={ocupado}
            isDisabled={minha?.situacao === "confirmado" || minha?.situacao === "espera"}
            onClick={() => vou(true)}
          >
            Vou
          </Button>
          <Button
            size="lg"
            variant="flat"
            startContent={<X size={18} />}
            isDisabled={ocupado || minha?.situacao === "nao_vou"}
            onClick={() => vou(false)}
          >
            Não vou
          </Button>
        </div>
        {mudando && (
          <button type="button" onClick={() => setMudando(false)} className="self-center text-sm font-medium text-default-500 hover:text-foreground">
            Deixar como está
          </button>
        )}
      </section>
    );
  }

  if (!minha) {
    // No signal (or the Partida closed) before answering: say so, no buttons.
    if (!aberta) return null;
    return (
      <section aria-label="Sua presença" className="border-t border-divider pt-4">
        <p className="font-semibold text-default-600">Você ainda não respondeu.</p>
      </section>
    );
  }

  const { icone, texto, tom } =
    minha.situacao === "confirmado"
      ? { icone: <Check size={18} />, texto: "Você vai", tom: "bg-primary/10 text-primary" }
      : minha.situacao === "espera"
        ? { icone: <Clock size={18} />, texto: `Você está em ${minha.posicao}º na lista de espera`, tom: "bg-warning/15 text-warning-600" }
        : { icone: <X size={18} />, texto: "Você não vai", tom: "bg-default-100 text-default-600" };

  return (
    <section aria-label="Sua presença" className="flex items-center justify-between gap-3 border-t border-divider pt-4">
      <p className={`flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 font-semibold ${tom}`}>
        <span aria-hidden="true">{icone}</span>
        {texto}
      </p>
      {podeResponder && (
        <Button variant="light" size="sm" onClick={() => setMudando(true)}>
          Mudar
        </Button>
      )}
    </section>
  );
}

/** Who's going, numbered like the list in the group chat, with the lista de espera under it. */
function QuemVai({
  lista,
  vagas,
  nome,
  meuId,
}: {
  lista: ListaDePresenca;
  vagas: number;
  nome: (jogadorId: string) => string;
  meuId: string | null;
}) {
  const confirmados = lista.confirmados.length;
  const linha = (jogadorId: string, numero: number) => (
    <li key={jogadorId} className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-6 shrink-0 text-right text-sm tabular-nums text-default-500">{numero}</span>
      <span className="min-w-0 truncate font-semibold text-foreground">{nome(jogadorId)}</span>
      {jogadorId === meuId && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">você</span>}
    </li>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2" aria-live="polite">
        <p className="text-sm text-default-600">
          <span className="font-semibold tabular-nums text-foreground">
            {confirmados} de {vagas}
          </span>{" "}
          vagas
          {lista.vagasLivres > 0 ? `, ${lista.vagasLivres === 1 ? "falta 1" : `faltam ${lista.vagasLivres}`}` : ", lotada"}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-default-100" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, (confirmados / Math.max(1, vagas)) * 100)}%` }} />
        </div>
      </div>

      <section aria-label="Quem vai" className="flex flex-col gap-2">
        <h2 className="text-label">Quem vai</h2>
        {confirmados === 0 ? (
          <p className="text-sm text-default-500">Ninguém confirmou ainda.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-divider rounded-2xl border border-divider bg-content1">
            {lista.confirmados.map((p, i) => linha(p.jogador_id, i + 1))}
          </ol>
        )}
      </section>

      {lista.espera.length > 0 && (
        <section aria-label="Lista de espera" className="flex flex-col gap-2">
          <h2 className="text-label">Lista de espera</h2>
          <ol className="flex flex-col divide-y divide-divider rounded-2xl border border-dashed border-divider">
            {lista.espera.map((p, i) => linha(p.jogador_id, i + 1))}
          </ol>
        </section>
      )}
    </div>
  );
}

/** Who isn't going and who hasn't answered: one line, opened on a tap. */
function Recolhidos({ naoVao, semResposta }: { naoVao: string[]; semResposta: string[] }) {
  if (naoVao.length === 0 && semResposta.length === 0) return null;
  const resumo = [
    naoVao.length > 0 && `${naoVao.length} não ${naoVao.length === 1 ? "vai" : "vão"}`,
    semResposta.length > 0 && `${semResposta.length} sem resposta`,
  ]
    .filter(Boolean)
    .join(", ");
  const grupo = (titulo: string, nomes: string[]) =>
    nomes.length > 0 && (
      <section aria-label={titulo} className="flex flex-col gap-1">
        <h2 className="text-label">{titulo}</h2>
        <ul className="flex flex-wrap gap-1.5">
          {nomes.map((n) => (
            <li key={n} className="rounded-full bg-default-100 px-2.5 py-1 text-sm text-default-600">
              {n}
            </li>
          ))}
        </ul>
      </section>
    );
  return (
    <details className="group rounded-2xl border border-divider bg-content1">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-default-600 [&::-webkit-details-marker]:hidden">
        {resumo}
        <ChevronRight size={16} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-90" />
      </summary>
      <div className="flex flex-col gap-4 border-t border-divider px-4 py-3">
        {grupo("Não vão", naoVao)}
        {grupo("Sem resposta", semResposta)}
      </div>
    </details>
  );
}

/** The dono and admins answer for any Jogador, including those with no account. */
function ResponderPorAlguem({
  jogadores,
  lista,
  respondendo,
  podeResponder,
  responder,
  onClose,
}: {
  jogadores: JogadorDaLista[];
  lista: ListaDePresenca;
  respondendo: string | null;
  podeResponder: (jogadorId: string) => boolean;
  responder: Responder;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const visiveis = [...jogadores]
    .filter((j) => !termo || j.name.toLowerCase().includes(termo))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const situacao = (jogadorId: string) => {
    const s = situacaoDoJogador(lista, jogadorId);
    if (!s) return { texto: "Sem resposta", vai: null };
    if (s.situacao === "confirmado") return { texto: "Vai", vai: true };
    if (s.situacao === "espera") return { texto: `${s.posicao}º na espera`, vai: true };
    return { texto: "Não vai", vai: false };
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg">
      <ModalHeader className="flex flex-col gap-1">
        <h2 className="text-title">Responder por alguém</h2>
        <p className="text-muted">Para quem não tem conta ou avisou no grupo.</p>
      </ModalHeader>
      <ModalBody className="flex flex-col gap-3 pb-6">
        <Input label="Buscar jogador" value={busca} onChange={(e) => setBusca(e.target.value)} size="sm" autoComplete="off" />
        <ul className="flex max-h-[55dvh] flex-col divide-y divide-divider overflow-y-auto" aria-label="Jogadores do fut">
          {visiveis.map((j) => {
            const { texto, vai } = situacao(j.id);
            const ocupado = respondendo === j.id;
            return (
              <li key={j.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">{j.name}</span>
                  <span className="text-xs text-default-500">{texto}</span>
                </span>
                {podeResponder(j.id) && (
                  <span className="flex shrink-0 gap-1">
                    {vai !== true && (
                      <Button size="sm" variant="flat" isDisabled={ocupado} aria-label={`Marcar ${j.name}: vou`} onClick={() => responder(j.id, true)}>
                        Vou
                      </Button>
                    )}
                    {vai !== false && (
                      <Button size="sm" variant="flat" isDisabled={ocupado} aria-label={`Marcar ${j.name}: não vou`} onClick={() => responder(j.id, false)}>
                        Não vou
                      </Button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </ModalBody>
    </Modal>
  );
}
