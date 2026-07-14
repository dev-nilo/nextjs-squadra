import { Player } from "@/types";
import { toast } from "sonner";
import { getLocalStorageKey, LOCAL_STORAGE_KEY_LEGACY } from "./constants";
import {
  filterPlayersForUser,
  normalizePlayer,
} from "./jogador";

export const processImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const targetWidth = 300;
        const targetHeight = 400;
        const targetRatio = targetWidth / targetHeight;

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(img.src);
          return;
        }

        const imgRatio = img.width / img.height;

        let renderW, renderH, offsetX, offsetY;

        if (imgRatio > targetRatio) {
          renderH = targetHeight;
          renderW = targetHeight * imgRatio;
          offsetX = (targetWidth - renderW) / 2;
          offsetY = 0;
        } else {
          renderW = targetWidth;
          renderH = targetWidth / imgRatio;
          offsetX = 0;
          offsetY = 0;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

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

/** Clear cache for a specific user (or guest). */
export const clearLocalStorageForUser = (userId?: string | null) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(getLocalStorageKey(userId));
  } catch (e) {
    console.error("[app] Error clearing local storage:", e);
  }
};
