"use client";

import { useCallback, useEffect, useState } from "react";
import { lerPartidaAoVivo, type PartidaAoVivo } from "@/lib/leitura-da-partida";
import { esperaAteComecar, estadoDaPartida } from "@/lib/partida";
import { createClient } from "@/lib/supabase/client";

/**
 * A Partida that stays current while the page is open. One way to refresh:
 * `recarregar` reads it again through the read model. Supabase Realtime calls
 * it for anyone's change (filtered by this Partida and the subscriber's RLS),
 * the page calls it after its own writes, coming back to the page calls it,
 * and the state flips to "encerrada"
 * when the start time comes, even with nothing else happening.
 */
export function usePartidaAoVivo(grupoId: string, inicial: PartidaAoVivo, agoraDoServidor: number) {
  const [dados, setDados] = useState(inicial);
  const [aoVivo, setAoVivo] = useState(false);
  // The server's clock for the first render, so it matches the HTML; the
  // browser's from the first tick on.
  const [agora, setAgora] = useState(agoraDoServidor);
  const id = inicial.partida.id;

  const recarregar = useCallback(async () => {
    try {
      const lida = await lerPartidaAoVivo(createClient(), grupoId, id);
      if (lida) setDados(lida);
    } catch (e) {
      // Keep what's on screen; the next change or reload tries again.
      console.error("[partida] Reload failed:", e);
    }
  }, [grupoId, id]);

  useEffect(() => {
    const supabase = createClient();
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let ativo = true;

    (async () => {
      // Join with the user's token, so RLS lets the changes through.
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (!ativo) return;
      const mudou = () => void recarregar();
      canal = supabase
        .channel(`partida:${id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "presencas", filter: `partida_id=eq.${id}` }, mudou)
        .on("postgres_changes", { event: "*", schema: "public", table: "sorteios", filter: `partida_id=eq.${id}` }, mudou)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "partidas", filter: `id=eq.${id}` }, mudou)
        .subscribe((status) => {
          setAoVivo(status === "SUBSCRIBED");
          // Catch up on anything that changed between the server render and the subscription.
          if (status === "SUBSCRIBED") mudou();
        });
    })();

    return () => {
      ativo = false;
      if (canal) void supabase.removeChannel(canal);
    };
  }, [id, recarregar]);

  // Back in the foreground or back online (a phone drops the socket in the
  // background): catch up on what changed meanwhile.
  useEffect(() => {
    const voltou = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void recarregar();
    };
    document.addEventListener("visibilitychange", voltou);
    window.addEventListener("online", voltou);
    return () => {
      document.removeEventListener("visibilitychange", voltou);
      window.removeEventListener("online", voltou);
    };
  }, [recarregar]);

  useEffect(() => {
    const espera = esperaAteComecar(dados.partida, new Date(agora));
    if (espera === null) return;
    const timer = setTimeout(() => setAgora(Date.now()), espera);
    return () => clearTimeout(timer);
  }, [dados.partida, agora]);

  return { ...dados, aoVivo, recarregar, estado: estadoDaPartida(dados.partida, new Date(agora)) };
}
