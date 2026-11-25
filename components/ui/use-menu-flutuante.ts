"use client";

import { useCallback, useEffect, useRef } from "react";
import { posicionarMenu } from "@/lib/posicao-do-menu";

/**
 * A popover menu that opens next to its button: placed on the frame it first
 * shows (so it never flashes at the screen's edge), kept on screen, and closed
 * when the page scrolls or the screen turns, since a fixed menu wouldn't
 * follow its button.
 */
export function useMenuFlutuante<B extends HTMLElement = HTMLButtonElement>() {
  const menuRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<B>(null);
  const fechar = useCallback(() => {
    const menu = menuRef.current;
    if (menu?.matches(":popover-open")) menu.hidePopover();
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [fechar]);

  const onBeforeToggle = useCallback(
    (e: React.ToggleEvent<HTMLDivElement>) => {
      if (e.newState !== "open") {
        window.removeEventListener("scroll", fechar, true);
        window.removeEventListener("resize", fechar);
        return;
      }
      const menu = e.currentTarget;
      // The menu has no size until it opens; the next frame comes before it's painted.
      requestAnimationFrame(() => {
        if (botaoRef.current) posicionarMenu(menu, botaoRef.current);
        window.addEventListener("scroll", fechar, { capture: true, passive: true });
        window.addEventListener("resize", fechar, { passive: true });
      });
    },
    [fechar],
  );

  return { menuRef, botaoRef, onBeforeToggle };
}
