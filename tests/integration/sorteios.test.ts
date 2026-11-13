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

/** All 8 attributes at `n`, so the database's Overall is `n` (trigger players_ovr). */
const atributos = (n: number) => ({
  velocidade: n, resistencia: n, chute: n, posicionamento: n, defesa: n, drible: n, passe: n, fisico: n,
});

/** A Grupo, a Partida with `vagas`, and `n` Jogadores the dono confirms in order (the overflow waits). */
async function partidaComConfirmados(n: number, vagas: number) {
  const dono = await user("dono");
  const { data: grupo, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut do Sorteio" });
  if (error) throw error;
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const { data } = await addJogador(dono, grupo.id, `J${i}`, atributos(60 + i));
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

const salvar = (quem: TestUser, partida: string, times: unknown) => quem.client.rpc("salvar_sorteio", { partida, times });

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
  it("doesn't change when a Jogador is edited after the draw; a new draw takes them as they are now", async () => {
    const { dono, partidaId, ids } = await partidaComConfirmados(4, 10);
    await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2], ids[3]]]);

    await dono.client.from("players").update({ ...atributos(99), name: "Renomeado" }).eq("id", ids[0]).throwOnError();

    const lido = async () => ((await service().from("sorteios").select("times").eq("partida_id", partidaId).single()).data!.times as Snapshot);
    const jogadorZero = (times: Snapshot) => times.flatMap((t) => t.jogadores).find((j) => j.id === ids[0]);
    expect(jogadorZero(await lido())).toMatchObject({ name: "J0", rating: 60 });

    await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2], ids[3]]]);
    expect(jogadorZero(await lido())).toMatchObject({ name: "Renomeado", rating: 99 });
  });

  it("takes only the Partida and the Times: the old `novo` parameter is gone", async () => {
    const { dono, partidaId, ids } = await partidaComConfirmados(4, 10);
    const { error } = await dono.client.rpc("salvar_sorteio", { partida: partidaId, times: [[ids[0], ids[1]], [ids[2], ids[3]]], novo: true });
    // PostgREST finds no function with those arguments.
    expect(error?.code).toBe("PGRST202");
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

    // Drawn again without who dropped, it publishes.
    expect((await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2]]])).error).toBeNull();
    expect((await dono.client.rpc("publicar_sorteio", { partida: partidaId })).error).toBeNull();
  });

  it("someone confirmed after the draw can't be moved in: that needs a new draw", async () => {
    const { dono, partidaId, ids } = await partidaComConfirmados(4, 10);
    const { data: sorteio } = await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2], ids[3]]]);
    const { data: novato } = await addJogador(dono, (await service().from("partidas").select("grupo_id").eq("id", partidaId).single()).data!.grupo_id, "Novato");
    await dono.client.rpc("responder_presenca", { partida: partidaId, jogador: novato!.id, vou: true }).throwOnError();

    const movido = await dono.client.rpc("mover_no_sorteio", { partida: partidaId, jogador: ids[0], para_time: 1, sorteado_em: sorteio.sorteado_em });
    expect(movido.error?.hint).toBe("lista-mudou");
    expect((await salvar(dono, partidaId, [[ids[0], ids[1], novato!.id], [ids[2], ids[3]]])).error).toBeNull();
  });
});

describe("moving a Jogador (mover_no_sorteio)", () => {
  const mover = (quem: TestUser, partida: string, jogador: string, paraTime: number, sorteadoEm: string) =>
    quem.client.rpc("mover_no_sorteio", { partida, jogador, para_time: paraTime, sorteado_em: sorteadoEm });
  const lido = async (partidaId: string) =>
    ((await service().from("sorteios").select("times").eq("partida_id", partidaId).single()).data!.times as Snapshot);
  const idsPorTime = (times: Snapshot) => times.map((t) => t.jogadores.map((j) => j.id));

  it("moves the Jogador's snapshot to the other Time, rating as drawn", async () => {
    const { dono, partidaId, ids } = await partidaComConfirmados(4, 10);
    const { data: sorteio } = await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2], ids[3]]]);
    await dono.client.from("players").update(atributos(99)).eq("id", ids[0]).throwOnError();

    const { error } = await mover(dono, partidaId, ids[0], 1, sorteio.sorteado_em);
    expect(error).toBeNull();
    const times = await lido(partidaId);
    expect(idsPorTime(times)).toEqual([[ids[1]], [ids[2], ids[3], ids[0]]]);
    expect(times[1].jogadores.find((j) => j.id === ids[0])).toMatchObject({ name: "J0", rating: 60 });
  });

  it("simultaneous moves by different admins all land: none is lost", async () => {
    const { dono, grupoId, partidaId, ids } = await partidaComConfirmados(8, 10);
    const admins = [dono];
    for (const label of ["admin-1", "admin-2"]) {
      const a = await user(label);
      await addMembro(grupoId, a, "admin");
      admins.push(a);
    }
    const { data: sorteio } = await salvar(dono, partidaId, [ids.slice(0, 4), ids.slice(4)]);

    // Each admin moves a different Jogador out of Time 1, from their own
    // client, so the calls reach Postgres as overlapping transactions.
    const movimentos = await Promise.all(admins.map((a, i) => mover(a, partidaId, ids[i], 1, sorteio.sorteado_em)));
    for (const m of movimentos) expect(m.error).toBeNull();

    const [time1, time2] = idsPorTime(await lido(partidaId));
    expect(time1).toEqual([ids[3]]);
    expect([...time2].sort()).toEqual([...ids.slice(4), ids[0], ids[1], ids[2]].sort());
  });

  it("refuses a move made on a draw that was redone since", async () => {
    const { dono, partidaId, ids } = await partidaComConfirmados(4, 10);
    const { data: antigo } = await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2], ids[3]]]);
    const { data: novo } = await salvar(dono, partidaId, [[ids[0], ids[2]], [ids[1], ids[3]]]);
    expect(novo.sorteado_em).not.toBe(antigo.sorteado_em);

    expect((await mover(dono, partidaId, ids[0], 1, antigo.sorteado_em)).error?.hint).toBe("sorteio-mudou");
    expect(idsPorTime(await lido(partidaId))).toEqual([[ids[0], ids[2]], [ids[1], ids[3]]]);
    expect((await mover(dono, partidaId, ids[0], 1, novo.sorteado_em)).error).toBeNull();
  });

  it("never leaves a Time empty, and a move to the same Time changes nothing", async () => {
    const { dono, partidaId, ids } = await partidaComConfirmados(4, 10);
    const { data: sorteio } = await salvar(dono, partidaId, [[ids[0]], [ids[1], ids[2], ids[3]]]);

    expect((await mover(dono, partidaId, ids[0], 1, sorteio.sorteado_em)).error?.hint).toBe("time-vazio");
    expect((await mover(dono, partidaId, ids[1], 1, sorteio.sorteado_em)).error).toBeNull();
    expect(idsPorTime(await lido(partidaId))).toEqual([[ids[0]], [ids[1], ids[2], ids[3]]]);
  });

  it("refuses an unknown Jogador or Time, a membro, a changed list and published Times", async () => {
    const { dono, grupoId, partidaId, ids } = await partidaComConfirmados(5, 10);
    const membro = await user("membro");
    await addMembro(grupoId, membro, "membro");
    const { data: sorteio } = await salvar(dono, partidaId, [[ids[0], ids[1]], [ids[2], ids[3], ids[4]]]);
    const em = sorteio.sorteado_em as string;

    expect((await mover(dono, partidaId, ids[0], 2, em)).error?.hint).toBe("times-invalidos");
    expect((await mover(dono, partidaId, ids[0], -1, em)).error?.hint).toBe("times-invalidos");
    expect((await mover(dono, partidaId, crypto.randomUUID(), 1, em)).error?.hint).toBe("fora-do-sorteio");
    expect((await mover(membro, partidaId, ids[0], 1, em)).error?.hint).toBe("sem-permissao");

    await dono.client.rpc("responder_presenca", { partida: partidaId, jogador: ids[4], vou: false }).throwOnError();
    expect((await mover(dono, partidaId, ids[0], 1, em)).error?.hint).toBe("lista-mudou");
    await dono.client.rpc("responder_presenca", { partida: partidaId, jogador: ids[4], vou: true }).throwOnError();

    expect((await dono.client.rpc("publicar_sorteio", { partida: partidaId })).error).toBeNull();
    expect((await mover(dono, partidaId, ids[0], 1, em)).error?.hint).toBe("publicado");
  });
});
