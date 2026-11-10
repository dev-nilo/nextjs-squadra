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

type Presenca = { jogador_id: string; situacao: "confirmado" | "espera" | "nao_vou"; pediu_vaga_em: string | null };

async function grupoCom(dono: TestUser) {
  const { data, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut das Partidas" });
  if (error) throw error;
  return data.id as string;
}

/** A Membro with their own Jogador, linked to their account. */
async function membroComJogador(grupoId: string, label: string, papel: "admin" | "membro" = "membro") {
  const u = await user(label);
  await addMembro(grupoId, u, papel);
  const { data, error } = await u.client.rpc("criar_meu_jogador", { grupo: grupoId, nome: label, posicao: "ALA" });
  if (error) throw error;
  return { u, jogadorId: data.id as string };
}

async function partida(quem: TestUser, grupoId: string, vagas: number) {
  const { data, error } = await quem.client
    .from("partidas")
    .insert({ grupo_id: grupoId, inicio: new Date(Date.now() + 86_400_000).toISOString(), local: "Quadra do Zé", vagas })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

const responder = (quem: TestUser, partidaId: string, jogadorId: string, vou: boolean) =>
  quem.client.rpc("responder_presenca", { partida: partidaId, jogador: jogadorId, vou });

async function lista(partidaId: string): Promise<Presenca[]> {
  const { data } = await service()
    .from("presencas")
    .select("jogador_id, situacao, pediu_vaga_em")
    .eq("partida_id", partidaId)
    .order("pediu_vaga_em", { ascending: true, nullsFirst: false });
  return (data ?? []) as Presenca[];
}
const situacaoDe = async (partidaId: string, jogadorId: string) =>
  (await lista(partidaId)).find((p) => p.jogador_id === jogadorId)?.situacao ?? null;

describe("who sees and runs Partidas", () => {
  it("the dono and admins create and edit; membros and outsiders can't", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const { u: adminDoFut } = await membroComJogador(grupoId, "admin", "admin");
    const { u: membro } = await membroComJogador(grupoId, "membro");
    const deFora = await user("fora");

    const id = await partida(adminDoFut, grupoId, 10);
    await expect(partida(membro, grupoId, 10)).rejects.toBeTruthy();
    await expect(partida(deFora, grupoId, 10)).rejects.toBeTruthy();

    const porMembro = await membro.client.from("partidas").update({ local: "Outro lugar" }).eq("id", id).select("id");
    expect(porMembro.data ?? []).toEqual([]);
    const porDono = await dono.client.from("partidas").update({ local: "Society da Vila" }).eq("id", id).select("local");
    expect(porDono.data).toEqual([{ local: "Society da Vila" }]);
  });

  it("every Membro reads the Partida and its presence list; an outsider reads nothing", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const { u: membro, jogadorId } = await membroComJogador(grupoId, "membro");
    const deFora = await user("fora");
    const id = await partida(dono, grupoId, 10);
    await responder(membro, id, jogadorId, true);

    expect((await membro.client.from("partidas").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await membro.client.from("presencas").select("situacao").eq("partida_id", id)).data).toEqual([{ situacao: "confirmado" }]);
    expect((await deFora.client.from("partidas").select("id").eq("id", id)).data).toEqual([]);
    expect((await deFora.client.from("presencas").select("situacao").eq("partida_id", id)).data).toEqual([]);
  });

  it("nobody writes presence directly, not even the dono", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const { data: jogador } = await addJogador(dono, grupoId, "Craque");
    const id = await partida(dono, grupoId, 10);
    const { error } = await dono.client
      .from("presencas")
      .insert({ partida_id: id, jogador_id: jogador!.id, situacao: "confirmado", pediu_vaga_em: new Date().toISOString() });
    expect(error).not.toBeNull();
  });
});

describe("vou / não vou", () => {
  it("a membro answers for their own Jogador, not for someone else's", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const ze = await membroComJogador(grupoId, "ze");
    const bia = await membroComJogador(grupoId, "bia");
    const id = await partida(dono, grupoId, 10);

    expect((await responder(ze.u, id, ze.jogadorId, true)).error).toBeNull();
    expect((await responder(ze.u, id, bia.jogadorId, true)).error?.hint).toBe("sem-permissao");
    expect(await situacaoDe(id, bia.jogadorId)).toBeNull();
  });

  it("an admin answers for any Jogador, including one with no account", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const { u: adminDoFut } = await membroComJogador(grupoId, "admin", "admin");
    const { data: semConta } = await addJogador(dono, grupoId, "Sem Conta");
    const id = await partida(dono, grupoId, 10);

    expect((await responder(adminDoFut, id, semConta!.id, true)).error).toBeNull();
    expect(await situacaoDe(id, semConta!.id)).toBe("confirmado");
  });

  it("refuses a Jogador from another Grupo, a cancelled Partida and an outsider", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const outroDono = await user("outro-dono");
    const outroGrupo = await grupoCom(outroDono);
    const { data: deOutroFut } = await addJogador(outroDono, outroGrupo, "De Outro Fut");
    const { data: daqui } = await addJogador(dono, grupoId, "Daqui");
    const id = await partida(dono, grupoId, 10);

    expect((await responder(dono, id, deOutroFut!.id, true)).error?.hint).toBe("jogador-de-fora");
    expect((await responder(outroDono, id, deOutroFut!.id, true)).error?.hint).toBe("nao-encontrada");

    await dono.client.from("partidas").update({ cancelada_em: new Date().toISOString() }).eq("id", id);
    expect((await responder(dono, id, daqui!.id, true)).error?.hint).toBe("cancelada");
  });

  it("saying vou twice keeps the place in line", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const ze = await membroComJogador(grupoId, "ze");
    const id = await partida(dono, grupoId, 10);

    await responder(ze.u, id, ze.jogadorId, true);
    const antes = (await lista(id))[0].pediu_vaga_em;
    await responder(ze.u, id, ze.jogadorId, true);
    expect((await lista(id))[0].pediu_vaga_em).toBe(antes);
  });

  it("goes to the lista de espera once the vagas are taken", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const [a, b, c] = await Promise.all(["a", "b", "c"].map((n) => membroComJogador(grupoId, n)));
    const id = await partida(dono, grupoId, 2);

    for (const m of [a, b, c]) await responder(m.u, id, m.jogadorId, true);
    expect((await lista(id)).map((p) => [p.jogador_id, p.situacao])).toEqual([
      [a.jogadorId, "confirmado"],
      [b.jogadorId, "confirmado"],
      [c.jogadorId, "espera"],
    ]);
  });
});

describe("dropping out", () => {
  it("hands the vaga to the first in the lista de espera, in the same call", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const [a, b, c, d] = await Promise.all(["a", "b", "c", "d"].map((n) => membroComJogador(grupoId, n)));
    const id = await partida(dono, grupoId, 2);
    for (const m of [a, b, c, d]) await responder(m.u, id, m.jogadorId, true);

    const { data, error } = await responder(a.u, id, a.jogadorId, false);
    expect(error).toBeNull();
    expect(data).toMatchObject({ situacao: "nao_vou" });

    const depois = await lista(id);
    const de = (j: string) => depois.find((p) => p.jogador_id === j)?.situacao;
    expect([de(a.jogadorId), de(b.jogadorId), de(c.jogadorId), de(d.jogadorId)]).toEqual(["nao_vou", "confirmado", "confirmado", "espera"]);
  });

  it("leaving the lista de espera promotes nobody", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const [a, b, c] = await Promise.all(["a", "b", "c"].map((n) => membroComJogador(grupoId, n)));
    const id = await partida(dono, grupoId, 2);
    for (const m of [a, b, c]) await responder(m.u, id, m.jogadorId, true);

    await responder(c.u, id, c.jogadorId, false);
    expect((await lista(id)).filter((p) => p.situacao === "confirmado")).toHaveLength(2);
  });

  it("coming back after não vou goes to the end of the line", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const [a, b, c, d] = await Promise.all(["a", "b", "c", "d"].map((n) => membroComJogador(grupoId, n)));
    const id = await partida(dono, grupoId, 2);
    for (const m of [a, b, c, d]) await responder(m.u, id, m.jogadorId, true);

    // b drops out (c takes the vaga), then says vou again: behind d.
    await responder(b.u, id, b.jogadorId, false);
    await responder(b.u, id, b.jogadorId, true);
    expect((await lista(id)).filter((p) => p.situacao === "espera").map((p) => p.jogador_id)).toEqual([d.jogadorId, b.jogadorId]);
  });
});

describe("changing the vagas", () => {
  it("more vagas promote the lista de espera in order", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const [a, b, c, d] = await Promise.all(["a", "b", "c", "d"].map((n) => membroComJogador(grupoId, n)));
    const id = await partida(dono, grupoId, 2);
    for (const m of [a, b, c, d]) await responder(m.u, id, m.jogadorId, true);

    await dono.client.from("partidas").update({ vagas: 3 }).eq("id", id).throwOnError();
    const depois = await lista(id);
    expect(depois.find((p) => p.jogador_id === c.jogadorId)?.situacao).toBe("confirmado");
    expect(depois.find((p) => p.jogador_id === d.jogadorId)?.situacao).toBe("espera");
  });

  it("refuses fewer vagas than the Jogadores already confirmed", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const [a, b, c] = await Promise.all(["a", "b", "c"].map((n) => membroComJogador(grupoId, n)));
    const id = await partida(dono, grupoId, 4);
    for (const m of [a, b, c]) await responder(m.u, id, m.jogadorId, true);

    const { error } = await dono.client.from("partidas").update({ vagas: 2 }).eq("id", id);
    expect(error?.hint).toBe("vagas-abaixo-dos-confirmados");
    expect((await dono.client.from("partidas").update({ vagas: 3 }).eq("id", id)).error).toBeNull();
  });
});

describe("the last vaga, under concurrency", () => {
  it("N simultaneous confirmations for one free vaga: exactly one gets it, the rest wait in order", async () => {
    const N = 8;
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const primeiro = await membroComJogador(grupoId, "primeiro");
    const corrida = await Promise.all(Array.from({ length: N }, (_, i) => membroComJogador(grupoId, `corrida-${i}`)));
    const id = await partida(dono, grupoId, 2);
    await responder(primeiro.u, id, primeiro.jogadorId, true);

    // Each answer comes from its own client, so they reach Postgres as
    // separate, overlapping transactions.
    const respostas = await Promise.all(corrida.map((m) => responder(m.u, id, m.jogadorId, true)));
    for (const r of respostas) expect(r.error).toBeNull();

    const depois = (await lista(id)).filter((p) => p.jogador_id !== primeiro.jogadorId);
    const confirmados = depois.filter((p) => p.situacao === "confirmado");
    const espera = depois.filter((p) => p.situacao === "espera");
    expect(confirmados).toHaveLength(1);
    expect(espera).toHaveLength(N - 1);

    // What each call returned matches what was stored.
    const devolvido = new Map(respostas.map((r) => [r.data.jogador_id, r.data.situacao]));
    for (const p of depois) expect(devolvido.get(p.jogador_id)).toBe(p.situacao);

    // The order is the order the lock was taken: the one who got the vaga
    // asked first, and the line has no ties.
    const horarios = depois.map((p) => p.pediu_vaga_em!);
    expect(new Set(horarios).size).toBe(N);
    expect(confirmados[0].pediu_vaga_em! < espera[0].pediu_vaga_em!).toBe(true);

    // And the line moves in that order: the first one out promotes espera[0].
    await responder(primeiro.u, id, primeiro.jogadorId, false);
    expect(await situacaoDe(id, espera[0].jogador_id)).toBe("confirmado");
    expect(await situacaoDe(id, espera[1].jogador_id)).toBe("espera");
  });
});
