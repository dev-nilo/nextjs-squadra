"use client";

import { useCallback, useRef } from "react";

/**
 * Moving a Jogador to another Time remounts their row in that Time, and the
 * keyboard focus would fall to the page (#88). Call `marcar(id)` as the move
 * starts and give each "Mover" select `ref={refDo(id)}`: once the moved
 * Jogador's select is on the page and enabled (in the new Time, or in the old
 * one if the server refused the move), it takes the focus back.
 *
 * Only focus that was lost comes back: on the page's body, or on something
 * around the select (a modal <dialog> takes the focus when its focused child
 * is removed). If the person moved on while the server answered (another
 * control, the tab bar), the mark is dropped and their focus stays there. `soltar()` drops it too: call it when another action
 * (drawing again, publishing) makes the move moot, so a select mounted later
 * never takes the focus by surprise. No scrolling: on a phone, a tap that moves
 * someone to Time 2 shouldn't jump the page there.
 *
 * `refDo` returns a new callback each render on purpose, so React calls it
 * again when a select that was disabled during the move is enabled again.
 */
export function useFocoAoMover() {
  const pendente = useRef<string | null>(null);
  const marcar = useCallback((jogadorId: string) => {
    pendente.current = jogadorId;
  }, []);
  const soltar = useCallback(() => {
    pendente.current = null;
  }, []);
  const refDo = (jogadorId: string) => (select: HTMLSelectElement | null) => {
    if (!select || pendente.current !== jogadorId || select.disabled) return;
    pendente.current = null;
    const foco = document.activeElement;
    const perdido = !foco || foco === document.body || foco.contains(select);
    if (!perdido) return;
    select.focus({ preventScroll: true });
  };
  return { marcar, soltar, refDo };
}
