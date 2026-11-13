"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, Unlink, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { desvincularJogador } from "@/app/actions/vinculo";
import { ChangePasswordModal } from "@/components/auth/change-password-modal";
import { EscolherJogador } from "@/components/jogador/quem-sou-eu";
import { PlayerCard } from "@/components/player/PlayerCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import type { Participacao } from "@/lib/grupo";
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
}: {
  grupo: Participacao;
  jogadores: Player[];
  meu: Player | null;
  email: string;
  /** From frequencia_jogadores; null before your first counted Partida. */
  frequencia: { partidas: number; presencas: number; frequencia: number } | null;
}) {
  const router = useRouter();
  const { logout } = useAuth();
  const [escolhendo, setEscolhendo] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);

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
            <Button variant="flat" size="sm" startContent={<Unlink size={16} />} onClick={desvincular}>
              Desvincular minha conta
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-divider bg-content1 p-4">
            <p className="text-sm text-default-600">
              Você ainda não disse qual jogador é você nesse fut. É assim que o fut sabe quem confirmou presença.
            </p>
            <Button color="primary" startContent={<UserCheck size={16} />} onClick={() => setEscolhendo(true)}>
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

      <section aria-label="Conta" className="flex flex-col gap-3">
        <h2 className="text-label">Conta</h2>
        <p className="truncate text-sm text-default-600">{email}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="flat" startContent={<KeyRound size={16} />} onClick={() => setTrocandoSenha(true)}>
            Alterar senha
          </Button>
          <Button variant="flat" color="danger" startContent={<LogOut size={16} />} onClick={sair}>
            Sair
          </Button>
        </div>
      </section>

      {escolhendo && <EscolherJogador slug={grupo.slug} players={jogadores} onClose={() => setEscolhendo(false)} />}
      <ChangePasswordModal open={trocandoSenha} email={email} onOpenChange={setTrocandoSenha} />
    </div>
  );
}
