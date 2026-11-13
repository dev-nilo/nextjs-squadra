"use client";

import { useState, useTransition } from "react";
import { Check, Crown, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { mudarPapel, passarPosse, removerDoFut } from "@/app/actions/pessoas";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import type { Participacao } from "@/lib/grupo";
import { nomeDaPessoa, O_QUE_O_PAPEL_FAZ, type Pessoa } from "@/lib/pessoas";
import { ConfirmarComNome } from "./confirmar-com-nome";

const desde = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

/**
 * The dono's sheet for one person: their papel (admin or membro, each with
 * what it allows), handing the fut over to an admin, removing them. Opened
 * only by the dono, on anyone but themselves.
 */
export function FolhaDaPessoa({ grupo, pessoa, onClose }: { grupo: Participacao; pessoa: Pessoa; onClose: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const [passando, setPassando] = useState(false);
  const nome = nomeDaPessoa(pessoa);

  const tornar = (papel: "admin" | "membro") => {
    if (papel === pessoa.papel) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await mudarPapel(grupo.slug, pessoa.user_id, papel);
      if (!resultado.ok) {
        setErro(resultado.message);
        return;
      }
      toast.success(`${nome} agora é ${papel}`);
    });
  };

  const remover = () => {
    if (
      !window.confirm(
        `Remover ${nome} do fut? O jogador continua no elenco, sem conta vinculada. Quem ainda tiver um link de convite consegue entrar de novo: cancele o link em Convites se precisar.`,
      )
    )
      return;
    setErro(null);
    startTransition(async () => {
      const resultado = await removerDoFut(grupo.slug, pessoa.user_id);
      if (!resultado.ok) {
        setErro(resultado.message);
        return;
      }
      toast.success(`${nome} saiu do fut`);
      onClose();
    });
  };

  return (
    <>
      <Modal isOpen onClose={onClose} className="max-w-md">
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-title">{nome}</h2>
          <p className="text-muted">
            {pessoa.jogador_nome && pessoa.email ? `${pessoa.email}, ` : !pessoa.jogador_nome ? "Sem jogador no elenco, " : ""}
            no fut desde {desde.format(new Date(pessoa.desde))}
          </p>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-5 pb-6">
          {erro && <Alert tone="danger">{erro}</Alert>}

          <fieldset role="radiogroup" aria-label="Papel" className="flex flex-col gap-2" disabled={pendente}>
            <legend className="text-label mb-2">Papel</legend>
            {(["admin", "membro"] as const).map((papel) => {
              const atual = pessoa.papel === papel;
              return (
                <button
                  key={papel}
                  type="button"
                  role="radio"
                  aria-checked={atual}
                  onClick={() => tornar(papel)}
                  className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${
                    atual ? "border-primary bg-primary/5" : "border-divider hover:bg-default-100"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      atual ? "border-primary bg-primary text-primary-foreground" : "border-default-300"
                    }`}
                  >
                    {atual && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">{O_QUE_O_PAPEL_FAZ[papel].nome}</span>
                    <span className="text-sm text-default-500">{O_QUE_O_PAPEL_FAZ[papel].descricao}</span>
                  </span>
                </button>
              );
            })}
          </fieldset>

          <div className="flex flex-col gap-2 border-t border-divider pt-4">
            {pessoa.papel === "admin" ? (
              <Button variant="flat" startContent={<Crown size={16} />} isDisabled={pendente} onClick={() => setPassando(true)}>
                Passar o fut pra {nome}
              </Button>
            ) : (
              <p className="text-xs text-default-500">Pra passar o fut pra alguém, torne a pessoa admin primeiro.</p>
            )}
            <Button variant="flat" color="danger" startContent={<UserMinus size={16} />} isDisabled={pendente} onClick={remover}>
              Remover do fut
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {passando && (
        <ConfirmarComNome
          titulo={`Passar o fut pra ${nome}?`}
          explicacao={
            <>
              {nome} vira o dono do <span className="font-semibold text-foreground">{grupo.nome}</span> e você vira admin: continua
              organizando, mas não mexe mais em papéis nem no fut. Só {nome} consegue desfazer.
            </>
          }
          nome={grupo.nome}
          acao="Passar o fut"
          onClose={() => setPassando(false)}
          onConfirmar={async () => {
            const resultado = await passarPosse(grupo.slug, pessoa.user_id);
            if (!resultado.ok) return resultado.message;
            toast.success(`${nome} agora é o dono`, { description: "Você continua como admin." });
            setPassando(false);
            onClose();
            return null;
          }}
        />
      )}
    </>
  );
}
