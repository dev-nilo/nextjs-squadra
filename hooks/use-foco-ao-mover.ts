"use client";

import { useCallback, useRef } from "react";

/**
 * Moving a Jogador to another Time remounts their row in that Time, and the
 * keyboard focus would fall to the page (#88). Call `marcar(id)` as the move
 * starts and give each "Mover" select `ref={refDo(id)}`: the moved Jogador's
 * select takes the focus back as soon as it's on the page and enabled. That's
 * in the new Time, or in the old one if the server refused the move.
 *
 * `refDo` returns a new callback each render on purpose, so React calls it
 * again when a select that was disabled during the move is enabled again.
 */
export function useFocoAoMover() {
  const pendente = useRef<string | null>(null);
  const marcar = useCallback((jogadorId: string) => {
    pendente.current = jogadorId;
  }, []);
  const refDo = (jogadorId: string) => (select: HTMLSelectElement | null) => {
    if (!select || pendente.current !== jogadorId || select.disabled) return;
    pendente.current = null;
    select.focus();
  };
  return { marcar, refDo };
}
