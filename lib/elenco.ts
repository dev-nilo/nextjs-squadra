import type { Player } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ElencoScope } from "@/lib/grupo";
import { normalizePlayer } from "@/lib/jogador";
import { isDataUrlImage } from "@/lib/player-image";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from "@/lib/elenco-local";
import {
  preparePlayerForCloud,
  syncPlayerRow,
} from "@/lib/player-supabase";

export type ElencoDeps = {
  clearLegacySharedKey: () => void;
  loadLocal: (scope: ElencoScope) => Player[];
  saveLocal: (players: Player[], scope: ElencoScope) => void;
  fetchCloud: (
    scope: ElencoScope,
  ) => Promise<{
    rows: Record<string, unknown>[] | null;
    error: { message?: string } | null;
  }>;
  persistImageUrl: (
    scope: ElencoScope,
    id: string,
    imageUrl: string,
  ) => Promise<void>;
  deleteCloud: (scope: ElencoScope, id: string) => Promise<void>;
  prepareForCloud: (scope: ElencoScope, player: Player) => Promise<Player>;
  syncRow: (
    player: Player,
    scope: ElencoScope,
    mode: "insert" | "update" | "upsert",
  ) => Promise<{ id?: string }>;
  isDataUrl: (image: string | null | undefined) => boolean;
};

function assertScope(scope: ElencoScope): void {
  if (!scope.userId) {
    throw new Error("Elenco requires an authenticated user id");
  }
  if (!scope.grupoId) {
    throw new Error("Elenco requires a Grupo");
  }
}

/** A Jogador as this Grupo holds it. The author (`user_id`) is kept as stored. */
function inGrupo(jogador: Player, scope: ElencoScope): Player {
  return { ...jogador, grupo_id: scope.grupoId };
}

function mergeNationalityFromLocal(
  cloudRow: Record<string, unknown>,
  normalized: Player,
  local: Player | undefined,
): Player {
  if (!local?.nationality) {
    return normalized;
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
  scope: ElencoScope,
): Promise<Player[]> {
  assertScope(scope);
  deps.clearLegacySharedKey();

  const { rows, error } = await deps.fetchCloud(scope);
  if (error) {
    console.error("[elenco] Failed to load the Grupo's players:", error);
    return deps.loadLocal(scope);
  }

  if (!rows || rows.length === 0) {
    return deps.loadLocal(scope);
  }

  const localById = new Map(deps.loadLocal(scope).map((p) => [p.id, p]));
  let cloudPlayers: Player[] = rows.map((row) => {
    const normalized = normalizePlayer(row);
    const local = localById.get(normalized.id);
    return inGrupo(mergeNationalityFromLocal(row, normalized, local), scope);
  });

  const migrated: Player[] = [];
  for (const jogador of cloudPlayers) {
    if (deps.isDataUrl(jogador.image)) {
      try {
        const withUrl = await deps.prepareForCloud(scope, jogador);
        if (
          withUrl.image !== jogador.image &&
          withUrl.image &&
          !deps.isDataUrl(withUrl.image)
        ) {
          await deps.persistImageUrl(scope, withUrl.id, withUrl.image);
        }
        migrated.push(inGrupo(withUrl, scope));
      } catch {
        migrated.push(jogador);
      }
    } else {
      migrated.push(jogador);
    }
  }
  cloudPlayers = migrated;

  deps.saveLocal(cloudPlayers, scope);
  return cloudPlayers;
}

export async function saveJogador(
  deps: ElencoDeps,
  scope: ElencoScope,
  jogador: Player,
  options: {
    players: Player[];
    isNew: boolean;
    online: boolean;
  },
): Promise<{ players: Player[]; player: Player; synced: boolean }> {
  assertScope(scope);

  // A new Jogador is authored by whoever creates it; an edit keeps the author.
  let fullPlayer: Player = inGrupo({ ...jogador, user_id: jogador.user_id ?? scope.userId }, scope);
  if (options.online) {
    fullPlayer = inGrupo(await deps.prepareForCloud(scope, fullPlayer), scope);
  }

  let players = options.isNew
    ? [...options.players, fullPlayer]
    : options.players.map((p) => (p.id === fullPlayer.id ? fullPlayer : p));

  deps.saveLocal(players, scope);

  let synced = false;
  if (options.online) {
    try {
      const { id } = await deps.syncRow(
        fullPlayer,
        scope,
        options.isNew ? "insert" : "update",
      );
      synced = true;
      if (id && id !== fullPlayer.id) {
        const previousId = fullPlayer.id;
        fullPlayer = { ...fullPlayer, id };
        players = players.map((p) => (p.id === previousId ? fullPlayer : p));
        deps.saveLocal(players, scope);
      }
    } catch (err) {
      console.error("[elenco] Failed to sync jogador:", err);
      synced = false;
    }
  }

  return { players, player: fullPlayer, synced };
}

export async function deleteJogador(
  deps: ElencoDeps,
  scope: ElencoScope,
  id: string,
  options: { players: Player[]; online: boolean },
): Promise<Player[]> {
  assertScope(scope);
  const players = options.players.filter((p) => p.id !== id);
  deps.saveLocal(players, scope);
  if (options.online) {
    await deps.deleteCloud(scope, id);
  }
  return players;
}

export async function syncElenco(
  deps: ElencoDeps,
  scope: ElencoScope,
  players: Player[],
): Promise<Player[]> {
  assertScope(scope);
  const synced: Player[] = [];

  for (const jogador of players) {
    if (jogador.grupo_id && jogador.grupo_id !== scope.grupoId) {
      console.warn("[elenco] Skipping player from another Grupo:", jogador.id);
      continue;
    }
    const doGrupo = inGrupo({ ...jogador, user_id: jogador.user_id ?? scope.userId }, scope);
    try {
      const prepared = inGrupo(await deps.prepareForCloud(scope, doGrupo), scope);
      const { id } = await deps.syncRow(prepared, scope, "upsert");
      synced.push(id && id !== prepared.id ? { ...prepared, id } : prepared);
    } catch (syncErr) {
      console.warn("[elenco] Sync failed for player:", syncErr);
      synced.push(doGrupo);
    }
  }

  deps.saveLocal(synced, scope);
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
    loadLocal: (scope) => loadFromLocalStorage(scope.grupoId),
    saveLocal: (players, scope) => saveToLocalStorage(players, scope.grupoId),
    fetchCloud: async (scope) => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("grupo_id", scope.grupoId);
      return {
        rows: (data as Record<string, unknown>[] | null) ?? null,
        error,
      };
    },
    persistImageUrl: async (scope, id, imageUrl) => {
      await supabase
        .from("players")
        .update({ image_url: imageUrl })
        .eq("id", id)
        .eq("grupo_id", scope.grupoId);
    },
    deleteCloud: async (scope, id) => {
      await supabase.from("players").delete().eq("id", id).eq("grupo_id", scope.grupoId);
    },
    prepareForCloud: (scope, player) =>
      preparePlayerForCloud(supabase, scope, player),
    syncRow: async (player, scope, mode) => {
      const { id } = await syncPlayerRow(supabase, player, scope, mode);
      return { id };
    },
    isDataUrl: isDataUrlImage,
  };
}
