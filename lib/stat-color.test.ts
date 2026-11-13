import { describe, expect, it } from "vitest";
import { corNoPapel, getStatColor } from "./stat-color";

describe("stat colors", () => {
  it.each([
    [95, 0],
    [80, 0],
    [79, 1],
    [70, 1],
    [69, 2],
    [50, 2],
    [49, 3],
  ])("puts %i in band %i, on screen and on paper alike", (valor, faixa) => {
    const naTela = ["text-success", "text-primary", "text-warning-600", "text-danger"];
    const noPapel = ["text-paper-bom", "text-paper-foreground", "text-paper-medio", "text-paper-fraco"];
    expect(getStatColor(valor)).toBe(naTela[faixa]);
    expect(corNoPapel(valor)).toBe(noPapel[faixa]);
  });
});
