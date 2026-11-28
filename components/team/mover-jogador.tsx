"use client";

import { forwardRef } from "react";
import { ArrowLeftRight } from "lucide-react";

/**
 * Moves a Jogador to another Time: a small two-arrow mark with the native
 * select laid over it, invisible. A tap opens the phone's own picker, the
 * row keeps its width for the name, and the select's 16px text keeps iOS from
 * zooming in. The select covers 44px, more than the mark shows.
 */
export const MoverJogador = forwardRef<
  HTMLSelectElement,
  {
    nome: string;
    /** The Time the Jogador is in now. */
    indice: number;
    times: readonly { name: string }[];
    onMover: (destino: number) => void;
    disabled?: boolean;
  }
>(function MoverJogador({ nome, indice, times, onMover, disabled }, ref) {
  return (
    <span
      data-export-ignore="true"
      className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-default-200 bg-default-100 text-default-600 has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
    >
      <ArrowLeftRight size={16} aria-hidden="true" />
      <select
        ref={ref}
        aria-label={`Mover ${nome}`}
        value={indice}
        disabled={disabled}
        onChange={(e) => onMover(Number(e.target.value))}
        className="absolute -inset-1.5 cursor-pointer appearance-none text-base opacity-0 focus:outline-hidden disabled:cursor-not-allowed"
      >
        {times.map((destino, i) => (
          <option key={destino.name} value={i}>
            {i === indice ? destino.name : `→ ${destino.name}`}
          </option>
        ))}
      </select>
    </span>
  );
});
