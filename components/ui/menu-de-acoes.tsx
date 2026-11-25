"use client";

import { useId, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMenuFlutuante } from "@/components/ui/use-menu-flutuante";

export type AcaoDoMenu = {
  rotulo: string;
  icone: ReactNode;
  onSelect: () => void;
  perigo?: boolean;
};

/**
 * The ⋯ button and its menu (Popover API: closes on outside tap and Escape).
 * The menu opens under the button, aligned to its right edge, moved in to
 * stay on screen and above the button when there's no room under it.
 */
export function MenuDeAcoes({
  nome,
  acoes,
  rotulo = "Mais ações",
  classeDoBotao = "",
}: {
  /** The menu's accessible name, e.g. "Mais ações do elenco". */
  nome: string;
  acoes: readonly AcaoDoMenu[];
  /** The ⋯ button's accessible name. */
  rotulo?: string;
  /** Extra classes for the ⋯ button (e.g. on a card). */
  classeDoBotao?: string;
}) {
  const menuId = useId();
  const { menuRef, botaoRef, onBeforeToggle } = useMenuFlutuante();
  return (
    <>
      <Button
        ref={botaoRef}
        isIconOnly
        variant="flat"
        size="sm"
        popoverTarget={menuId}
        aria-label={rotulo}
        className={classeDoBotao}
      >
        <Ellipsis size={18} />
      </Button>
      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        onBeforeToggle={onBeforeToggle}
        aria-label={nome}
        className="fixed m-0 min-w-[13rem] rounded-xl border border-divider bg-content1 p-1 text-foreground shadow-2xl"
      >
        {acoes.map((acao) => (
          <button
            key={acao.rotulo}
            type="button"
            popoverTarget={menuId}
            popoverTargetAction="hide"
            onClick={acao.onSelect}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-default-100 active:bg-default-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${acao.perigo ? "text-danger" : ""}`}
          >
            <span aria-hidden="true">{acao.icone}</span> {acao.rotulo}
          </button>
        ))}
      </div>
    </>
  );
}
