import { afterEach, describe, expect, it } from "vitest";
import { addJogador, admin as service, newUser, removeUsers, type TestUser } from "./support";

// The Overall is the database's: the rounded mean of the 8 attributes,
// computed by the trigger players_ovr on every insert and update.

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

async function grupoCom(dono: TestUser) {
  const { data, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut do Overall" });
  if (error) throw error;
  return data.id as string;
}

const ovrDe = async (id: string) => (await service().from("players").select("ovr").eq("id", id).single()).data!.ovr as number;

describe("the Overall", () => {
  it("is the rounded mean of the attributes, whatever the client sends", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    // Seven at 60 and defesa at 65: 485 / 8 = 60.6 → 61.
    const { data, error } = await addJogador(dono, grupoId, "Inventado", { ovr: 99, defesa: 65 });
    expect(error).toBeNull();
    expect(await ovrDe(data!.id)).toBe(61);
  });

  it("follows the attributes on update, and a PATCH of the rating alone changes nothing", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const { data } = await addJogador(dono, grupoId, "Paredão");
    const id = data!.id as string;

    await dono.client.from("players").update({ chute: 92, passe: 92 }).eq("id", id).throwOnError();
    expect(await ovrDe(id)).toBe(68); // (6 × 60 + 2 × 92) / 8 = 68

    await dono.client.from("players").update({ ovr: 99 }).eq("id", id).throwOnError();
    expect(await ovrDe(id)).toBe(68);
  });

  it("feeds the Sorteio's snapshot, so a draw can't take a made-up rating", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const ids: string[] = [];
    for (const nome of ["A", "B", "C", "D"]) ids.push((await addJogador(dono, grupoId, nome)).data!.id);
    await dono.client.from("players").update({ ovr: 99 }).eq("id", ids[0]).throwOnError();

    const { data: partida } = await dono.client
      .from("partidas")
      .insert({ grupo_id: grupoId, inicio: new Date(Date.now() + 86_400_000).toISOString(), local: "Quadra", vagas: 10 })
      .select("id")
      .single()
      .throwOnError();
    for (const id of ids) await dono.client.rpc("responder_presenca", { partida: partida!.id, jogador: id, vou: true }).throwOnError();
    const { data: sorteio } = await dono.client
      .rpc("salvar_sorteio", { partida: partida!.id, times: [[ids[0], ids[1]], [ids[2], ids[3]]] })
      .throwOnError();

    const a = (sorteio.times as { jogadores: { id: string; rating: number }[] }[])[0].jogadores.find((j) => j.id === ids[0]);
    expect(a?.rating).toBe(60);
  });

  it("refuses attributes outside 0 to 99", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    expect((await addJogador(dono, grupoId, "Demais", { chute: 100 })).error?.code).toBe("23514");
    expect((await addJogador(dono, grupoId, "De menos", { passe: -1 })).error?.code).toBe("23514");
    const { data } = await addJogador(dono, grupoId, "No limite", { chute: 99, passe: 0 });
    expect((await dono.client.from("players").update({ fisico: 120 }).eq("id", data!.id)).error?.code).toBe("23514");
  });
});
