"use client";

import { ChevronDown } from "lucide-react";
import type { Participacao } from "@/lib/grupo";

/**
 * The current Grupo's name next to the brand. With more than one Grupo it's a
 * native select: keyboard, screen readers and the phone's picker for free.
 */
export function GrupoSwitcher({
  grupo,
  participacoes,
  onTrocar,
}: {
  grupo: Participacao;
  participacoes: readonly Participacao[];
  onTrocar: (slug: string) => void;
}) {
  if (participacoes.length <= 1) {
    return (
      <span className="block truncate text-sm font-bold text-foreground" title={grupo.nome}>
        {grupo.nome}
      </span>
    );
  }

  const ordenadas = [...participacoes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <label className="relative flex min-w-0 items-center">
      <span className="sr-only">Trocar de fut</span>
      <select
        value={grupo.slug}
        onChange={(e) => onTrocar(e.target.value)}
        title={grupo.nome}
        className="w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg bg-transparent py-1 pl-1 pr-6 text-sm font-bold text-foreground hover:bg-default-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {ordenadas.map((p) => (
          <option key={p.id} value={p.slug}>
            {p.nome}
          </option>
        ))}
      </select>
      <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-1.5 text-default-500" />
    </label>
  );
}
