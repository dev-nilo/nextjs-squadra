"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { criarConvite, revogarConvite, type Convite } from "@/app/actions/convite";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { caminhoDoConvite } from "@/lib/convite";
import type { Participacao } from "@/lib/grupo";
import { createClient } from "@/lib/supabase/client";

const dataCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** The Grupo's working invite links, for its dono and admins: create, copy, cancel. */
export function ConvidarModal({
  isOpen,
  onClose,
  grupo,
}: {
  isOpen: boolean;
  onClose: () => void;
  grupo: Participacao;
}) {
  const [convites, setConvites] = useState<Convite[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    createClient()
      .from("convites")
      .select("id, token, expira_em")
      .eq("grupo_id", grupo.id)
      .is("revogado_em", null)
      .gt("expira_em", new Date().toISOString())
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setErro("Não deu pra carregar os links agora.");
        setConvites(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, grupo.id]);

  const link = (token: string) => `${window.location.origin}${caminhoDoConvite(token)}`;

  const gerar = () => {
    setErro(null);
    startTransition(async () => {
      const resultado = await criarConvite(grupo.id);
      if (!resultado.ok) {
        setErro(resultado.message);
        return;
      }
      setConvites((atuais) => [resultado.valor, ...(atuais ?? [])]);
    });
  };

  const cancelar = (id: string) => {
    setErro(null);
    startTransition(async () => {
      const resultado = await revogarConvite(id);
      if (!resultado.ok) {
        setErro(resultado.message);
        return;
      }
      setConvites((atuais) => (atuais ?? []).filter((c) => c.id !== id));
      toast.success("Link cancelado", { description: "Quem já entrou continua no fut." });
    });
  };

  const copiar = async (convite: Convite) => {
    try {
      await navigator.clipboard.writeText(link(convite.token));
      setCopiado(convite.id);
      toast.success("Link copiado", { description: "Manda no grupo da pelada." });
    } catch {
      toast.error("Não deu pra copiar", { description: "Selecione o link e copie na mão." });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <ModalHeader className="flex flex-col gap-1">
        <h2 className="text-title">Chamar a galera</h2>
        <p className="text-muted">
          Quem abrir o link entra no <span className="font-semibold text-foreground">{grupo.nome}</span> como
          membro: vê o elenco e os sorteios, mas não edita. Cada link vale 7 dias.
        </p>
      </ModalHeader>

      <ModalBody className="flex flex-col gap-3">
        {erro && <Alert tone="danger">{erro}</Alert>}

        {convites === null ? (
          <p className="text-sm text-default-500">Carregando links...</p>
        ) : convites.length === 0 ? (
          <p className="text-sm text-default-500">Nenhum link ativo. Gere um pra mandar pra pelada.</p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Links ativos">
            {convites.map((convite) => (
              <li key={convite.id} className="flex flex-col gap-2 rounded-xl border border-divider bg-default-50 p-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-default-500">
                    Link de convite, vale até {dataCurta.format(new Date(convite.expira_em))}
                  </span>
                  <input
                    readOnly
                    value={link(convite.token)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full truncate rounded-lg border border-default-200 bg-content1 px-2 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    startContent={copiado === convite.id ? <Check size={14} /> : <Copy size={14} />}
                    onClick={() => copiar(convite)}
                  >
                    {copiado === convite.id ? "Copiado" : "Copiar link"}
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="danger"
                    startContent={<Trash2 size={14} />}
                    isDisabled={pendente}
                    onClick={() => cancelar(convite.id)}
                  >
                    Cancelar link
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="flat" onClick={onClose}>
          Fechar
        </Button>
        <Button color="primary" startContent={<Link2 size={16} />} isLoading={pendente} onClick={gerar}>
          Gerar link novo
        </Button>
      </ModalFooter>
    </Modal>
  );
}
