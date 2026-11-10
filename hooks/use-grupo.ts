"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { grupoAtual, type Papel, type Participacao } from "@/lib/grupo";

export type GrupoState =
  | { status: "loading" }
  /** Signed in, member of no Grupo yet: show the naming screen. */
  | { status: "sem-grupo" }
  | { status: "pronto"; grupo: Participacao }
  /** Couldn't tell (offline, request failed): don't block the Elenco over it. */
  | { status: "erro" };

type Linha = {
  papel: Papel;
  created_at: string;
  grupos: { id: string; slug: string; nome: string } | null;
};

type Resultado = { userId: string; state: Exclude<GrupoState, { status: "loading" }> };

export function useGrupo(userId: string | undefined) {
  // Keyed by user, so switching accounts reads as loading until that user's Grupos arrive.
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    createClient()
      .from("grupo_membros")
      .select("papel, created_at, grupos(id, slug, nome)")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("[grupo] Could not load Grupos:", error.message);
          setResultado({ userId, state: { status: "erro" } });
          return;
        }
        const participacoes = ((data ?? []) as unknown as Linha[]).flatMap((linha) =>
          linha.grupos ? [{ ...linha.grupos, papel: linha.papel, desde: linha.created_at }] : [],
        );
        const atual = grupoAtual(participacoes);
        setResultado({ userId, state: atual ? { status: "pronto", grupo: atual } : { status: "sem-grupo" } });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** After the naming screen creates the Grupo, use it without refetching. */
  const definirGrupo = useCallback(
    (grupo: Participacao) => {
      if (userId) setResultado({ userId, state: { status: "pronto", grupo } });
    },
    [userId],
  );

  const state: GrupoState = userId && resultado?.userId === userId ? resultado.state : { status: "loading" };

  return { state, definirGrupo };
}
