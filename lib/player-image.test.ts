import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { apagarFotoEnviada, uploadPlayerImage } from "./player-image";

const GRUPO = "11111111-1111-4111-8111-111111111111";
const JOGADOR = "33333333-3333-4333-8333-333333333333";
const JPEG = "data:image/jpeg;base64,/9j/4AAQ";
const PNG = "data:image/png;base64,iVBORw0K";

/** A Storage client that records uploads and removals. */
function storage() {
  const upload = vi.fn(async (_caminho: string, _blob: Blob, _opcoes: Record<string, unknown>) => ({ error: null }));
  const remove = vi.fn(async (caminhos: string[]) => ({
    data: caminhos.map((name) => ({ name })) as { name: string }[],
    error: null as Error | null,
  }));
  const bucket = {
    upload,
    remove,
    getPublicUrl: (caminho: string) => ({
      data: { publicUrl: `https://projeto.supabase.co/storage/v1/object/public/player-images/${caminho}` },
    }),
  };
  const supabase = { storage: { from: () => bucket } } as unknown as SupabaseClient;
  return { supabase, upload, remove };
}

describe("uploadPlayerImage (#116)", () => {
  it("writes every upload to a new file of the Jogador's, never over one", async () => {
    const { supabase, upload } = storage();

    const primeira = await uploadPlayerImage(supabase, GRUPO, JOGADOR, JPEG);
    const segunda = await uploadPlayerImage(supabase, GRUPO, JOGADOR, JPEG);

    expect(primeira.caminho).toMatch(new RegExp(`^${GRUPO}/${JOGADOR}\\.[0-9a-f]{12}\\.jpg$`));
    expect(segunda.caminho).not.toBe(primeira.caminho);
    expect(upload.mock.calls.every(([, , opcoes]) => opcoes.upsert === false)).toBe(true);
    // A path of its own needs no cache-busting query.
    expect(primeira.url).toBe(`https://projeto.supabase.co/storage/v1/object/public/player-images/${primeira.caminho}`);
  });

  it("keeps a PNG the browser couldn't re-encode as .png", async () => {
    const { supabase } = storage();
    expect((await uploadPlayerImage(supabase, GRUPO, JOGADOR, PNG)).caminho).toMatch(/\.png$/);
  });
});

describe("apagarFotoEnviada", () => {
  it("removes the file, and a failure never reaches the caller", async () => {
    const { supabase, remove } = storage();
    await apagarFotoEnviada(supabase, `${GRUPO}/${JOGADOR}.abc.jpg`);
    expect(remove).toHaveBeenCalledWith([`${GRUPO}/${JOGADOR}.abc.jpg`]);

    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    remove.mockResolvedValueOnce({ data: [], error: new Error("offline") });
    await expect(apagarFotoEnviada(supabase, "x")).resolves.toBeUndefined();
    // RLS filtering the file out isn't an error from Storage, but nothing was deleted.
    remove.mockResolvedValueOnce({ data: [], error: null });
    await expect(apagarFotoEnviada(supabase, "y")).resolves.toBeUndefined();
    expect(erro).toHaveBeenCalledTimes(2);
    erro.mockRestore();
  });
});
