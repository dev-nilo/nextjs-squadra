"use client";

import { useCallback, useMemo, useState } from "react";
import { faltamParaSortear, moveMember, sortearTimes } from "@/lib/sorteio";
import type { Player, Time } from "@/types";

/**
 * The Elenco's quick Sorteio: which Jogadores are selected, how many Times and
 * the Mínimo por time, and the Times it drew, adjusted by hand. Nothing is
 * saved; a Partida's Sorteio runs on the server instead (ADR 0004).
 */
export function useSorteioRapido(jogadores: readonly Player[]) {
  const [marcados, setMarcados] = useState<ReadonlySet<string>>(() => new Set());
  const [numTimes, setNumTimes] = useState(3);
  const [minimoPorTime, setMinimoPorTime] = useState(5);
  const [times, setTimes] = useState<Time[] | null>(null);

  // Only Jogadores still in the Elenco count: one deleted elsewhere drops out.
  const selecionados = useMemo(() => jogadores.filter((p) => marcados.has(p.id)), [jogadores, marcados]);
  const selectedIds = useMemo(() => new Set(selecionados.map((p) => p.id)), [selecionados]);
  const todosMarcados = jogadores.length > 0 && selecionados.length === jogadores.length;
  const faltam = faltamParaSortear(selecionados.length, numTimes, minimoPorTime);

  const alternar = useCallback((id: string) => {
    setMarcados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }, []);

  const marcarTodos = useCallback(() => setMarcados(new Set(jogadores.map((p) => p.id))), [jogadores]);
  const limpar = useCallback(() => setMarcados(new Set()), []);

  /** Draws (or draws again). False, and nothing changes, while `faltam` > 0. */
  const sortear = useCallback((): boolean => {
    if (faltam > 0) return false;
    setTimes(sortearTimes(selecionados, numTimes));
    return true;
  }, [faltam, selecionados, numTimes]);

  const mover = useCallback((jogadorId: string, deTime: number, paraTime: number) => {
    setTimes((atual) => (atual ? moveMember(atual, jogadorId, deTime, paraTime) : atual));
  }, []);

  return {
    selectedIds,
    todosMarcados,
    alternar,
    marcarTodos,
    limpar,
    numTimes,
    setNumTimes,
    minimoPorTime,
    setMinimoPorTime,
    faltam,
    times,
    sortear,
    mover,
  };
}
