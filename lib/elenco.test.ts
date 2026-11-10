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

const SCOPE = { userId: "user-1", grupoId: "grupo-1" };

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
    loadLocal: vi.fn((scope: { grupoId: string }) => local.get(scope.grupoId) ?? []),
    saveLocal: vi.fn((players: Player[], scope: { grupoId: string }) => {
      local.set(scope.grupoId, players);
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
  it("requires a signed-in user and a Grupo", async () => {
    const deps = createDeps();
    await expect(loadElenco(deps, { userId: "", grupoId: "grupo-1" })).rejects.toThrow(/user/i);
    await expect(loadElenco(deps, { userId: "user-1", grupoId: "" })).rejects.toThrow(/grupo/i);
  });

  it("keeps each Jogador's author and puts them in the Grupo", async () => {
    const deps = createDeps({
      fetchCloud: vi.fn(async () => ({
        rows: [
          { id: "mine", name: "Meu", position: "ALA", user_id: "user-1", grupo_id: "grupo-1" },
          { id: "theirs", name: "Do Admin", position: "ATA", user_id: "admin-2", grupo_id: "grupo-1" },
        ],
        error: null,
      })),
    });

    const result = await loadElenco(deps, SCOPE);
    expect(result.map((p) => [p.id, p.user_id, p.grupo_id])).toEqual([
      ["mine", "user-1", "grupo-1"],
      ["theirs", "admin-2", "grupo-1"],
    ]);
    expect(deps.fetchCloud).toHaveBeenCalledWith(SCOPE);
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

    const result = await loadElenco(deps, SCOPE);
    expect(result).toEqual(cached);
    expect(deps.clearLegacySharedKey).toHaveBeenCalled();
  });

  it("returns local when cloud is empty", async () => {
    const cached = [player("only-local")];
    const deps = createDeps({
      loadLocal: vi.fn(() => cached),
      fetchCloud: vi.fn(async () => ({ rows: [], error: null })),
    });
    expect(await loadElenco(deps, SCOPE)).toEqual(cached);
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

    const result = await loadElenco(deps, SCOPE);
    expect(result).toHaveLength(1);
    expect(result[0].image).toBe("https://cdn.example/p.png");
    expect(deps.persistImageUrl).toHaveBeenCalledWith(
      SCOPE,
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

    const { players, player: saved } = await saveJogador(deps, SCOPE, incoming, {
      players: existing,
      isNew: true,
      online: true,
    });

    expect(saved.id).toBe("cloud-id");
    expect(players.map((p) => p.id).sort()).toEqual(["cloud-id", "old"]);
    expect(deps.saveLocal).toHaveBeenCalledWith(players, SCOPE);
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
      SCOPE,
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
    const { players } = await saveJogador(deps, SCOPE, incoming, {
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
    const next = await deleteJogador(deps, SCOPE, "a", {
      players,
      online: true,
    });
    expect(next.map((p) => p.id)).toEqual(["b"]);
    expect(deps.deleteCloud).toHaveBeenCalledWith(SCOPE, "a");
    expect(deps.saveLocal).toHaveBeenCalledWith(next, SCOPE);
  });
});

describe("syncElenco", () => {
  it("upserts each jogador and returns synced players", async () => {
    const deps = createDeps({
      syncRow: vi.fn(async (p) => ({ id: `synced-${p.id}` })),
    });
    const result = await syncElenco(deps, SCOPE, [
      player("1"),
      player("2", { grupo_id: "other-grupo" }),
      player("3", { user_id: "admin-2" }),
    ]);
    expect(result.map((p) => [p.id, p.user_id, p.grupo_id])).toEqual([
      ["synced-1", "user-1", "grupo-1"],
      ["synced-3", "admin-2", "grupo-1"],
    ]);
    expect(deps.saveLocal).toHaveBeenCalled();
  });
});
