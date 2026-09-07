"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createElencoDeps } from "@/lib/elenco";
import {
  deleteSession,
  emptyElencoSessionState,
  loadSession,
  saveSession,
  syncSession,
  toggleSelect as toggleSelectState,
  toggleSelectAll as toggleSelectAllState,
  type ElencoSessionState,
  type SaveStatus,
} from "@/lib/elenco-session";
import type { Player } from "@/types";

function notifySaveOutcome(status: SaveStatus, isNew: boolean) {
  switch (status) {
    case "synced":
      toast.success(isNew ? "Carta Criada" : "Carta Atualizada", {
        description: "Sincronizado com a nuvem",
      });
      return;
    case "offline":
      toast.warning(isNew ? "Carta Criada Localmente" : "Carta Atualizada Localmente", {
        description: "Salvo no navegador; a nuvem recusou o sync.",
      });
      return;
    case "local-only":
      toast.success(isNew ? "Carta Criada" : "Carta Atualizada", {
        description: "Salvo localmente",
      });
      return;
    case "error":
      toast.error("Erro ao salvar carta");
  }
}

function notifyDeleteOutcome(status: SaveStatus) {
  if (status === "error") {
    toast.error("Erro ao sincronizar exclusão", { description: "Removida localmente" });
    return;
  }
  toast.success("Carta Excluída", {
    description: status === "synced" ? "Removida da nuvem" : "Removida localmente",
  });
}

export function useElenco(userId: string | undefined) {
  const deps = useMemo(() => createElencoDeps(createClient()), []);
  const [state, setState] = useState<ElencoSessionState>(emptyElencoSessionState());
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    let cancelled = false;
    const loadPlayers = async () => {
      // Hard reset whenever the authenticated user changes
      setState(emptyElencoSessionState());
      setLoading(true);
      try {
        if (!userId) return;
        const next = await loadSession(deps, userId);
        if (!cancelled) setState(next);
      } catch (e) {
        console.error("[use-elenco] Player load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadPlayers();
    return () => {
      cancelled = true;
    };
  }, [userId, deps]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conectado", { description: "Sincronizando com a nuvem..." });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Modo Offline", { description: "Dados salvos localmente" });
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const save = useCallback(
    async (playerData: Omit<Player, "rating" | "user_id">) => {
      if (!userId) {
        toast.error("Não autenticado", { description: "Faça login para gerenciar suas cartas." });
        return;
      }
      if (isOnline) setIsSyncing(true);
      try {
        const { state: next, status, isNew } = await saveSession(
          deps,
          userId,
          state,
          playerData,
          isOnline,
        );
        setState(next);
        notifySaveOutcome(status, isNew);
      } finally {
        if (isOnline) setIsSyncing(false);
      }
    },
    [deps, state, userId, isOnline],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!userId) return;
      const { state: next, status } = await deleteSession(deps, userId, state, id, isOnline);
      setState(next);
      notifyDeleteOutcome(status);
    },
    [deps, state, userId, isOnline],
  );

  const toggleSelect = useCallback((id: string) => {
    setState((prev) => toggleSelectState(prev, id));
  }, []);

  const toggleSelectAll = useCallback(() => {
    setState((prev) => {
      const wasAllSelected = prev.players.every((p) => prev.selectedIds.has(p.id));
      const next = toggleSelectAllState(prev);
      if (wasAllSelected) toast.info("Seleção limpa");
      else toast.success(`${next.selectedIds.size} carta(s) selecionada(s)`);
      return next;
    });
  }, []);

  const sync = useCallback(async () => {
    if (!userId) {
      toast.error("Não Autenticado", { description: "Autenticação necessária para sincronizar" });
      return;
    }
    setIsSyncing(true);
    try {
      const next = await syncSession(deps, userId, state);
      setState(next);
      toast.success("Sincronização Completa", {
        description: `${next.players.length} cartas sincronizadas`,
      });
    } catch (e) {
      toast.error("Erro na Sincronização");
    } finally {
      setIsSyncing(false);
    }
  }, [deps, state, userId]);

  return {
    players: state.players,
    selectedIds: state.selectedIds,
    loading,
    isSyncing,
    isOnline,
    actions: { save, delete: remove, toggleSelect, toggleSelectAll, sync },
  };
}
