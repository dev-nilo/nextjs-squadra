import { describe, expect, it, vi } from "vitest";
import type { Attributes, Player } from "@/types";
import {
  deleteJogador,
  loadElenco,
  saveJogador,
  syncElenco,
  type ElencoDeps,
} from "@/lib/elenco";

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

describe("loadElenco", () => {
  it("requires userId (auth-only)", async () => {
    const deps = createDeps();
    await expect(loadElenco(deps, "")).rejects.toThrow(/user/i);
  });

  it("returns local cache when cloud fetch fails", async () => {
    const cached = [player("local-1")];
    const deps = createDeps({
      loadLocal: vi.fn(() => cached),
      fetchCloud: vi.fn(async () => ({
        rows: null,
        error: { message: "network" },
      })),
    });

    const result = await loadElenco(deps, "user-1");
    expect(result).toEqual(cached);
    expect(deps.clearLegacySharedKey).toHaveBeenCalled();
  });

  it("returns local when cloud is empty", async () => {
    const cached = [player("only-local")];
    const deps = createDeps({
      loadLocal: vi.fn(() => cached),
      fetchCloud: vi.fn(async () => ({ rows: [], error: null })),
    });
    expect(await loadElenco(deps, "user-1")).toEqual(cached);
  });

  it("normalizes cloud rows, saves local, and migrates data-URL images", async () => {
    const deps = createDeps({
      loadLocal: vi.fn(() => []),
      fetchCloud: vi.fn(async () => ({
        rows: [
          {
            id: "c1",
            name: "Cloud",
            position: "ATA",
            ovr: 80,
            velocidade: 80,
            resistencia: 80,
            chute: 80,
            posicionamento: 80,
            defesa: 80,
            drible: 80,
            passe: 80,
            fisico: 80,
            image_url: "data:image/png;base64,abc",
          },
        ],
        error: null,
      })),
      isDataUrl: vi.fn(
        (image) => typeof image === "string" && image.startsWith("data:"),
      ),
      prepareForCloud: vi.fn(async (_u, p) => ({
        ...p,
        image: "https://cdn.example/p.png",
      })),
    });

    const result = await loadElenco(deps, "user-1");
    expect(result).toHaveLength(1);
    expect(result[0].image).toBe("https://cdn.example/p.png");
    expect(deps.persistImageUrl).toHaveBeenCalledWith(
      "user-1",
      "c1",
      "https://cdn.example/p.png",
    );
    expect(deps.saveLocal).toHaveBeenCalled();
  });
});

describe("saveJogador", () => {
  it("prepares and syncs when online, remaps id, updates local players", async () => {
    const existing = [player("old")];
    const incoming = player("temp-id", { name: "Novo" });
    const deps = createDeps({
      prepareForCloud: vi.fn(async (_u, p) => p),
      syncRow: vi.fn(async () => ({ id: "cloud-id" })),
    });

    const { players, player: saved } = await saveJogador(deps, "user-1", incoming, {
      players: existing,
      isNew: true,
      online: true,
    });

    expect(saved.id).toBe("cloud-id");
    expect(players.map((p) => p.id).sort()).toEqual(["cloud-id", "old"]);
    expect(deps.saveLocal).toHaveBeenCalledWith(players, "user-1");
  });

  it("keeps prepared local player when cloud sync fails", async () => {
    const deps = createDeps({
      prepareForCloud: vi.fn(async (_u, p) => ({
        ...p,
        image: "https://cdn.example/ok.png",
      })),
      syncRow: vi.fn(async () => {
        throw new Error("cloud down");
      }),
    });
    const { players, player: saved, synced } = await saveJogador(
      deps,
      "user-1",
      player("p1", { image: "data:image/png;base64,x" }),
      { players: [], isNew: true, online: true },
    );
    expect(synced).toBe(false);
    expect(saved.image).toBe("https://cdn.example/ok.png");
    expect(players[0].image).toBe("https://cdn.example/ok.png");
  });

  it("skips cloud when offline but still updates local", async () => {
    const deps = createDeps();
    const incoming = player("p1");
    const { players } = await saveJogador(deps, "user-1", incoming, {
      players: [],
      isNew: true,
      online: false,
    });
    expect(players).toHaveLength(1);
    expect(deps.syncRow).not.toHaveBeenCalled();
    expect(deps.saveLocal).toHaveBeenCalled();
  });
});

describe("deleteJogador", () => {
  it("removes from players, saves local, deletes cloud when online", async () => {
    const deps = createDeps();
    const players = [player("a"), player("b")];
    const next = await deleteJogador(deps, "user-1", "a", {
      players,
      online: true,
    });
    expect(next.map((p) => p.id)).toEqual(["b"]);
    expect(deps.deleteCloud).toHaveBeenCalledWith("user-1", "a");
    expect(deps.saveLocal).toHaveBeenCalledWith(next, "user-1");
  });
});

describe("syncElenco", () => {
  it("upserts each jogador and returns synced players", async () => {
    const deps = createDeps({
      syncRow: vi.fn(async (p) => ({ id: `synced-${p.id}` })),
    });
    const result = await syncElenco(deps, "user-1", [
      player("1"),
      player("2", { user_id: "other" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("synced-1");
    expect(deps.saveLocal).toHaveBeenCalled();
  });
});
