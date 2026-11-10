import { Player } from "@/types";
import { toast } from "sonner";
import { getLocalStorageKey } from "./constants";
import { normalizePlayer } from "./jogador";

/** Keep only Jogadores of this Grupo (or not yet stamped with one under its key). */
function filterPlayersForGrupo(players: Player[], grupoId: string): Player[] {
  return players.filter((p) => !p.grupo_id || p.grupo_id === grupoId);
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

export const saveToLocalStorage = (players: Player[], grupoId: string) => {
  try {
    if (typeof window === "undefined") return;

    const scoped = filterPlayersForGrupo(players, grupoId).map((p) => ({
      ...normalizePlayer(p),
      grupo_id: grupoId,
    }));
    const forLocal = withoutDataUrlImages(scoped);
    const key = getLocalStorageKey(grupoId);

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

export const loadFromLocalStorage = (grupoId: string): Player[] => {
  try {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(getLocalStorageKey(grupoId));
    if (!data) return [];

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      console.warn("[app] Invalid localStorage data, resetting");
      return [];
    }

    return filterPlayersForGrupo(parsed.map(normalizePlayer), grupoId);
  } catch (e) {
    console.error("[app] Error loading from local storage:", e);
    toast.error("Erro ao carregar dados locais");
    return [];
  }
};
