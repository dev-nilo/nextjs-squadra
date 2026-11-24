import { afterEach, describe, expect, it, vi } from "vitest";
import { compartilharTexto } from "./compartilhar";

afterEach(() => vi.unstubAllGlobals());

const comNavegador = (navegador: Partial<Navigator>) => vi.stubGlobal("navigator", navegador);
const copiar = () => ({ writeText: vi.fn().mockResolvedValue(undefined) });

describe("compartilharTexto", () => {
  it("opens the share sheet when there is one, and copies nothing", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const clipboard = copiar();
    comNavegador({ share, clipboard } as unknown as Navigator);
    await expect(compartilharTexto("lista")).resolves.toBe("compartilhou");
    expect(share).toHaveBeenCalledWith({ text: "lista" });
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it("treats closing the sheet as giving up, not as an error", async () => {
    const clipboard = copiar();
    comNavegador({ share: vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")), clipboard } as unknown as Navigator);
    await expect(compartilharTexto("lista")).resolves.toBe("desistiu");
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it("copies when there is no share sheet, or the sheet refuses", async () => {
    const clipboard = copiar();
    comNavegador({ clipboard } as unknown as Navigator);
    await expect(compartilharTexto("lista")).resolves.toBe("copiou");

    comNavegador({ share: vi.fn().mockRejectedValue(new DOMException("no", "NotAllowedError")), clipboard } as unknown as Navigator);
    await expect(compartilharTexto("lista")).resolves.toBe("copiou");
    expect(clipboard.writeText).toHaveBeenCalledTimes(2);
  });

  it("fails when copying fails too", async () => {
    comNavegador({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } } as unknown as Navigator);
    await expect(compartilharTexto("lista")).resolves.toBe("falhou");
  });
});
