"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { doCampoDeData, paraCampoDeData } from "@/lib/partida";

export type DadosDoFormulario = { inicio: string; local: string; vagas: number };

type Resultado = { ok: true } | { ok: false; message: string };

/** Create or edit a Partida. Times are typed and shown in Brasília time. */
export function PartidaForm({
  titulo,
  acao,
  inicial,
  onClose,
  onSalvo,
}: {
  titulo: string;
  acao: string;
  inicial?: { inicio: string; local: string; vagas: number };
  onClose: () => void;
  onSalvo: (dados: DadosDoFormulario) => Promise<Resultado>;
}) {
  const [inicio, setInicio] = useState(inicial ? paraCampoDeData(inicial.inicio) : "");
  const [local, setLocal] = useState(inicial?.local ?? "");
  const [vagas, setVagas] = useState(String(inicial?.vagas ?? 14));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startTransition] = useTransition();

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const iso = doCampoDeData(inicio);
    if (!iso) {
      setErro("Escolha dia e hora.");
      return;
    }
    startTransition(async () => {
      const resultado = await onSalvo({ inicio: iso, local, vagas: Number(vagas) });
      if (!resultado.ok) setErro(resultado.message);
    });
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-md">
      <form onSubmit={enviar} noValidate>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-title">{titulo}</h2>
          <p className="text-muted">Horário de Brasília.</p>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          {erro && <Alert tone="danger">{erro}</Alert>}
          <Input label="Dia e hora" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} isRequired />
          <Input label="Local" value={local} onChange={(e) => setLocal(e.target.value)} maxLength={80} isRequired />
          <Input
            label="Vagas"
            type="number"
            inputMode="numeric"
            min={2}
            max={60}
            value={vagas}
            onChange={(e) => setVagas(e.target.value)}
            isRequired
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" color="primary" isLoading={salvando}>
            {acao}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
