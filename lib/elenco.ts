import type { Player } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePlayer } from "@/lib/jogador";
import { isDataUrlImage } from "@/lib/player-image";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from "@/lib/player-utils";
import {
  preparePlayerForCloud,
  syncPlayerRow,
} from "@/lib/player-supabase";

export type ElencoDeps = {
  clearLegacySharedKey: () => void;
  loadLocal: (userId: string) => Player[];
  saveLocal: (players: Player[], userId: string) => void;
  fetchCloud: (
    userId: string,
  ) => Promise<{
    rows: Record<string, unknown>[] | null;
    error: { message?: string } | null;
  }>;
  persistImageUrl: (
    userId: string,
    id: string,
    imageUrl: string,
  ) => Promise<void>;
  deleteCloud: (userId: string, id: string) => Promise<void>;
  prepareForCloud: (userId: string, player: Player) => Promise<Player>;
  syncRow: (
    player: Player,
    userId: string,
    mode: "insert" | "update" | "upsert",
  ) => Promise<{ id?: string }>;
  isDataUrl: (image: string | null | undefined) => boolean;
};

function assertUserId(userId: string): void {
  if (!userId) {
    throw new Error("Elenco requires an authenticated user id");
  }
}

function mergeNationalityFromLocal(
  cloudRow: Record<string, unknown>,
  normalized: Player,
  local: Player | undefined,
): Player {
  if (!local?.nationality) {
    return { ...normalized, user_id: normalized.user_id };
  }
  if (!normalized.nationality || normalized.nationality === "BR") {
    if (
      !("nationality" in cloudRow) ||
      cloudRow.nationality == null
    ) {
      return { ...normalized, nationality: local.nationality };
    }
  }
  if (local.nationality !== "BR" && normalized.nationality === "BR") {
    return { ...normalized, nationality: local.nationality };
  }
  return normalized;
}

export async function loadElenco(
  deps: ElencoDeps,
  userId: string,
): Promise<Player[]> {
  assertUserId(userId);
  deps.clearLegacySharedKey();

  const { rows, error } = await deps.fetchCloud(userId);
  if (error) {
    console.error("[elenco] Failed to load players for user:", error);
    return deps.loadLocal(userId);
  }

  if (!rows || rows.length === 0) {
    return deps.loadLocal(userId);
  }

  const localById = new Map(deps.loadLocal(userId).map((p) => [p.id, p]));
  let cloudPlayers: Player[] = rows.map((row) => {
    const normalized = normalizePlayer({ ...row, user_id: userId });
    const local = localById.get(normalized.id);
    return {
      ...mergeNationalityFromLocal(row, normalized, local),
      user_id: userId,
    };
  });

  const migrated: Player[] = [];
  for (const jogador of cloudPlayers) {
    if (deps.isDataUrl(jogador.image)) {
      try {
        const withUrl = await deps.prepareForCloud(userId, jogador);
        if (
          withUrl.image !== jogador.image &&
          withUrl.image &&
          !deps.isDataUrl(withUrl.image)
        ) {
          await deps.persistImageUrl(userId, withUrl.id, withUrl.image);
        }
        migrated.push({ ...withUrl, user_id: userId });
      } catch {
        migrated.push({ ...jogador, user_id: userId });
      }
    } else {
      migrated.push({ ...jogador, user_id: userId });
    }
  }
  cloudPlayers = migrated;

  deps.saveLocal(cloudPlayers, userId);
  return cloudPlayers;
}

export async function saveJogador(
  deps: ElencoDeps,
  userId: string,
  jogador: Player,
  options: {
    roster: Player[];
    isNew: boolean;
    online: boolean;
  },
): Promise<{ roster: Player[]; player: Player }> {
  assertUserId(userId);

  let fullPlayer: Player = { ...jogador, user_id: userId };
  if (options.online) {
    fullPlayer = {
      ...(await deps.prepareForCloud(userId, fullPlayer)),
      user_id: userId,
    };
  }

  let roster = options.isNew
    ? [...options.roster, fullPlayer]
    : options.roster.map((p) => (p.id === fullPlayer.id ? fullPlayer : p));

  deps.saveLocal(roster, userId);

  if (options.online) {
    const { id } = await deps.syncRow(
      fullPlayer,
      userId,
      options.isNew ? "insert" : "update",
    );
    if (id && id !== fullPlayer.id) {
      const previousId = fullPlayer.id;
      fullPlayer = { ...fullPlayer, id, user_id: userId };
      roster = roster.map((p) => (p.id === previousId ? fullPlayer : p));
      deps.saveLocal(roster, userId);
    }
  }

  return { roster, player: fullPlayer };
}

export async function deleteJogador(
  deps: ElencoDeps,
  userId: string,
  id: string,
  options: { roster: Player[]; online: boolean },
): Promise<Player[]> {
  assertUserId(userId);
  const roster = options.roster.filter((p) => p.id !== id);
  deps.saveLocal(roster, userId);
  if (options.online) {
    await deps.deleteCloud(userId, id);
  }
  return roster;
}

export async function syncElenco(
  deps: ElencoDeps,
  userId: string,
  players: Player[],
): Promise<Player[]> {
  assertUserId(userId);
  const synced: Player[] = [];

  for (const jogador of players) {
    if (jogador.user_id && jogador.user_id !== userId) {
      console.warn("[elenco] Skipping player from another user:", jogador.id);
      continue;
    }
    try {
      const prepared = await deps.prepareForCloud(userId, {
        ...jogador,
        user_id: userId,
      });
      const { id } = await deps.syncRow(prepared, userId, "upsert");
      synced.push({
        ...(id && id !== prepared.id ? { ...prepared, id } : prepared),
        user_id: userId,
      });
    } catch (syncErr) {
      console.warn("[elenco] Sync failed for player:", syncErr);
      synced.push({ ...jogador, user_id: userId });
    }
  }

  deps.saveLocal(synced, userId);
  return synced;
}

/** Production deps: Supabase + localStorage + existing sync helpers. */
export function createElencoDeps(supabase: SupabaseClient): ElencoDeps {
  return {
    clearLegacySharedKey: () => {
      try {
        localStorage.removeItem("fut-cards-players-v2");
      } catch {
        /* ignore */
      }
    },
    loadLocal: (userId) => loadFromLocalStorage(userId),
    saveLocal: (players, userId) => saveToLocalStorage(players, userId),
    fetchCloud: async (userId) => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("user_id", userId);
      return {
        rows: (data as Record<string, unknown>[] | null) ?? null,
        error,
      };
    },
    persistImageUrl: async (userId, id, imageUrl) => {
      await supabase
        .from("players")
        .update({ image_url: imageUrl })
        .eq("id", id)
        .eq("user_id", userId);
    },
    deleteCloud: async (userId, id) => {
      await supabase.from("players").delete().eq("id", id).eq("user_id", userId);
    },
    prepareForCloud: (userId, player) =>
      preparePlayerForCloud(supabase, userId, player),
    syncRow: async (player, userId, mode) => {
      const { id } = await syncPlayerRow(supabase, player, userId, mode);
      return { id };
    },
    isDataUrl: isDataUrlImage,
  };
}
