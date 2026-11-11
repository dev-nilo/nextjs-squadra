import { afterEach, describe, expect, it } from "vitest";
import { addJogador, addMembro, admin as service, newUser, removeUsers, type TestUser } from "./support";

let users: TestUser[] = [];
const user = async (label: string) => {
  const u = await newUser(label);
  users.push(u);
  return u;
};

afterEach(async () => {
  await removeUsers(...users);
  users = [];
});

type Snapshot = { nome: string; jogadores: { id: string; rating: number; name: string }[] }[];

/** A Grupo, a Partida with `vagas`, and `n` Jogadores the dono confirms in order (the overflow waits). */
async function partidaComConfirmados(n: number, vagas: number) {
  const dono = await user("dono");
  const { data: grupo, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut do Sorteio" });
  if (error) throw error;
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const { data } = await addJogador(dono, grupo.id, `J${i}`, { ovr: 60 + i });
    ids.push(data!.id);
  }
  const { data: partida } = await dono.client
    .from("partidas")
    .insert({ grupo_id: grupo.id, inicio: new Date(Date.now() + 86_400_000).toISOString(), local: "Quadra", vagas })
    .select("id")
    .single()
    .throwOnError();
  for (const id of ids) {
    await dono.client.rpc("responder_presenca", { partida: partida!.id, jogador: id, vou: true }).throwOnError();
  }
  return { dono, grupoId: grupo.id as string, partidaId: partida!.id as string, ids };
}

const salvar = (quem: TestUser, partida: string, times: unknown, novo = true) =>
  quem.client.rpc("salvar_sorteio", { partida, times, novo });

describe("saving a draw", () => {
  it("snapshots every confirmed Jogador into the Times", async () => {
    const { dono, partidaId, ids } = await partidaComConfirmados(4, 10);
    const { data, error } = await salvar(dono, partidaId, [[ids[0], ids[3]], [ids[1], ids[2]]]);
    expect(error).toBeNull();
    const times = data.times as Snapshot;
    expect(times.map((t) => t.nome)).toEqual(["Time 1", "Time 2"]);
    expect(times[0].jogadores.map((j) => [j.name, j.rating])).toEqual([
      ["J0", 60],
      ["J3", 63],
    ]);
  });

  it("never takes the lista de espera", async () => {
    // 5 Jogadores for 4 vagas: J4 waits.
    const { dono, partidaId, ids } = await partidaComConfirmados(5, 4);
    const { error } = await salvar(dono, partidaId, [[ids[0], ids[1], ids[4]], [ids[2], ids[3]]]);
    expect(error?.hint).toBe("lista-mudou");
    expect((await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2], ids[3]]])).error).toBeNull();
  });

  it("needs every confirmed Jogador, once, in 2 to 6 Times", async () => {
    const { dono, partidaId, ids } = await partidaComConfirmados(4, 10);
    expect((await salvar(dono, partidaId, [[ids[0]], [ids[1], ids[2]]])).error?.hint).toBe("lista-mudou");
    expect((await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[1], ids[2], ids[3]]])).error?.hint).toBe("times-invalidos");
    expect((await salvar(dono, partidaId, [[ids[0], ids[1], ids[2], ids[3]]])).error?.hint).toBe("times-invalidos");
    expect((await salvar(dono, partidaId, [["não-é-uuid"], [ids[0]]])).error?.hint).toBe("times-invalidos");
  });

  it("only the dono and admins draw; nobody writes the table directly", async () => {
    const { dono, grupoId, partidaId, ids } = await partidaComConfirmados(4, 10);
    const membro = await user("membro");
    await addMembro(grupoId, membro, "membro");

    expect((await salvar(membro, partidaId, [[ids[0], ids[1]], [ids[2], ids[3]]])).error?.hint).toBe("sem-permissao");
    const direto = await dono.client.from("sorteios").insert({ partida_id: partidaId, times: [] });
    expect(direto.error).not.toBeNull();
  });
});

describe("the snapshot", () => {
  it("doesn't change when a Jogador is edited after the draw, nor when the draft is adjusted", async () => {
    const { dono, partidaId, ids } = await partidaComConfirmados(4, 10);
    await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2], ids[3]]]);

    await dono.client.from("players").update({ ovr: 99, name: "Renomeado" }).eq("id", ids[0]).throwOnError();

    const lido = async () => ((await service().from("sorteios").select("times").eq("partida_id", partidaId).single()).data!.times as Snapshot);
    const jogadorZero = (times: Snapshot) => times.flatMap((t) => t.jogadores).find((j) => j.id === ids[0]);
    expect(jogadorZero(await lido())).toMatchObject({ name: "J0", rating: 60 });

    // Moving J0 to the other Time keeps the rating taken at draw time.
    expect((await salvar(dono, partidaId, [[ids[1]], [ids[2], ids[3], ids[0]]], false)).error).toBeNull();
    const ajustado = await lido();
    expect(ajustado[1].jogadores.map((j) => j.id)).toContain(ids[0]);
    expect(jogadorZero(ajustado)).toMatchObject({ name: "J0", rating: 60 });
  });
});

describe("publishing", () => {
  it("membros see the Times only once published, and then they're frozen", async () => {
    const { dono, grupoId, partidaId, ids } = await partidaComConfirmados(4, 10);
    const membro = await user("membro");
    await addMembro(grupoId, membro, "membro");
    await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2], ids[3]]]);

    expect((await membro.client.from("sorteios").select("partida_id").eq("partida_id", partidaId)).data).toEqual([]);
    expect((await membro.client.rpc("publicar_sorteio", { partida: partidaId })).error?.hint).toBe("sem-permissao");

    expect((await dono.client.rpc("publicar_sorteio", { partida: partidaId })).error).toBeNull();
    expect((await membro.client.from("sorteios").select("partida_id").eq("partida_id", partidaId)).data).toHaveLength(1);
    expect((await salvar(dono, partidaId, [[ids[1], ids[0]], [ids[2], ids[3]]])).error?.hint).toBe("publicado");
  });

  it("refuses to publish if the confirmed list changed since the draw", async () => {
    const { dono, partidaId, ids } = await partidaComConfirmados(4, 10);
    await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2], ids[3]]]);
    await dono.client.rpc("responder_presenca", { partida: partidaId, jogador: ids[3], vou: false }).throwOnError();

    expect((await dono.client.rpc("publicar_sorteio", { partida: partidaId })).error?.hint).toBe("lista-mudou");

    // Leaving out who dropped is a valid adjustment (the others keep their snapshot)…
    expect((await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2]]], false)).error).toBeNull();
    expect((await dono.client.rpc("publicar_sorteio", { partida: partidaId })).error).toBeNull();
  });

  it("an adjustment can't bring in someone confirmed after the draw: that needs a new draw", async () => {
    const { dono, partidaId, ids } = await partidaComConfirmados(4, 10);
    await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2], ids[3]]]);
    const { data: novato } = await addJogador(dono, (await service().from("partidas").select("grupo_id").eq("id", partidaId).single()).data!.grupo_id, "Novato");
    await dono.client.rpc("responder_presenca", { partida: partidaId, jogador: novato!.id, vou: true }).throwOnError();

    expect((await salvar(dono, partidaId, [[ids[0], ids[1], novato!.id], [ids[2], ids[3]]], false)).error?.hint).toBe("lista-mudou");
    expect((await salvar(dono, partidaId, [[ids[0], ids[1], novato!.id], [ids[2], ids[3]]], true)).error).toBeNull();
  });
});
