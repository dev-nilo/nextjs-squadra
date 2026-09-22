import { Player } from "@/types";
import { toast } from "sonner";
import { getLocalStorageKey, LOCAL_STORAGE_KEY_LEGACY } from "./constants";
import { normalizePlayer } from "./jogador";

/** Keep only rows that belong to this user (or have no owner yet under this scoped key). */
function filterPlayersForUser(
  players: Player[],
  userId: string | null | undefined,
): Player[] {
  if (!userId) {
    return players.filter((p) => !p.user_id);
  }
  return players.filter((p) => !p.user_id || p.user_id === userId);
}

const isQuotaExceededError = (e: unknown): boolean => {
  if (e instanceof DOMException) {
    return e.name === "QuotaExceededError" || e.code === 22;
  }
  if (e instanceof Error && /quota|exceeded/i.test(e.message)) {
    return true;
  }
  return false;
};

let quotaSaveNoticeShown = false;

const withoutDataUrlImages = (players: Player[]): Player[] =>
  players.map((p) => ({
    ...p,
    image: p.image?.startsWith("data:") ? null : p.image,
  }));

const withoutAnyImages = (players: Player[]): Player[] =>
  players.map((p) => ({
    ...p,
    image: null,
  }));

export const saveToLocalStorage = (players: Player[], userId?: string | null) => {
  try {
    if (typeof window === "undefined") return;

    const scoped = filterPlayersForUser(players, userId).map((p) =>
      userId ? { ...normalizePlayer(p), user_id: userId } : normalizePlayer(p),
    );
    const forLocal = withoutDataUrlImages(scoped);
    const key = getLocalStorageKey(userId);

    const tryWrite = (list: Player[]) => {
      localStorage.setItem(key, JSON.stringify(list));
    };

    try {
      tryWrite(forLocal);
      return;
    } catch (first) {
      if (!isQuotaExceededError(first)) throw first;
    }

    try {
      tryWrite(withoutAnyImages(forLocal));
      console.warn(
        "[app] Saved players to localStorage without images — storage quota",
      );
      if (!quotaSaveNoticeShown) {
        quotaSaveNoticeShown = true;
        toast.warning("Armazenamento local", {
          description:
            "Limite do navegador atingido. Fotos ficam só na nuvem (URLs); rode o script do bucket se ainda não configurou o Storage.",
        });
      }
      return;
    } catch (third) {
      throw third;
    }
  } catch (e) {
    console.error("[app] Error saving to local storage:", e);
    toast.error("Erro ao salvar dados localmente", {
      description: isQuotaExceededError(e)
        ? "Limite de armazenamento do navegador excedido."
        : undefined,
    });
  }
};

export const loadFromLocalStorage = (userId?: string | null): Player[] => {
  try {
    if (typeof window === "undefined") return [];
    const key = getLocalStorageKey(userId);
    let data = localStorage.getItem(key);

    // One-time migration: legacy unscoped key → guest only (never into another account)
    if (!data && !userId) {
      const legacy = localStorage.getItem(LOCAL_STORAGE_KEY_LEGACY);
      if (legacy) {
        data = legacy;
        localStorage.setItem(getLocalStorageKey(null), legacy);
        localStorage.removeItem(LOCAL_STORAGE_KEY_LEGACY);
      }
    }

    if (!data) return [];

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      console.warn("[app] Invalid localStorage data, resetting");
      return [];
    }

    return filterPlayersForUser(parsed.map(normalizePlayer), userId);
  } catch (e) {
    console.error("[app] Error loading from local storage:", e);
    toast.error("Erro ao carregar dados locais");
    return [];
  }
};
