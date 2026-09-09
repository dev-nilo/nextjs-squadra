"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  applySessaoToast,
  changePassword,
  toSessaoAuth,
} from "@/lib/sessao";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChangePasswordModalProps {
  open: boolean;
  email: string;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({
  open,
  email,
  onOpenChange,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await changePassword(toSessaoAuth(createClient()), email, {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      applySessaoToast(result, "password", toast);
      if (result.ok) {
        reset();
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose} className="max-w-md">
      <ModalHeader className="flex flex-col gap-1">
        <h2 className="text-xl font-black text-foreground">Alterar senha</h2>
        <p className="text-sm font-normal text-default-500">
          Defina uma senha nova para compartilhar a conta sem usar a senha antiga.
        </p>
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <ModalBody className="flex flex-col gap-4">
          <Input
            label="Senha atual"
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            isDisabled={loading}
            isRequired
            autoComplete="current-password"
          />
          <Input
            label="Nova senha"
            id="new-password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            isDisabled={loading}
            isRequired
            autoComplete="new-password"
          />
          <Input
            label="Confirmar nova senha"
            id="confirm-new-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            isDisabled={loading}
            isRequired
            autoComplete="new-password"
          />
        </ModalBody>

        <ModalFooter>
          <Button variant="flat" type="button" onClick={handleClose} isDisabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" color="primary" isLoading={loading}>
            {loading ? "Salvando…" : "Salvar senha"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
