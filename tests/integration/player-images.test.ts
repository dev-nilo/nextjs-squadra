import { afterEach, describe, expect, it } from "vitest";
import { addMembro, admin, newUser, removeUsers, type TestUser } from "./support";

const BUCKET = "player-images";
const PNG = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });

let users: TestUser[] = [];
let paths: string[] = [];
const user = async (label: string) => {
  const u = await newUser(label);
  users.push(u);
  return u;
};

afterEach(async () => {
  if (paths.length) await admin().storage.from(BUCKET).remove(paths);
  await removeUsers(...users);
  users = [];
  paths = [];
});

async function grupoDe(dono: TestUser) {
  const { data, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut das Fotos" });
  if (error) throw error;
  return data as { id: string };
}

async function upload(who: TestUser, path: string) {
  paths.push(path);
  return who.client.storage.from(BUCKET).upload(path, PNG, { upsert: true, contentType: "image/png" });
}

describe("player-images under {grupo_id}/", () => {
  it("lets the dono and an admin upload, replace and remove", async () => {
    const dono = await user("dono");
    const adminDoFut = await user("admin");
    const grupo = await grupoDe(dono);
    await addMembro(grupo.id, adminDoFut, "admin");

    expect((await upload(dono, `${grupo.id}/do-dono.png`)).error).toBeNull();
    expect((await upload(adminDoFut, `${grupo.id}/do-admin.png`)).error).toBeNull();
    expect((await upload(adminDoFut, `${grupo.id}/do-dono.png`)).error).toBeNull();

    const { data: removidos } = await adminDoFut.client.storage.from(BUCKET).remove([`${grupo.id}/do-dono.png`]);
    expect(removidos).toHaveLength(1);
  });

  it("refuses a membro and someone outside the Grupo", async () => {
    const dono = await user("dono");
    const membro = await user("membro");
    const deFora = await user("fora");
    const grupo = await grupoDe(dono);
    await addMembro(grupo.id, membro, "membro");

    expect((await upload(membro, `${grupo.id}/do-membro.png`)).error).not.toBeNull();
    expect((await upload(deFora, `${grupo.id}/de-fora.png`)).error).not.toBeNull();
  });

  it("refuses a folder that isn't a Grupo instead of erroring", async () => {
    const dono = await user("dono");
    await grupoDe(dono);

    const { error } = await upload(dono, "nao-e-um-grupo/foto.png");
    expect(error?.message).toMatch(/row-level security|policy/i);
  });

  it("no longer accepts writes to the old {user_id}/ folder", async () => {
    const dono = await user("dono");
    expect((await upload(dono, `${dono.id}/antiga.png`)).error).not.toBeNull();
  });
});
