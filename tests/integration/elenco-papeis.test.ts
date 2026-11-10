import { afterEach, describe, expect, it } from "vitest";
import { addJogador, addMembro, newUser, removeUsers, type TestUser } from "./support";

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

/** A Grupo with a dono, an admin, a membro and someone outside it, plus one Jogador by the dono. */
async function fut() {
  const dono = await user("dono");
  const admin = await user("admin");
  const membro = await user("membro");
  const deFora = await user("fora");
  const { data: grupo, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut dos Papéis" });
  if (error) throw error;
  await addMembro(grupo.id, admin, "admin");
  await addMembro(grupo.id, membro, "membro");
  const { data: jogador } = await addJogador(dono, "Craque do Dono");
  return { grupo: grupo as { id: string }, dono, admin, membro, deFora, jogadorId: jogador!.id as string };
}

const elenco = (who: TestUser, grupoId: string) =>
  who.client.from("players").select("name").eq("grupo_id", grupoId).order("name");

describe("who reads a Grupo's Elenco", () => {
  it("every Membro reads every Jogador, whoever created it", async () => {
    const { grupo, dono, admin, membro } = await fut();
    await addJogador(admin, "Craque do Admin", { grupo_id: grupo.id });

    for (const quem of [dono, admin, membro]) {
      const { data } = await elenco(quem, grupo.id);
      expect(data).toEqual([{ name: "Craque do Admin" }, { name: "Craque do Dono" }]);
    }
  });

  it("someone outside the Grupo reads nothing", async () => {
    const { grupo, deFora } = await fut();
    const { data } = await elenco(deFora, grupo.id);
    expect(data).toEqual([]);
  });

  it("a Membro who leaves stops reading, even the Jogadores they created", async () => {
    const { grupo, admin } = await fut();
    await addJogador(admin, "Craque do Admin", { grupo_id: grupo.id });

    await admin.client.from("grupo_membros").delete().eq("grupo_id", grupo.id).eq("user_id", admin.id);

    const { data } = await elenco(admin, grupo.id);
    expect(data).toEqual([]);
  });
});

describe("who writes a Grupo's Elenco", () => {
  it("an admin creates, edits and deletes Jogadores, including the dono's", async () => {
    const { grupo, admin, jogadorId } = await fut();

    const criado = await addJogador(admin, "Novo do Admin", { grupo_id: grupo.id });
    expect(criado.error).toBeNull();

    const editado = await admin.client.from("players").update({ name: "Editado pelo Admin" }).eq("id", jogadorId).select("name, user_id");
    expect(editado.data?.[0]?.name).toBe("Editado pelo Admin");

    const apagado = await admin.client.from("players").delete().eq("id", jogadorId).select("id");
    expect(apagado.data).toEqual([{ id: jogadorId }]);
  });

  it("a membro reads but can't create, edit or delete", async () => {
    const { grupo, membro, jogadorId } = await fut();

    const criado = await addJogador(membro, "Do Membro", { grupo_id: grupo.id });
    expect(criado.error).not.toBeNull();

    const editado = await membro.client.from("players").update({ name: "Golpe" }).eq("id", jogadorId).select("id");
    expect(editado.data ?? []).toEqual([]);

    const apagado = await membro.client.from("players").delete().eq("id", jogadorId).select("id");
    expect(apagado.data).toEqual([]);
  });

  it("an admin made membro loses write access to the Jogadores they created", async () => {
    const { grupo, dono, admin } = await fut();
    const { data: dele } = await addJogador(admin, "Do Ex-Admin", { grupo_id: grupo.id });
    await dono.client.from("grupo_membros").update({ papel: "membro" }).eq("grupo_id", grupo.id).eq("user_id", admin.id);

    const editado = await admin.client.from("players").update({ name: "Ainda Mando" }).eq("id", dele!.id);
    expect(editado.error).not.toBeNull();

    const apagado = await admin.client.from("players").delete().eq("id", dele!.id).select("id");
    expect(apagado.data).toEqual([]);
  });

  it("nobody creates a Jogador in someone else's name", async () => {
    const { grupo, dono, admin } = await fut();
    const { error } = await admin.client
      .from("players")
      .insert({ user_id: dono.id, grupo_id: grupo.id, name: "Forjado", position: "ALA", nationality: "BR" });
    expect(error).not.toBeNull();
  });
});
