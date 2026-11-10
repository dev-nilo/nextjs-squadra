import { afterEach, describe, expect, it } from "vitest";
import { addMembro, admin as service, anon, newUser, removeUsers, type TestUser } from "./support";

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

async function futCom(dono: TestUser) {
  const { data, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut dos Convites" });
  if (error) throw error;
  return data as { id: string; slug: string; nome: string };
}

async function convidar(quem: TestUser, grupoId: string) {
  return quem.client.from("convites").insert({ grupo_id: grupoId }).select("id, token, expira_em").single();
}

const ver = (client: TestUser["client"], token: string) =>
  client.rpc("ver_convite", { token_do_convite: token }).single<{ situacao: string; grupo_nome: string | null }>();

describe("creating and revoking invites", () => {
  it("the dono and an admin create links that expire in 7 days", async () => {
    const dono = await user("dono");
    const adminDoFut = await user("admin");
    const grupo = await futCom(dono);
    await addMembro(grupo.id, adminDoFut, "admin");

    for (const quem of [dono, adminDoFut]) {
      const { data, error } = await convidar(quem, grupo.id);
      expect(error).toBeNull();
      expect(data?.token).toMatch(/^[0-9a-f]{32}$/);
      const dias = (new Date(data!.expira_em).getTime() - Date.now()) / 86_400_000;
      expect(dias).toBeGreaterThan(6.9);
      expect(dias).toBeLessThanOrEqual(7);
    }
  });

  it("a membro and someone outside can't create or read invites", async () => {
    const dono = await user("dono");
    const membro = await user("membro");
    const deFora = await user("fora");
    const grupo = await futCom(dono);
    await addMembro(grupo.id, membro, "membro");
    await convidar(dono, grupo.id);

    for (const quem of [membro, deFora]) {
      expect((await convidar(quem, grupo.id)).error).not.toBeNull();
      const { data } = await quem.client.from("convites").select("token").eq("grupo_id", grupo.id);
      expect(data).toEqual([]);
    }
  });

  it("an admin revokes a link; a membro can't", async () => {
    const dono = await user("dono");
    const membro = await user("membro");
    const grupo = await futCom(dono);
    await addMembro(grupo.id, membro, "membro");
    const { data: convite } = await convidar(dono, grupo.id);

    const porMembro = await membro.client.from("convites").update({ revogado_em: new Date().toISOString() }).eq("id", convite!.id).select("id");
    expect(porMembro.data ?? []).toEqual([]);

    const porDono = await dono.client.from("convites").update({ revogado_em: new Date().toISOString() }).eq("id", convite!.id).select("id");
    expect(porDono.data).toEqual([{ id: convite!.id }]);
  });

  it("nobody edits a link's token or expiry", async () => {
    const dono = await user("dono");
    const grupo = await futCom(dono);
    const { data: convite } = await convidar(dono, grupo.id);

    const { error } = await dono.client.from("convites").update({ expira_em: "2099-01-01" }).eq("id", convite!.id);
    expect(error).not.toBeNull();
  });
});

describe("what the link shows before joining", () => {
  it("shows the Grupo's name to anyone holding a valid link, signed in or not", async () => {
    const dono = await user("dono");
    const grupo = await futCom(dono);
    const { data: convite } = await convidar(dono, grupo.id);

    const { data } = await ver(anon(), convite!.token);
    expect(data).toEqual({ situacao: "valido", grupo_nome: "Fut dos Convites" });
  });

  it("says why a link doesn't work, without the Grupo's name", async () => {
    const dono = await user("dono");
    const grupo = await futCom(dono);
    const { data: revogado } = await convidar(dono, grupo.id);
    const { data: expirado } = await convidar(dono, grupo.id);
    await dono.client.from("convites").update({ revogado_em: new Date().toISOString() }).eq("id", revogado!.id);
    await service().from("convites").update({ expira_em: new Date(Date.now() - 1000).toISOString() }).eq("id", expirado!.id);

    expect((await ver(anon(), revogado!.token)).data).toEqual({ situacao: "revogado", grupo_nome: null });
    expect((await ver(anon(), expirado!.token)).data).toEqual({ situacao: "expirado", grupo_nome: null });
    expect((await ver(anon(), "0".repeat(32))).data).toEqual({ situacao: "inexistente", grupo_nome: null });
  });
});

describe("joining with a link", () => {
  it("makes the visitor a membro, and opening it again doesn't duplicate them", async () => {
    const dono = await user("dono");
    const visitante = await user("visitante");
    const grupo = await futCom(dono);
    const { data: convite } = await convidar(dono, grupo.id);

    for (let vez = 0; vez < 2; vez++) {
      const { data, error } = await visitante.client.rpc("aceitar_convite", { token_do_convite: convite!.token });
      expect(error).toBeNull();
      expect(data).toMatchObject({ id: grupo.id, slug: grupo.slug });
    }

    const { data: membros } = await service().from("grupo_membros").select("papel").eq("grupo_id", grupo.id).eq("user_id", visitante.id);
    expect(membros).toEqual([{ papel: "membro" }]);
  });

  it("keeps the papel of someone already in the Grupo", async () => {
    const dono = await user("dono");
    const adminDoFut = await user("admin");
    const grupo = await futCom(dono);
    await addMembro(grupo.id, adminDoFut, "admin");
    const { data: convite } = await convidar(dono, grupo.id);

    for (const quem of [dono, adminDoFut]) {
      expect((await quem.client.rpc("aceitar_convite", { token_do_convite: convite!.token })).error).toBeNull();
    }
    const { data } = await service().from("grupo_membros").select("user_id, papel").eq("grupo_id", grupo.id).order("papel");
    expect(data).toEqual([
      { user_id: dono.id, papel: "dono" },
      { user_id: adminDoFut.id, papel: "admin" },
    ]);
  });

  it("refuses revoked, expired and unknown links, saying which", async () => {
    const dono = await user("dono");
    const visitante = await user("visitante");
    const grupo = await futCom(dono);
    const { data: revogado } = await convidar(dono, grupo.id);
    const { data: expirado } = await convidar(dono, grupo.id);
    await dono.client.from("convites").update({ revogado_em: new Date().toISOString() }).eq("id", revogado!.id);
    await service().from("convites").update({ expira_em: new Date(Date.now() - 1000).toISOString() }).eq("id", expirado!.id);

    for (const [token, motivo] of [
      [revogado!.token, "revogado"],
      [expirado!.token, "expirado"],
      ["f".repeat(32), "inexistente"],
    ]) {
      const { error } = await visitante.client.rpc("aceitar_convite", { token_do_convite: token });
      expect(error?.hint).toBe(motivo);
    }
    const { data } = await service().from("grupo_membros").select("user_id").eq("grupo_id", grupo.id).eq("user_id", visitante.id);
    expect(data).toEqual([]);
  });

  it("requires signing in", async () => {
    const dono = await user("dono");
    const grupo = await futCom(dono);
    const { data: convite } = await convidar(dono, grupo.id);
    const { error } = await anon().rpc("aceitar_convite", { token_do_convite: convite!.token });
    expect(error).not.toBeNull();
  });
});
