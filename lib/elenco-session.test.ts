import { describe, expect, it, vi } from "vitest";
import type { Attributes, Player } from "@/types";
import type { ElencoDeps } from "@/lib/elenco";
import {
  deleteSession,
  emptyElencoSessionState,
  loadSession,
  saveSession,
  syncSession,
  toggleSelect,
  toggleSelectAll,
  type ElencoSessionState,
} from "@/lib/elenco-session";

const attrs = (n: number): Attributes => ({
  velocidade: n,
  resistencia: n,
  chute: n,
  posicionamento: n,
  defesa: n,
  drible: n,
  passe: n,
  fisico: n,
});

const player = (id: string, overrides: Partial<Player> = {}): Player => ({
  id,
  name: id,
  position: "ATA",
  nationality: "BR",
  image: null,
  attributes: attrs(70),
  rating: 70,
  user_id: "user-1",
  ...overrides,
});

function createDeps(overrides: Partial<ElencoDeps> = {}): ElencoDeps {
  const local = new Map<string, Player[]>();
  return {
    clearLegacySharedKey: vi.fn(),
    loadLocal: vi.fn((userId: string) => local.get(userId) ?? []),
    saveLocal: vi.fn((players: Player[], userId: string) => {
      local.set(userId, players);
    }),
    fetchCloud: vi.fn(async () => ({ rows: [], error: null })),
    persistImageUrl: vi.fn(async () => {}),
    deleteCloud: vi.fn(async () => {}),
    prepareForCloud: vi.fn(async (_userId, p) => p),
    syncRow: vi.fn(async (p) => ({ id: p.id })),
    isDataUrl: vi.fn((image) => typeof image === "string" && image.startsWith("data:")),
    ...overrides,
  };
}

const stateWith = (players: Player[], selected: string[] = []): ElencoSessionState => ({
  players,
  selectedIds: new Set(selected),
});

describe("loadSession", () => {
  it("returns players and a reset selection", async () => {
    const deps = createDeps({
      fetchCloud: vi.fn(async () => ({ rows: [], error: null })),
      loadLocal: vi.fn(() => [player("a")]),
    });
    const result = await loadSession(deps, "user-1");
    expect(result.players.map((p) => p.id)).toEqual(["a"]);
    expect(result.selectedIds.size).toBe(0);
  });
});

describe("saveSession", () => {
  it("reports synced when online and cloud accepts", async () => {
    const deps = createDeps();
    const { state, status, isNew } = await saveSession(
      deps,
      "user-1",
      emptyElencoSessionState(),
      { id: "p1", name: "Novo", position: "ATA", nationality: "BR", image: null, attributes: attrs(80) },
      true,
    );
    expect(isNew).toBe(true);
    expect(status).toBe("synced");
    expect(state.players).toHaveLength(1);
  });

  it("reports offline when online but cloud sync fails", async () => {
    const deps = createDeps({
      syncRow: vi.fn(async () => {
        throw new Error("cloud down");
      }),
    });
    const { status } = await saveSession(
      deps,
      "user-1",
      emptyElencoSessionState(),
      { id: "p1", name: "Novo", position: "ATA", nationality: "BR", image: null, attributes: attrs(80) },
      true,
    );
    expect(status).toBe("offline");
  });

  it("reports local-only when not online", async () => {
    const deps = createDeps();
    const { status } = await saveSession(
      deps,
      "user-1",
      emptyElencoSessionState(),
      { id: "p1", name: "Novo", position: "ATA", nationality: "BR", image: null, attributes: attrs(80) },
      false,
    );
    expect(status).toBe("local-only");
  });

  it("reports error and keeps prior state when saveJogador throws", async () => {
    const deps = createDeps({
      prepareForCloud: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    const prior = stateWith([player("existing")]);
    const { state, status } = await saveSession(
      deps,
      "user-1",
      prior,
      { id: "p1", name: "Novo", position: "ATA", nationality: "BR", image: null, attributes: attrs(80) },
      true,
    );
    expect(status).toBe("error");
    expect(state).toBe(prior);
  });
});

describe("deleteSession", () => {
  it("removes the player and drops it from selection", async () => {
    const deps = createDeps();
    const prior = stateWith([player("a"), player("b")], ["a", "b"]);
    const { state, status } = await deleteSession(deps, "user-1", prior, "a", true);
    expect(state.players.map((p) => p.id)).toEqual(["b"]);
    expect(state.selectedIds.has("a")).toBe(false);
    expect(state.selectedIds.has("b")).toBe(true);
    expect(status).toBe("synced");
  });

  it("keeps the local removal and reports error when cloud delete fails", async () => {
    const deps = createDeps({
      deleteCloud: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    const prior = stateWith([player("a")], ["a"]);
    const { state, status } = await deleteSession(deps, "user-1", prior, "a", true);
    expect(state.players).toHaveLength(0);
    expect(status).toBe("error");
  });
});

describe("syncSession", () => {
  it("replaces players with the synced set", async () => {
    const deps = createDeps({
      syncRow: vi.fn(async (p) => ({ id: `synced-${p.id}` })),
    });
    const prior = stateWith([player("1")]);
    const result = await syncSession(deps, "user-1", prior);
    expect(result.players.map((p) => p.id)).toEqual(["synced-1"]);
  });
});

describe("toggleSelect / toggleSelectAll", () => {
  it("toggles a single id on and off", () => {
    const s1 = toggleSelect(emptyElencoSessionState(), "a");
    expect(s1.selectedIds.has("a")).toBe(true);
    const s2 = toggleSelect(s1, "a");
    expect(s2.selectedIds.has("a")).toBe(false);
  });

  it("selects all when not all selected, clears when all selected", () => {
    const state = stateWith([player("a"), player("b")], ["a"]);
    const selectAll = toggleSelectAll(state);
    expect(selectAll.selectedIds).toEqual(new Set(["a", "b"]));
    const clearAll = toggleSelectAll(selectAll);
    expect(clearAll.selectedIds.size).toBe(0);
  });
});
