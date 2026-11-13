"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, DoorOpen, Download, KeyRound, LogOut, Unlink, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { sairDoFut } from "@/app/actions/pessoas";
import { desvincularJogador } from "@/app/actions/vinculo";
import { ChangePasswordModal } from "@/components/auth/change-password-modal";
import { EscolherJogador } from "@/components/jogador/quem-sou-eu";
import { PlayerCard } from "@/components/player/PlayerCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { capacidades } from "@/lib/capacidades";
import type { Participacao } from "@/lib/grupo";
import { caminhoDasPessoas } from "@/lib/navegacao";
import { O_QUE_O_PAPEL_FAZ } from "@/lib/pessoas";
import { useSemConexao } from "@/lib/pwa/conexao";
import { instalar, INSTRUCOES_IOS, useComoInstalar } from "@/lib/pwa/instalar";
import type { Player } from "@/types";

/**
 * `/g/<slug>/voce`: what's yours in this fut, top to bottom: your Jogador (or
 * "Qual desses é você?"), your Frequência, your account.
 */
export function VoceView({
  grupo,
  jogadores,
  meu,
  email,
  frequencia,
  pessoas,
}: {
  grupo: Participacao;
  jogadores: Player[];
  meu: Player | null;
  email: string;
  /** From frequencia_jogadores; null before your first counted Partida. */
  frequencia: { partidas: number; presencas: number; frequencia: number } | null;
  /** How many people are in the fut. */
  pessoas: number;
}) {
  const router = useRouter();
  const { logout } = useAuth();
  const [escolhendo, setEscolhendo] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  // With no signal: look, don't touch.
  const semConexao = useSemConexao();

  const desvincular = async () => {
    if (!meu || !window.confirm(`Desvincular sua conta de ${meu.name}? O jogador continua no elenco.`)) return;
    const resultado = await desvincularJogador(grupo.slug, meu.id);
    if (!resultado.ok) {
      toast.error("Não deu pra desvincular", { description: resultado.message });
      return;
    }
    toast.success("Conta desvinculada", { description: `${meu.name} continua no elenco.` });
  };

  const sair = async () => {
    await logout();
    toast.success("Você saiu.");
    // The fut's pages render again on the server without the session: the sign-in screen.
    router.refresh();
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-10">
      <h1 className="text-title">Você</h1>

      <section aria-label="Seu jogador" className="flex flex-col gap-4">
        <h2 className="text-label">Seu jogador</h2>
        {meu ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
            <div className="w-56 shrink-0">
              <PlayerCard player={meu} isMine />
            </div>
            <Button variant="flat" size="sm" startContent={<Unlink size={16} />} onClick={desvincular} isDisabled={semConexao}>
              Desvincular minha conta
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-divider bg-content1 p-4">
            <p className="text-sm text-default-600">
              Você ainda não disse qual jogador é você nesse fut. É assim que o fut sabe quem confirmou presença.
            </p>
            <Button color="primary" startContent={<UserCheck size={16} />} onClick={() => setEscolhendo(true)} isDisabled={semConexao}>
              Escolher meu jogador
            </Button>
          </div>
        )}
      </section>

      {meu && (
        <section aria-label="Sua frequência" className="flex flex-col gap-2">
          <h2 className="text-label">Sua frequência</h2>
          {frequencia ? (
            <p className="flex items-baseline gap-2">
              <span className="text-numeral text-5xl text-foreground">{frequencia.frequencia}%</span>
              <span className="text-sm text-default-500">
                {frequencia.presencas} de {frequencia.partidas} nas últimas partidas
              </span>
            </p>
          ) : (
            <p className="text-sm text-default-500">Ainda não tem partida pra contar.</p>
          )}
        </section>
      )}

      <EsteFut grupo={grupo} pessoas={pessoas} semConexao={semConexao} />

      <InstalarApp />

      <section aria-label="Conta" className="flex flex-col gap-3">
        <h2 className="text-label">Conta</h2>
        <p className="truncate text-sm text-default-600">{email}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="flat" startContent={<KeyRound size={16} />} onClick={() => setTrocandoSenha(true)} isDisabled={semConexao}>
            Alterar senha
          </Button>
          <Button variant="flat" color="danger" startContent={<LogOut size={16} />} onClick={sair} isDisabled={semConexao}>
            Sair
          </Button>
        </div>
      </section>

      {escolhendo && <EscolherJogador slug={grupo.slug} players={jogadores} onClose={() => setEscolhendo(false)} />}
      <ChangePasswordModal open={trocandoSenha} email={email} onOpenChange={setTrocandoSenha} />
    </div>
  );
}

/**
 * "Instalar o app": the native prompt on Android and desktop Chrome / Edge,
 * the Share-menu steps on iPhone. Hidden once installed, and where the
 * browser can't install at all.
 */
function InstalarApp() {
  const como = useComoInstalar();
  if (como === "instalado" || como === "indisponivel") return null;
  return (
    <section aria-label="App" className="flex flex-col gap-3">
      <h2 className="text-label">App</h2>
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-divider bg-content1 p-4">
        <p className="text-sm text-default-600">
          Deixe o Squadra na tela inicial: abre direto na próxima partida e mostra a lista mesmo sem sinal na quadra.
        </p>
        {como === "pronto" ? (
          <Button
            color="primary"
            startContent={<Download size={16} />}
            onClick={async () => {
              if (await instalar()) toast.success("Pronto, o Squadra está na sua tela inicial.");
            }}
          >
            Instalar o app
          </Button>
        ) : (
          <p className="text-sm font-semibold text-foreground">{INSTRUCOES_IOS}</p>
        )}
      </div>
    </section>
  );
}

/**
 * This fut: your papel and what it lets you do, its people, and leaving it.
 * The dono can't leave before handing the fut to an admin (in Pessoas).
 */
function EsteFut({ grupo, pessoas, semConexao }: { grupo: Participacao; pessoas: number; semConexao: boolean }) {
  const router = useRouter();
  const papel = O_QUE_O_PAPEL_FAZ[grupo.papel];
  const podeSair = capacidades(grupo.papel, null).saiDoFut;

  const sair = async () => {
    if (!window.confirm(`Sair do ${grupo.nome}? Seu jogador continua no elenco, sem a sua conta. Pra voltar, só com um link de convite novo.`)) return;
    const resultado = await sairDoFut(grupo.slug);
    if (!resultado.ok) {
      toast.error("Não deu pra sair", { description: resultado.message });
      return;
    }
    toast.success(`Você saiu do ${resultado.valor.nome}`);
    // "/" opens the next fut you're in, or "Dê um nome pro seu fut".
    router.replace("/");
  };

  return (
    <section aria-label="Este fut" className="flex flex-col gap-3">
      <h2 className="text-label">Este fut</h2>
      <div className="flex flex-col divide-y divide-divider rounded-2xl border border-divider bg-content1">
        <div className="flex flex-col gap-1 p-4">
          <p className="font-semibold text-foreground">
            Você é {grupo.papel} do {grupo.nome}
          </p>
          <p className="text-sm text-default-500">{papel.descricao}</p>
        </div>
        <Link
          href={caminhoDasPessoas(grupo.slug)}
          className="flex items-center gap-3 px-4 py-3 text-foreground transition-colors hover:bg-default-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <Users size={18} aria-hidden="true" className="text-default-500" />
          <span className="flex-1 font-medium">Pessoas</span>
          <span className="text-sm tabular-nums text-default-500">{pessoas}</span>
          <ChevronRight size={18} aria-hidden="true" className="text-default-400" />
        </Link>
        <div className="px-4 py-3">
          {podeSair ? (
            <Button variant="light" color="danger" size="sm" startContent={<DoorOpen size={16} />} onClick={sair} isDisabled={semConexao}>
              Sair do fut
            </Button>
          ) : (
            <p className="text-sm text-default-500">Pra sair do fut, passe ele pra um admin em Pessoas.</p>
          )}
        </div>
      </div>
    </section>
  );
}
