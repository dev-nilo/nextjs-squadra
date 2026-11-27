import { afterEach, describe, expect, it } from "vitest";
import { addJogador, admin, newUser, removeUsers, type TestUser } from "./support";

/*
 * The players table enforces the card's rules itself
 * (20261124040000_regras_do_jogador.sql), so a direct API write by a dono or
 * admin can't skip what jogadorSchema checks in the app.
 */

const BUCKET = "player-images";
const JPG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });

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

async function futCom(label: string) {
  const dono = await user(label);
  const { data: grupo, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: `Fut ${label}` });
  if (error) throw error;
  const { data: jogador } = await addJogador(dono, grupo.id, "Regrado");
  return { dono, grupo: grupo.id as string, jogador: jogador!.id as string };
}

/** Uploads a file and returns the public URL the app would save, with its ?v=. */
async function foto(quem: TestUser, caminho: string) {
  paths.push(caminho);
  await quem.client.storage
    .from(BUCKET)
    .upload(caminho, JPG, { upsert: true, contentType: "image/jpeg" })
    .then(({ error }) => {
      if (error) throw error;
    });
  return `${quem.client.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl}?v=${Date.now()}`;
}

const atualizar = (quem: TestUser, id: string, campos: Record<string, unknown>) =>
  quem.client.from("players").update(campos).eq("id", id).select("id");

describe("the Jogador's rules live in the table (#84)", () => {
  it("refuses a blank or long name, an unknown position and a bad nationality", async () => {
    const { dono, jogador } = await futCom("regras");
    for (const campos of [
      { name: "   " },
      { name: "x".repeat(41) },
      { position: "ZAG" },
      { nationality: "Brasil" },
      { nationality: "br" },
    ]) {
      const { error } = await atualizar(dono, jogador, campos);
      expect(error?.code, JSON.stringify(campos)).toBe("23514");
    }
    expect(
      (await atualizar(dono, jogador, { name: "x".repeat(40), position: "GOL", nationality: "AR" })).error,
    ).toBeNull();
  });
});

describe("a card's photo is a file in its Grupo's folder (#84, #89)", () => {
  it("takes a file uploaded to the Grupo's folder, with its ?v=", async () => {
    const { dono, grupo, jogador } = await futCom("foto-ok");
    const url = await foto(dono, `${grupo}/${jogador}.jpg`);
    expect((await atualizar(dono, jogador, { image_url: url })).error).toBeNull();
    // Saving the card again with the same URL isn't checked again.
    expect((await atualizar(dono, jogador, { image_url: url, name: "Outro nome" })).error).toBeNull();
  });

  it("refuses another site, another Grupo's folder, a subfolder and a file that isn't there", async () => {
    const { dono, grupo, jogador } = await futCom("foto-dono");
    const outro = await futCom("foto-outro");
    const deOutroFut = await foto(outro.dono, `${outro.grupo}/${outro.jogador}.jpg`);
    const base = dono.client.storage
      .from(BUCKET)
      .getPublicUrl(`${grupo}/x.jpg`)
      .data.publicUrl.replace(/\/x\.jpg$/, "");

    for (const [caso, url] of [
      ["another site", "https://example.com/gato.jpg"],
      ["another site, same path", `https://example.com/storage/v1/object/public/${BUCKET}/${grupo}/x.jpg`],
      ["another Grupo's folder", deOutroFut],
      ["a subfolder", `${base}/sub/${jogador}.jpg`],
      ["a file that isn't there", `${base}/${jogador}.jpg?v=1`],
      ["an inline image", "data:image/png;base64,iVBORw0KGgo="],
    ]) {
      const { error } = await atualizar(dono, jogador, { image_url: url });
      expect(error?.hint, caso).toBe("foto-invalida");
    }
    // A new card is checked too.
    const { error } = await addJogador(dono, grupo, "Com foto de fora", { image_url: "https://example.com/gato.jpg" });
    expect(error?.hint).toBe("foto-invalida");
  });

  it("two tabs: the one saving a photo the other already replaced is refused (#89)", async () => {
    const { dono, grupo, jogador } = await futCom("abas");
    const antiga = await foto(dono, `${grupo}/${jogador}.png`);
    await atualizar(dono, jogador, { image_url: antiga }).then(({ error }) => expect(error).toBeNull());

    // Tab A: a new photo at another path, and the old file is deleted (salvarJogador's cleanup).
    const nova = await foto(dono, `${grupo}/${jogador}.jpg`);
    expect((await atualizar(dono, jogador, { image_url: nova })).error).toBeNull();
    await dono.client.storage.from(BUCKET).remove([`${grupo}/${jogador}.png`]);

    // Tab B still has the old URL.
    expect((await atualizar(dono, jogador, { image_url: antiga })).error?.hint).toBe("foto-invalida");
    const { data } = await admin().from("players").select("image_url").eq("id", jogador).single();
    expect(data?.image_url).toBe(nova);
  });
});
