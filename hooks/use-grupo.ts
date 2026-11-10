"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { grupoAtual, type Papel, type Participacao } from "@/lib/grupo";

export type GrupoState =
  | { status: "loading" }
  /** Signed in, member of no Grupo yet: show the naming screen. */
  | { status: "sem-grupo" }
  | { status: "pronto"; grupo: Participacao }
  /** Couldn't load the Grupos and none is remembered on this device. */
  | { status: "erro" };

type Linha = {
  papel: Papel;
  created_at: string;
  grupos: { id: string; slug: string; nome: string } | null;
};

type Resultado = { userId: string; state: Exclude<GrupoState, { status: "loading" }> };

/** The last Grupo opened on this device, so the Elenco still opens offline. */
const chaveDoGrupoAtual = (userId: string) => `squadra:grupo-atual:${userId}`;

function lembrar(userId: string, grupo: Participacao | null) {
  try {
    if (grupo) localStorage.setItem(chaveDoGrupoAtual(userId), JSON.stringify(grupo));
    else localStorage.removeItem(chaveDoGrupoAtual(userId));
  } catch {
    /* storage unavailable: nothing to remember */
  }
}

function lembrado(userId: string): Participacao | null {
  try {
    const raw = localStorage.getItem(chaveDoGrupoAtual(userId));
    const grupo = raw ? (JSON.parse(raw) as Partial<Participacao>) : null;
    return grupo?.id && grupo.slug && grupo.nome && grupo.papel ? (grupo as Participacao) : null;
  } catch {
    return null;
  }
}

export function useGrupo(userId: string | undefined) {
  // Keyed by user, so switching accounts reads as loading until that user's Grupos arrive.
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [tentativa, setTentativa] = useState(0);

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
          const salvo = lembrado(userId);
          setResultado({ userId, state: salvo ? { status: "pronto", grupo: salvo } : { status: "erro" } });
          return;
        }
        const participacoes = ((data ?? []) as unknown as Linha[]).flatMap((linha) =>
          linha.grupos ? [{ ...linha.grupos, papel: linha.papel, desde: linha.created_at }] : [],
        );
        const atual = grupoAtual(participacoes);
        lembrar(userId, atual);
        setResultado({ userId, state: atual ? { status: "pronto", grupo: atual } : { status: "sem-grupo" } });
      });

    return () => {
      cancelled = true;
    };
  }, [userId, tentativa]);

  /** After the naming screen creates the Grupo, use it without refetching. */
  const definirGrupo = useCallback(
    (grupo: Participacao) => {
      if (!userId) return;
      lembrar(userId, grupo);
      setResultado({ userId, state: { status: "pronto", grupo } });
    },
    [userId],
  );

  const tentarDeNovo = useCallback(() => {
    setResultado(null);
    setTentativa((n) => n + 1);
  }, []);

  const state: GrupoState = userId && resultado?.userId === userId ? resultado.state : { status: "loading" };

  return { state, definirGrupo, tentarDeNovo };
}
