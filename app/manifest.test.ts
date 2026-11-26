import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

/** A PNG's width and height, from its IHDR chunk. */
function tamanhoDoPng(arquivo: string): string {
  const png = readFileSync(path.join(__dirname, "..", "public", arquivo));
  expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

describe("manifest", () => {
  const m = manifest();

  it("lists icons and screenshots that exist at the sizes it says", () => {
    for (const imagem of [...(m.icons ?? []), ...(m.screenshots ?? [])]) {
      expect(tamanhoDoPng(imagem.src), imagem.src).toBe(imagem.sizes);
    }
  });

  it("has what Chrome's richer install dialog asks for: a phone screenshot and a wide one, each with a label", () => {
    const capturas = m.screenshots ?? [];
    expect(capturas.some((c) => c.form_factor === "narrow")).toBe(true);
    expect(capturas.some((c) => c.form_factor === "wide")).toBe(true);
    for (const c of capturas) expect(c.label).toBeTruthy();
  });

  it("has a maskable icon at 192 and 512", () => {
    const mascaraveis = (m.icons ?? []).filter((i) => i.purpose === "maskable").map((i) => i.sizes);
    expect(mascaraveis).toEqual(["192x192", "512x512"]);
  });
});
