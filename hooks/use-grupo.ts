"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolverGrupo, type Papel, type Participacao, type ParticipacaoDesde } from "@/lib/grupo";

export type GrupoState =
  | { status: "loading" }
  /** Signed in, member of no Grupo yet: show the naming screen. */
  | { status: "sem-grupo" }
  | { status: "pronto"; grupo: Participacao }
  /** The URL names a Grupo that doesn't exist or this user isn't in. */
  | { status: "nao-encontrado" }
  /** Couldn't load the Grupos and none is remembered on this device. */
  | { status: "erro" };

type Linha = {
  papel: Papel;
  created_at: string;
  grupos: { id: string; slug: string; nome: string } | null;
};

type Carga =
  | { userId: string; participacoes: ParticipacaoDesde[] }
  | { userId: string; erro: true };

/** The last Grupo opened on this device, so `/` reopens it and the Elenco still opens offline. */
const chaveDoGrupoAtual = (userId: string) => `squadra:grupo-atual:${userId}`;

function lembrar(userId: string, grupo: Participacao) {
  try {
    localStorage.setItem(chaveDoGrupoAtual(userId), JSON.stringify(grupo));
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

/**
 * The user's Grupos and the one to open: `slug` (from `/g/<slug>`) when given,
 * else the last one used on this device, else the default.
 */
export function useGrupo(userId: string | undefined, slug: string | null) {
  // Keyed by user, so switching accounts reads as loading until that user's Grupos arrive.
  const [carga, setCarga] = useState<Carga | null>(null);
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
          setCarga({ userId, erro: true });
          return;
        }
        const participacoes = ((data ?? []) as unknown as Linha[]).flatMap((linha) =>
          linha.grupos ? [{ ...linha.grupos, papel: linha.papel, desde: linha.created_at }] : [],
        );
        setCarga({ userId, participacoes });
      });

    return () => {
      cancelled = true;
    };
  }, [userId, tentativa]);

  const atual = carga && userId && carga.userId === userId ? carga : null;

  const state = useMemo<GrupoState>(() => {
    if (!atual || !userId) return { status: "loading" };
    if ("erro" in atual) {
      const salvo = lembrado(userId);
      return salvo && (!slug || salvo.slug === slug) ? { status: "pronto", grupo: salvo } : { status: "erro" };
    }
    return resolverGrupo({ participacoes: atual.participacoes, slug, ultimoId: lembrado(userId)?.id ?? null });
  }, [atual, userId, slug]);

  const grupoAberto = state.status === "pronto" ? state.grupo : null;
  useEffect(() => {
    if (userId && grupoAberto) lembrar(userId, grupoAberto);
  }, [userId, grupoAberto]);

  /** After the naming screen creates the Grupo, use it without refetching. */
  const definirGrupo = useCallback(
    (grupo: Participacao) => {
      if (!userId) return;
      lembrar(userId, grupo);
      setCarga((prev) => {
        const antes = prev && prev.userId === userId && "participacoes" in prev ? prev.participacoes : [];
        return { userId, participacoes: [...antes, { ...grupo, desde: new Date().toISOString() }] };
      });
    },
    [userId],
  );

  const tentarDeNovo = useCallback(() => {
    setCarga(null);
    setTentativa((n) => n + 1);
  }, []);

  const participacoes = useMemo(() => (atual && "participacoes" in atual ? atual.participacoes : []), [atual]);

  return { state, participacoes, definirGrupo, tentarDeNovo };
}
