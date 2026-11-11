"use client";

import { useMemo, useState, useTransition } from "react";
import { UserCheck } from "lucide-react";
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

const chaveDispensado = (grupoId: string) => `squadra:quem-sou-eu-dispensado:${grupoId}`;

function foiDispensado(grupoId: string) {
  try {
    return localStorage.getItem(chaveDispensado(grupoId)) === "1";
  } catch {
    return false;
  }
}

/**
 * For a Membro with no Jogador in this Grupo yet: pick "sou esse aqui" from
 * the Jogadores nobody claimed, or add themselves. Dismissable per Grupo.
 */
export function QuemSouEu({
  grupoId,
  players,
  onVinculado,
}: {
  grupoId: string;
  players: readonly Player[];
  onVinculado: () => Promise<void> | void;
}) {
  const [dispensado, setDispensado] = useState(() => foiDispensado(grupoId));
  const [aberto, setAberto] = useState(false);

  if (dispensado && !aberto) return null;

  const dispensar = () => {
    try {
      localStorage.setItem(chaveDispensado(grupoId), "1");
    } catch {
      /* storage unavailable: hide for this visit only */
    }
    setDispensado(true);
  };

  return (
    <>
      {!dispensado && (
        <div
          role="region"
          aria-label="Vincular sua conta"
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-accent/50 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden="true" />
            <div>
              <p className="font-bold text-foreground">Qual desses é você?</p>
              <p className="text-sm text-default-500">
                Vincule sua conta ao seu Jogador. É assim que o fut vai saber quem confirmou presença.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="flat" onClick={dispensar}>
              Agora não
            </Button>
            <Button size="sm" color="primary" onClick={() => setAberto(true)}>
              Escolher meu Jogador
            </Button>
          </div>
        </div>
      )}

      {aberto && (
        <EscolherJogador
          grupoId={grupoId}
          players={players}
          onClose={() => setAberto(false)}
          onVinculado={async () => {
            setAberto(false);
            await onVinculado();
          }}
        />
      )}
    </>
  );
}

function EscolherJogador({
  grupoId,
  players,
  onClose,
  onVinculado,
}: {
  grupoId: string;
  players: readonly Player[];
  onClose: () => void;
  onVinculado: () => Promise<void>;
}) {
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
      await onVinculado();
    });
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg">
      <ModalHeader className="flex flex-col gap-1">
        <h2 className="text-title">Qual desses é você?</h2>
        <p className="text-muted">Só aparecem os Jogadores que ninguém escolheu ainda.</p>
      </ModalHeader>

      <ModalBody className="flex flex-col gap-4">
        {erro && <Alert tone="danger">{erro}</Alert>}

        <Input label="Buscar seu nome" value={busca} onChange={(e) => setBusca(e.target.value)} size="sm" autoComplete="off" />

        {livres.length === 0 ? (
          <p className="text-sm text-default-500">Nenhum Jogador livre com esse nome.</p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto" aria-label="Jogadores sem conta">
            {livres.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-default-100">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">{p.name}</span>
                  <span className="text-xs text-default-500">
                    {p.position} · OVR {p.rating}
                  </span>
                </span>
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  isDisabled={pendente}
                  aria-label={`Sou ${p.name}`}
                  onClick={() => concluir(() => vincularJogador(p.id), `Pronto, você é o ${p.name}`)}
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
            concluir(() => criarMeuJogador(grupoId, nome, posicao), "Seu Jogador entrou no Elenco");
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
            Criar meu Jogador
          </Button>
        </form>
      </ModalBody>
    </Modal>
  );
}
