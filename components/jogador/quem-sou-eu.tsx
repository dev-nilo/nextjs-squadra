"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { criarMeuJogador, vincularJogador } from "@/app/actions/vinculo";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { POSITIONS } from "@/lib/constants";
import { semConta } from "@/lib/vinculo";
import type { Player } from "@/types";

/**
 * "Qual desses é você?": claim a Jogador nobody has claimed, or add yourself.
 * Opened from Você. The action revalidates the fut's pages, which bring the
 * linked Jogador back.
 */
export function EscolherJogador({ slug, players, onClose }: { slug: string; players: readonly Player[]; onClose: () => void }) {
  const [busca, setBusca] = useState("");
  const [nome, setNome] = useState("");
  const [posicao, setPosicao] = useState("ALA");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  const livres = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return semConta(players).filter((p) => !termo || p.name.toLowerCase().includes(termo));
  }, [players, busca]);

  const concluir = (acao: () => ReturnType<typeof vincularJogador>, aviso: string) => {
    setErro(null);
    startTransition(async () => {
      const resultado = await acao();
      if (!resultado.ok) {
        setErro(resultado.message);
        return;
      }
      toast.success(aviso);
      onClose();
    });
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg">
      <ModalHeader className="flex flex-col gap-1">
        <h2 className="text-title">Qual desses é você?</h2>
        <p className="text-muted">Só aparecem os jogadores que ninguém escolheu ainda.</p>
      </ModalHeader>

      <ModalBody className="flex flex-col gap-4">
        {erro && <Alert tone="danger">{erro}</Alert>}

        <Input label="Buscar seu nome" value={busca} onChange={(e) => setBusca(e.target.value)} size="sm" autoComplete="off" />

        {livres.length === 0 ? (
          <p className="text-sm text-default-500">Nenhum jogador livre com esse nome.</p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto" aria-label="Jogadores sem conta">
            {livres.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-default-100">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">{p.name}</span>
                  <span className="text-xs text-default-500">
                    {p.position}, OVR {p.rating}
                  </span>
                </span>
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  isDisabled={pendente}
                  aria-label={`Sou ${p.name}`}
                  onClick={() => concluir(() => vincularJogador(slug, p.id), `Pronto, você é o ${p.name}`)}
                >
                  Sou esse aqui
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="flex flex-col gap-3 border-t border-divider pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            concluir(() => criarMeuJogador(slug, nome, posicao), "Seu jogador entrou no elenco");
          }}
        >
          <p className="text-sm font-bold text-foreground">Não estou na lista</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input label="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} size="sm" />
            <Select label="Posição" value={posicao} onChange={(e) => setPosicao(e.target.value)} size="sm" className="sm:w-32">
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-default-500">Entra com os atributos padrão. Quem organiza o fut ajusta depois.</p>
          <Button type="submit" color="primary" isLoading={pendente} className="self-start">
            Criar meu jogador
          </Button>
        </form>
      </ModalBody>
    </Modal>
  );
}
