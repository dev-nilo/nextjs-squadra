"use client";

import { Pencil, Trash2, Unlink, UserCheck } from "lucide-react";
import { PlayerCard } from "@/components/player/PlayerCard";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import type { Player } from "@/types";

/**
 * A tapped card, full size, with what this person can do to it. Every card
 * action lives here, so the album needs no hover-only buttons.
 */
export function CartaAberta({
  player,
  isMine,
  onClose,
  onEditar,
  onExcluir,
  onDesvincular,
  onSouEu,
}: {
  player: Player;
  isMine: boolean;
  onClose: () => void;
  /** Organizers only. */
  onEditar?: () => void;
  onExcluir?: () => void;
  /** Organizers, and the person on their own card. */
  onDesvincular?: () => void;
  /** Someone with no Jogador in this fut, on a card nobody has claimed. */
  onSouEu?: () => void;
}) {
  const algumaAcao = onEditar || onExcluir || onDesvincular || onSouEu;
  return (
    <Modal isOpen onClose={onClose} className="max-w-sm">
      <ModalBody className="flex flex-col items-center gap-2 pt-6">
        <h2 className="sr-only">{player.name}</h2>
        <div className="w-full max-w-64">
          <PlayerCard player={player} isMine={isMine} completa />
        </div>
      </ModalBody>
      {algumaAcao && (
        <ModalFooter className="sm:flex-wrap sm:justify-center">
          {onSouEu && (
            <Button color="primary" startContent={<UserCheck size={16} />} onClick={onSouEu} aria-label={`Sou ${player.name}`}>
              Sou eu
            </Button>
          )}
          {onEditar && (
            <Button color="primary" startContent={<Pencil size={16} />} onClick={onEditar} aria-label={`Editar carta de ${player.name}`}>
              Editar
            </Button>
          )}
          {onDesvincular && (
            <Button variant="flat" startContent={<Unlink size={16} />} onClick={onDesvincular} aria-label={`Desvincular conta de ${player.name}`}>
              Desvincular conta
            </Button>
          )}
          {onExcluir && (
            <Button variant="flat" color="danger" startContent={<Trash2 size={16} />} onClick={onExcluir} aria-label={`Excluir carta de ${player.name}`}>
              Excluir
            </Button>
          )}
        </ModalFooter>
      )}
    </Modal>
  );
}
