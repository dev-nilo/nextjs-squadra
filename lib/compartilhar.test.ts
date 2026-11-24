import { afterEach, describe, expect, it, vi } from "vitest";
import { compartilharTexto } from "./compartilhar";

afterEach(() => vi.unstubAllGlobals());

/** A browser with a touch screen (or not), and the given navigator. */
function navegador(toque: boolean, nav: Partial<Navigator>) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: toque && q === "(pointer: coarse)" }));
  vi.stubGlobal("navigator", nav);
}
const copiar = () => ({ writeText: vi.fn().mockResolvedValue(undefined) });
const recusa = (nome: string) => vi.fn().mockRejectedValue(new DOMException("x", nome));

describe("compartilharTexto", () => {
  it("opens the share sheet on a phone, and copies nothing", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const clipboard = copiar();
    navegador(true, { share, clipboard } as unknown as Navigator);
    await expect(compartilharTexto("lista")).resolves.toBe("compartilhou");
    expect(share).toHaveBeenCalledWith({ text: "lista" });
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it("copies without a touch screen, even where there is a share sheet", async () => {
    const share = vi.fn();
    const clipboard = copiar();
    navegador(false, { share, clipboard } as unknown as Navigator);
    await expect(compartilharTexto("lista")).resolves.toBe("copiou");
    expect(share).not.toHaveBeenCalled();
  });

  it("treats closing the sheet, or a second tap while it's open, as giving up", async () => {
    for (const nome of ["AbortError", "InvalidStateError"]) {
      const clipboard = copiar();
      navegador(true, { share: recusa(nome), clipboard } as unknown as Navigator);
      await expect(compartilharTexto("lista")).resolves.toBe("desistiu");
      expect(clipboard.writeText).not.toHaveBeenCalled();
    }
  });

  it("copies when the phone has no share sheet, or the sheet refuses", async () => {
    const clipboard = copiar();
    navegador(true, { clipboard } as unknown as Navigator);
    await expect(compartilharTexto("lista")).resolves.toBe("copiou");

    navegador(true, { share: recusa("NotAllowedError"), clipboard } as unknown as Navigator);
    await expect(compartilharTexto("lista")).resolves.toBe("copiou");
    expect(clipboard.writeText).toHaveBeenCalledTimes(2);
  });

  it("fails when copying fails too", async () => {
    navegador(false, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } } as unknown as Navigator);
    await expect(compartilharTexto("lista")).resolves.toBe("falhou");
  });
});
