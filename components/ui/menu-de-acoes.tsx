"use client";

import { useId, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AcaoDoMenu = {
  rotulo: string;
  icone: ReactNode;
  onSelect: () => void;
  perigo?: boolean;
};

/**
 * The ⋯ button and its menu (Popover API: closes on outside tap and Escape).
 * The menu opens under the button, aligned to its right edge.
 */
export function MenuDeAcoes({ nome, acoes }: { /** The menu's accessible name, e.g. "Mais ações do elenco". */ nome: string; acoes: readonly AcaoDoMenu[] }) {
  const menuId = useId();
  const posicionar = (menu: HTMLElement) => {
    const gatilho = document.querySelector<HTMLElement>(`[popovertarget="${CSS.escape(menuId)}"]`);
    if (!gatilho) return;
    const r = gatilho.getBoundingClientRect();
    menu.style.top = `${r.bottom + 8}px`;
    menu.style.right = `${window.innerWidth - r.right}px`;
  };
  return (
    <>
      <Button isIconOnly variant="flat" size="sm" popoverTarget={menuId} aria-label="Mais ações">
        <Ellipsis size={18} />
      </Button>
      <div
        id={menuId}
        popover="auto"
        onBeforeToggle={(e) => posicionar(e.currentTarget)}
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
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-default-100 ${acao.perigo ? "text-danger" : ""}`}
          >
            <span aria-hidden="true">{acao.icone}</span> {acao.rotulo}
          </button>
        ))}
      </div>
    </>
  );
}
