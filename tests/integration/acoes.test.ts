import * as Sentry from "@sentry/nextjs";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aceitarConvite, criarConvite, revogarConvite } from "@/lib/acoes/convite";
import { FUT_NAO_ENCONTRADO, SEM_PERMISSAO, SESSAO_EXPIRADA, type Resultado } from "@/lib/acoes/executar";
import { criarGrupo } from "@/lib/acoes/grupo";
import { CARTA_EXCLUIDA, CARTA_MUDOU, excluirJogador, importarJogadores, salvarJogador } from "@/lib/acoes/jogador";
import { cancelarPartida, criarPartida, editarPartida, responderPresenca } from "@/lib/acoes/partida";
import { excluirFut, mudarPapel, passarPosse, removerDoFut, renomearFut, sairDoFut } from "@/lib/acoes/pessoas";
import { apagarFotoEnviada, uploadPlayerImage } from "@/lib/player-image";
import { moverNoSorteio, publicarSorteio, sortearDaPartida } from "@/lib/acoes/sorteio";
import { criarMeuJogador, desvincularJogador, vincularJogador } from "@/lib/acoes/vinculo";
import { addMembro, admin as service, anon, conexaoDireta, esperarTravados, newUser, pidDe, removeUsers, type TestUser } from "./support";

// The Server Actions' bodies, called the way the adapters in app/actions call
// them, with a signed-in client against the local Supabase: the error table
// runs against the real RLS and database functions.

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

let users: TestUser[] = [];
const user = async (label: string) => {
  const u = await newUser(label);
  users.push(u);
  return u;
};

beforeEach(() => vi.mocked(Sentry.captureException).mockClear());
afterEach(async () => {
  await removeUsers(...users);
  users = [];
});

function valor<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(`expected ok, got: ${resultado.message}`);
  return resultado.valor;
}
const mensagem = (resultado: Resultado<unknown>) => (resultado.ok ? "ok" : resultado.message);

const attrs = { velocidade: 70, resistencia: 70, chute: 70, posicionamento: 70, defesa: 70, drible: 70, passe: 70, fisico: 70 };
const carta = (name: string, extra: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  name,
  position: "ALA",
  nationality: "BR",
  image: null,
  attributes: attrs,
  ...extra,
});
/** The card's version now, as the Elenco page would read it before an edit. */
const versaoDe = async (id: string) =>
  ((await service().from("players").select("versao").eq("id", id).single().throwOnError()).data as { versao: number }).versao;

const amanha = () => new Date(Date.now() + 86_400_000).toISOString();

async function grupoDe(dono: TestUser, nome = "Fut das Ações") {
  return valor(await criarGrupo(dono.client, nome));
}

describe("resolving the Grupo", () => {
  it("refuses without a Sessão, and for a Grupo the user isn't in", async () => {
    const dono = await user("dono");
    const { slug } = await grupoDe(dono);
    const deFora = await user("de-fora");

    expect(mensagem(await salvarJogador(anon(), slug, carta("Sem sessão")))).toBe(SESSAO_EXPIRADA);
    expect(mensagem(await salvarJogador(deFora.client, slug, carta("Intruso")))).toBe(FUT_NAO_ENCONTRADO);
    expect(mensagem(await criarPartida(deFora.client, slug, { inicio: amanha(), local: "Quadra", vagas: 10 }))).toBe(FUT_NAO_ENCONTRADO);
    expect(mensagem(await salvarJogador(dono.client, "fut-que-nao-existe", carta("Perdido")))).toBe(FUT_NAO_ENCONTRADO);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("only writes in the slug's Grupo, whatever ids the browser sends", async () => {
    const dono = await user("dono");
    const a = await grupoDe(dono, "Fut A");
    const outro = await user("outro");
    const b = await grupoDe(outro, "Fut B");
    await addMembro(b.id, dono, "admin");

    const doB = carta("Do B");
    valor(await salvarJogador(outro.client, b.slug, doB));

    // The same id saved through Grupo A: refused, and B's Jogador is untouched.
    expect(mensagem(await salvarJogador(dono.client, a.slug, { ...doB, name: "Sequestrado" }))).toBe(
      "Esse jogador não é desse fut. Recarregue a página.",
    );
    expect(mensagem(await excluirJogador(dono.client, a.slug, doB.id))).toBe(SEM_PERMISSAO);
    const { data } = await service().from("players").select("name, grupo_id").eq("id", doB.id).single();
    expect(data).toEqual({ name: "Do B", grupo_id: b.id });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("the Elenco", () => {
  it("creates, edits, imports and deletes Jogadores; a membro is told only organizers can", async () => {
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const membro = await user("membro");
    await addMembro(grupo.id, membro, "membro");

    const nova = carta("Paredão");
    expect(valor(await salvarJogador(dono.client, grupo.slug, nova))).toEqual({ criado: true });
    const editada = { ...nova, name: "Paredão II", versao: await versaoDe(nova.id) };
    expect(valor(await salvarJogador(dono.client, grupo.slug, editada))).toEqual({ criado: false });
    // A membro with the card's current version is refused by RLS, not told the card changed.
    const doMembro = { ...editada, name: "Golpe", versao: await versaoDe(nova.id) };
    expect(mensagem(await salvarJogador(membro.client, grupo.slug, doMembro))).toBe(SEM_PERMISSAO);
    expect(await versaoDe(nova.id)).toBe(doMembro.versao);
    expect(valor(await importarJogadores(dono.client, grupo.slug, [carta("A"), carta("B")]))).toEqual({ total: 2 });

    expect(mensagem(await salvarJogador(membro.client, grupo.slug, carta("Do membro")))).toBe(SEM_PERMISSAO);
    expect(mensagem(await excluirJogador(membro.client, grupo.slug, nova.id))).toBe(SEM_PERMISSAO);
    expect(mensagem(await salvarJogador(dono.client, grupo.slug, carta("", { attributes: attrs })))).toBe("Dê um nome pro jogador.");

    valor(await excluirJogador(dono.client, grupo.slug, nova.id));
    const { data } = await service().from("players").select("name").eq("grupo_id", grupo.id).order("name");
    expect(data?.map((p) => p.name)).toEqual(["A", "B"]);
  });

  it("deletes a Jogador's photo file with them and when it leaves the card, never someone else's", async () => {
    // salvarJogador only takes photos on this project's Supabase. CI sets it; a local run may not.
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL;
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const fotos = dono.client.storage.from("player-images");
    const JPG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });
    const enviados: string[] = [];
    /** Uploads like the Elenco screen does, and gives the URL the card saves. */
    const enviar = async (caminho: string) => {
      enviados.push(caminho);
      const { error } = await fotos.upload(caminho, JPG, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      return `${fotos.getPublicUrl(caminho).data.publicUrl}?v=${enviados.length}`;
    };
    const existe = async (caminho: string) => !(await service().storage.from("player-images").download(caminho)).error;

    try {
      // Deleted with the Jogador.
      const comFoto = carta("Com foto");
      const foto = `${grupo.id}/${comFoto.id}.jpg`;
      valor(await salvarJogador(dono.client, grupo.slug, { ...comFoto, image: await enviar(foto) }));
      valor(await excluirJogador(dono.client, grupo.slug, comFoto.id));
      expect(await existe(foto)).toBe(false);

      // A new photo over the same file keeps it (only the ?v= changed); removing the photo deletes it.
      const outra = carta("Outra");
      const daOutra = `${grupo.id}/${outra.id}.jpg`;
      valor(await salvarJogador(dono.client, grupo.slug, { ...outra, image: await enviar(daOutra) }));
      valor(await salvarJogador(dono.client, grupo.slug, { ...outra, image: await enviar(daOutra), versao: await versaoDe(outra.id) }));
      expect(await existe(daOutra)).toBe(true);
      valor(await salvarJogador(dono.client, grupo.slug, { ...outra, image: null, versao: await versaoDe(outra.id) }));
      expect(await existe(daOutra)).toBe(false);

      // A card pointing at another Jogador's photo (only a tampered request makes one) never takes it along.
      const dona = carta("Dona da foto");
      const daDona = `${grupo.id}/${dona.id}.jpg`;
      const urlDaDona = await enviar(daDona);
      valor(await salvarJogador(dono.client, grupo.slug, { ...dona, image: urlDaDona }));
      const intrusa = carta("Intrusa", { image: urlDaDona });
      valor(await salvarJogador(dono.client, grupo.slug, intrusa));
      valor(await excluirJogador(dono.client, grupo.slug, intrusa.id));
      expect(await existe(daDona)).toBe(true);
      expect(Sentry.captureException).not.toHaveBeenCalled();
    } finally {
      await service().storage.from("player-images").remove(enviados);
    }
  });

  it("refuses a save from a card that changed since it was opened, before touching its photo (#89)", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL;
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const fotos = dono.client.storage.from("player-images");
    const enviados: string[] = [];
    const enviar = async (caminho: string, tipo: string) => {
      enviados.push(caminho);
      const { error } = await fotos.upload(caminho, new Blob([new Uint8Array([1, 2, 3])], { type: tipo }), { upsert: true, contentType: tipo });
      if (error) throw error;
      return fotos.getPublicUrl(caminho).data.publicUrl;
    };
    const existe = async (caminho: string) => !(await service().storage.from("player-images").download(caminho)).error;

    try {
      const cartaInicial = carta("Duas Abas");
      const antiga = `${grupo.id}/${cartaInicial.id}.jpg`;
      const urlAntiga = await enviar(antiga, "image/jpeg");
      valor(await salvarJogador(dono.client, grupo.slug, { ...cartaInicial, image: urlAntiga }));
      // Both tabs open the card at the same version.
      const aberta = { ...cartaInicial, image: urlAntiga, versao: await versaoDe(cartaInicial.id) };

      // Tab A stores a photo at another path (a file the browser couldn't re-encode) and saves.
      const nova = `${grupo.id}/${cartaInicial.id}.png`;
      const urlNova = await enviar(nova, "image/png");
      valor(await salvarJogador(dono.client, grupo.slug, { ...aberta, image: urlNova }));
      expect(await existe(antiga)).toBe(false);

      // Tab B still has the old card: its save is refused before it writes anything. (The
      // save landing between A's update and A's cleanup is the "in between" test below.)
      expect(mensagem(await salvarJogador(dono.client, grupo.slug, { ...aberta, name: "Aba B" }))).toBe(CARTA_MUDOU);
      const { data } = await service().from("players").select("name, image_url").eq("id", cartaInicial.id).single();
      expect(data).toEqual({ name: "Duas Abas", image_url: urlNova });
      expect(await existe(nova)).toBe(true);

      // A save that sends no version (a page from before this change) is refused too.
      expect(mensagem(await salvarJogador(dono.client, grupo.slug, { ...aberta, image: urlNova, versao: undefined }))).toBe(CARTA_MUDOU);
    } finally {
      await service().storage.from("player-images").remove(enviados);
    }
  });

  it("a refused save's photo never replaces the one the card shows (#116)", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL;
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const JPEG = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1]).toString("base64")}`;
    const OUTRA = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 2]).toString("base64")}`;
    const baixar = async (caminho: string) => {
      const { data } = await service().storage.from("player-images").download(caminho);
      return data ? Buffer.from(await data.arrayBuffer()).toString("base64") : null;
    };
    const enviados: string[] = [];
    // As the Elenco screen does it: upload, then save with the URL.
    const enviar = async (id: string, imagem: string) => {
      const foto = await uploadPlayerImage(dono.client, grupo.id, id, imagem);
      enviados.push(foto.caminho);
      return foto;
    };

    try {
      const cartaInicial = carta("Foto Disputada");
      const primeira = await enviar(cartaInicial.id, JPEG);
      valor(await salvarJogador(dono.client, grupo.slug, { ...cartaInicial, image: primeira.url }));
      const aberta = { ...cartaInicial, image: primeira.url, versao: await versaoDe(cartaInicial.id) };

      // Tab A renames the card; tab B, still at the old version, picks a new photo.
      valor(await salvarJogador(dono.client, grupo.slug, { ...aberta, name: "Aba A" }));
      const daAbaB = await enviar(cartaInicial.id, OUTRA);
      expect(mensagem(await salvarJogador(dono.client, grupo.slug, { ...aberta, image: daAbaB.url }))).toBe(CARTA_MUDOU);
      await apagarFotoEnviada(dono.client, daAbaB.caminho);

      // Before #116 tab B's upload had replaced this very file.
      expect(await baixar(primeira.caminho)).toBe(JPEG.split(",")[1]);
      expect(await baixar(daAbaB.caminho)).toBeNull();

      // A save that goes through with a new photo deletes the one it replaced.
      const nova = await enviar(cartaInicial.id, OUTRA);
      valor(await salvarJogador(dono.client, grupo.slug, { ...aberta, image: nova.url, versao: await versaoDe(cartaInicial.id) }));
      expect(await baixar(primeira.caminho)).toBeNull();
      expect(await baixar(nova.caminho)).toBe(OUTRA.split(",")[1]);
    } finally {
      await service().storage.from("player-images").remove(enviados);
    }
  });

  it("a save that lands between the read and the update is caught by the update itself", async () => {
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const cartaInicial = carta("No Meio");
    valor(await salvarJogador(dono.client, grupo.slug, cartaInicial));
    const aberta = { ...cartaInicial, name: "Esta Aba", versao: await versaoDe(cartaInicial.id) };

    // Another save holds the row: this one reads the same version, passes the
    // first check, and its update waits.
    const outra = await conexaoDireta();
    try {
      await outra.query("begin");
      await outra.query("update public.players set name = 'Outra Aba' where id = $1", [cartaInicial.id]);
      const salvando = salvarJogador(dono.client, grupo.slug, aberta);
      await esperarTravados(outra, [await pidDe(outra)]);
      await outra.query("commit");

      expect(mensagem(await salvando)).toBe(CARTA_MUDOU);
      const { data } = await service().from("players").select("name").eq("id", cartaInicial.id).single();
      expect(data?.name).toBe("Outra Aba");
    } finally {
      await outra.end();
    }
  });

  it("a card deleted while it was open isn't brought back by saving it", async () => {
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const cartaInicial = carta("Excluída");
    valor(await salvarJogador(dono.client, grupo.slug, cartaInicial));
    const aberta = { ...cartaInicial, versao: await versaoDe(cartaInicial.id) };
    valor(await excluirJogador(dono.client, grupo.slug, cartaInicial.id));

    expect(mensagem(await salvarJogador(dono.client, grupo.slug, aberta))).toBe(CARTA_EXCLUIDA);
    const { data } = await service().from("players").select("id").eq("id", cartaInicial.id);
    expect(data).toEqual([]);
  });

  it("a client can't choose a card's version", async () => {
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const cartaInicial = carta("Forjada");
    const { data } = await dono.client
      .from("players")
      .insert({ id: cartaInicial.id, grupo_id: grupo.id, user_id: dono.id, name: "Forjada", position: "ALA", nationality: "BR", versao: 0 })
      .select("versao")
      .single()
      .throwOnError();
    expect(data?.versao).toBe(1);
  });

  it("someone saying \"sou eu\" doesn't make an open card stale", async () => {
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const membro = await user("membro");
    await addMembro(grupo.id, membro, "membro");
    const cartaInicial = carta("Vinculado");
    valor(await salvarJogador(dono.client, grupo.slug, cartaInicial));
    const aberta = { ...cartaInicial, versao: await versaoDe(cartaInicial.id) };

    await membro.client.rpc("vincular_jogador", { jogador: cartaInicial.id }).throwOnError();

    expect(valor(await salvarJogador(dono.client, grupo.slug, { ...aberta, name: "Vinculado II" }))).toEqual({ criado: false });
    expect(await versaoDe(cartaInicial.id)).toBe(aberta.versao + 1);
  });
});

describe("a Partida and its Sorteio", () => {
  it("runs from creation to published Times through the actions", async () => {
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const membro = await user("membro");
    await addMembro(grupo.id, membro, "membro");
    const ids = (await Promise.all(["J0", "J1", "J2", "J3"].map(async (n) => {
      const c = carta(n);
      valor(await salvarJogador(dono.client, grupo.slug, c));
      return c.id;
    })));

    expect(mensagem(await criarPartida(membro.client, grupo.slug, { inicio: amanha(), local: "Quadra", vagas: 10 }))).toBe(SEM_PERMISSAO);
    const { id: partida } = valor(await criarPartida(dono.client, grupo.slug, { inicio: amanha(), local: "Quadra", vagas: 10 }));
    valor(await editarPartida(dono.client, grupo.slug, partida, { inicio: amanha(), local: "Ginásio", vagas: 12 }));
    expect(mensagem(await editarPartida(dono.client, grupo.slug, partida, { inicio: amanha(), local: "", vagas: 12 }))).toBe("Diz onde vai ser.");

    for (const id of ids) expect(valor(await responderPresenca(dono.client, grupo.slug, partida, id, true))).toEqual({ situacao: "confirmado" });
    // A membro answering for someone else's Jogador gets the Presença's own reason.
    expect(mensagem(await responderPresenca(membro.client, grupo.slug, partida, ids[0], false))).toBe("Você só responde pelo seu jogador.");

    expect(mensagem(await sortearDaPartida(dono.client, grupo.slug, partida, 3))).toBe("Pra 3 Times precisa de pelo menos 6 confirmados (tem 4).");
    valor(await sortearDaPartida(dono.client, grupo.slug, partida, 2));
    const { data: sorteio } = await service().from("sorteios").select("times, sorteado_em").eq("partida_id", partida).single();
    const daOrigem = (sorteio!.times as { jogadores: { id: string }[] }[])[0].jogadores[0].id;

    valor(await moverNoSorteio(dono.client, grupo.slug, partida, daOrigem, 1, sorteio!.sorteado_em));
    valor(await publicarSorteio(dono.client, grupo.slug, partida));
    expect(mensagem(await moverNoSorteio(dono.client, grupo.slug, partida, daOrigem, 0, sorteio!.sorteado_em))).toBe(
      "Os times já foram publicados.",
    );

    valor(await cancelarPartida(dono.client, grupo.slug, partida));
    expect(mensagem(await responderPresenca(dono.client, grupo.slug, partida, ids[0], false))).toBe("Essa partida foi cancelada.");
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("Convites and vínculos", () => {
  it("invites, joins, links and unlinks", async () => {
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const novato = await user("novato");

    const convite = valor(await criarConvite(dono.client, grupo.slug));
    expect(valor(await aceitarConvite(novato.client, convite.token))).toEqual({ slug: grupo.slug, nome: grupo.nome });
    expect(mensagem(await criarConvite(novato.client, grupo.slug))).toBe(SEM_PERMISSAO);
    expect(mensagem(await revogarConvite(novato.client, grupo.slug, convite.id))).toBe(SEM_PERMISSAO);

    valor(await criarMeuJogador(novato.client, grupo.slug, "Novato", "ATA"));
    expect(mensagem(await criarMeuJogador(novato.client, grupo.slug, "De novo", "ATA"))).toBe("Você já tem um jogador nesse fut.");
    const { data: meu } = await service().from("players").select("id").eq("grupo_id", grupo.id).eq("conta_id", novato.id).single();
    valor(await desvincularJogador(novato.client, grupo.slug, meu!.id));
    valor(await vincularJogador(novato.client, grupo.slug, meu!.id));

    valor(await revogarConvite(dono.client, grupo.slug, convite.id));
    const outro = await user("outro");
    expect(mensagem(await aceitarConvite(outro.client, convite.token))).toBe("Esse convite foi cancelado");
    expect(mensagem(await aceitarConvite(outro.client, "nao-e-token"))).toBe("Convite não encontrado");
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("creating a Grupo", () => {
  it("hands back the same Grupo on a second submit", async () => {
    const dono = await user("dono");
    const primeiro = await grupoDe(dono, "Fut Único");
    expect(await grupoDe(dono, "Outro nome")).toEqual(primeiro);
    expect(mensagem(await criarGrupo(anon(), "Sem sessão"))).toBe(SESSAO_EXPIRADA);
  });
});

describe("people and the fut", () => {
  it("runs the dono's whole round, and says why when the database refuses", async () => {
    const dono = await user("dono");
    const amigo = await user("amigo");
    const grupo = await grupoDe(dono, "Fut das Pessoas");
    await addMembro(grupo.id, amigo, "membro");

    // A membro can't, and hears why in plain words.
    expect(mensagem(await mudarPapel(amigo.client, grupo.slug, dono.id, "membro"))).toBe("Só o dono do fut pode fazer isso.");
    expect(mensagem(await mudarPapel(dono.client, grupo.slug, amigo.id, "dono"))).toBe("Papel inválido.");
    expect(mensagem(await passarPosse(dono.client, grupo.slug, amigo.id))).toBe("O fut só pode passar pra um admin. Torne a pessoa admin primeiro.");
    expect(mensagem(await sairDoFut(dono.client, grupo.slug))).toBe("Passe o fut pra um admin antes de sair.");

    valor(await mudarPapel(dono.client, grupo.slug, amigo.id, "admin"));
    const { data } = await dono.client.rpc("pessoas_do_grupo", { grupo: grupo.id });
    const pessoas = data as { user_id: string; papel: string; email: string | null }[];
    expect(pessoas.map((p) => [p.user_id, p.papel])).toEqual([
      [dono.id, "dono"],
      [amigo.id, "admin"],
    ]);
    expect(pessoas[1].email).toBe(amigo.email);

    expect(valor(await renomearFut(dono.client, grupo.slug, "Fut Renomeado"))).toEqual({ nome: "Fut Renomeado" });
    valor(await passarPosse(dono.client, grupo.slug, amigo.id));
    valor(await removerDoFut(amigo.client, grupo.slug, dono.id));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("deletes the fut only for the dono and with the name typed, before touching anything", async () => {
    const dono = await user("dono");
    const admin = await user("admin");
    const grupo = await grupoDe(dono, "Fut Que Some");
    await addMembro(grupo.id, admin, "admin");

    expect(mensagem(await excluirFut(admin.client, grupo.slug, "Fut Que Some"))).toBe("Só o dono do fut pode fazer isso.");
    expect(mensagem(await excluirFut(dono.client, grupo.slug, "Outro"))).toBe("O nome digitado não confere com o do fut.");
    expect(valor(await excluirFut(dono.client, grupo.slug, "fut que some"))).toEqual({ nome: "Fut Que Some" });
    expect(mensagem(await renomearFut(dono.client, grupo.slug, "Fantasma"))).toBe(FUT_NAO_ENCONTRADO);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("lets a membro leave, telling the screen which fut it was", async () => {
    const dono = await user("dono");
    const amigo = await user("amigo");
    const grupo = await grupoDe(dono, "Fut de Saída");
    await addMembro(grupo.id, amigo, "membro");
    expect(valor(await sairDoFut(amigo.client, grupo.slug))).toEqual({ nome: "Fut de Saída" });
  });
});
