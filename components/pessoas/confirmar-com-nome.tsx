"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";

/**
 * For the steps that can't be undone by the same person (handing the fut
 * over, deleting it): type the fut's name to unlock the button. Any case and
 * extra spaces count, like in the database.
 */
export function ConfirmarComNome({
  titulo,
  explicacao,
  nome,
  acao,
  perigo = false,
  onConfirmar,
  onClose,
}: {
  titulo: string;
  explicacao: React.ReactNode;
  /** The fut's name, to be typed. */
  nome: string;
  /** The button's label, e.g. "Excluir o fut". */
  acao: string;
  perigo?: boolean;
  /** Runs the action with what was typed; a message comes back when it was refused. */
  onConfirmar: (digitado: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [digitado, setDigitado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const confere = digitado.trim().toLowerCase() === nome.trim().toLowerCase();

  return (
    <Modal isOpen onClose={onClose} className="max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!confere) return;
          setErro(null);
          startTransition(async () => {
            const recusa = await onConfirmar(digitado);
            if (recusa) setErro(recusa);
          });
        }}
      >
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-title">{titulo}</h2>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <div className="text-sm text-default-600">{explicacao}</div>
          {erro && <Alert tone="danger">{erro}</Alert>}
          <Input
            label={`Digite "${nome}" pra confirmar`}
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="flat" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" color={perigo ? "danger" : "primary"} isDisabled={!confere} isLoading={pendente}>
            {acao}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
