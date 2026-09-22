import type { Player } from "@/types";
import {
  deleteJogador,
  loadElenco,
  saveJogador,
  syncElenco,
  type ElencoDeps,
} from "@/lib/elenco";
import { calculateOVR } from "@/lib/jogador";

export type SaveStatus = "synced" | "local-only" | "offline" | "error";

export type ElencoSessionState = {
  players: Player[];
  selectedIds: Set<string>;
};

export const emptyElencoSessionState = (): ElencoSessionState => ({
  players: [],
  selectedIds: new Set(),
});

/** Fetch a user's Elenco. Callers reset state first on user change. */
export async function loadSession(
  deps: ElencoDeps,
  userId: string,
): Promise<ElencoSessionState> {
  const players = await loadElenco(deps, userId);
  return { players, selectedIds: new Set() };
}

/** Save (create/update) a Jogador, returning the next state and what happened. */
export async function saveSession(
  deps: ElencoDeps,
  userId: string,
  state: ElencoSessionState,
  playerData: Omit<Player, "rating" | "user_id">,
  online: boolean,
): Promise<{ state: ElencoSessionState; status: SaveStatus; isNew: boolean }> {
  const isNew = !state.players.some((p) => p.id === playerData.id);
  const rating = calculateOVR(playerData.attributes);
  const fullPlayer: Player = { ...playerData, rating, user_id: userId };

  try {
    const { players, synced } = await saveJogador(deps, userId, fullPlayer, {
      players: state.players,
      isNew,
      online,
    });
    const status: SaveStatus = !online
      ? "local-only"
      : synced
        ? "synced"
        : "offline";
    return { state: { ...state, players }, status, isNew };
  } catch (e) {
    console.error("[elenco-session] Failed to save player:", e);
    return { state, status: "error", isNew };
  }
}

/**
 * Optimistically remove a Jogador, then confirm against the deps. On failure,
 * the optimistic removal is kept (retried offline) rather than rolled back —
 * the user already saw it disappear, and Elenco's local cache is now authoritative.
 */
export async function deleteSession(
  deps: ElencoDeps,
  userId: string,
  state: ElencoSessionState,
  id: string,
  online: boolean,
): Promise<{ state: ElencoSessionState; status: SaveStatus }> {
  const optimistic = withoutSelection(
    { ...state, players: state.players.filter((p) => p.id !== id) },
    id,
  );

  try {
    const players = await deleteJogador(deps, userId, id, {
      players: state.players,
      online,
    });
    return {
      state: { ...optimistic, players },
      status: online ? "synced" : "local-only",
    };
  } catch (e) {
    console.error("[elenco-session] Failed to sync delete, keeping local:", e);
    const players = await deleteJogador(deps, userId, id, {
      players: state.players,
      online: false,
    });
    return { state: { ...optimistic, players }, status: "error" };
  }
}

export async function syncSession(
  deps: ElencoDeps,
  userId: string,
  state: ElencoSessionState,
): Promise<ElencoSessionState> {
  const players = await syncElenco(deps, userId, state.players);
  return { ...state, players };
}

export function toggleSelect(
  state: ElencoSessionState,
  id: string,
): ElencoSessionState {
  const selectedIds = new Set(state.selectedIds);
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  return { ...state, selectedIds };
}

export function toggleSelectAll(state: ElencoSessionState): ElencoSessionState {
  const allSelected = state.players.every((p) => state.selectedIds.has(p.id));
  return {
    ...state,
    selectedIds: allSelected
      ? new Set()
      : new Set(state.players.map((p) => p.id)),
  };
}

function withoutSelection(
  state: ElencoSessionState,
  id: string,
): ElencoSessionState {
  if (!state.selectedIds.has(id)) return state;
  const selectedIds = new Set(state.selectedIds);
  selectedIds.delete(id);
  return { ...state, selectedIds };
}
