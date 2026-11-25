import { describe, expect, it } from "vitest";
import { posicaoDoMenu } from "./posicao-do-menu";

const tela = { largura: 375, altura: 667 };
const menu = { largura: 208, altura: 130 };

describe("posicaoDoMenu", () => {
  it("opens under the button, its right edge on the button's right edge", () => {
    const botao = { top: 100, bottom: 132, left: 320, right: 352 };
    expect(posicaoDoMenu(botao, menu, tela)).toEqual({ top: 140, left: 144 });
  });

  it("stays on screen when the button is near the left edge (a card in the album's first column)", () => {
    const botao = { top: 100, bottom: 132, left: 141, right: 173 };
    expect(posicaoDoMenu(botao, menu, tela).left).toBe(8);
  });

  it("stays on screen on a screen narrower than the menu's natural spot allows", () => {
    const botao = { top: 100, bottom: 132, left: 240, right: 272 };
    const estreita = { largura: 280, altura: 568 };
    const largo = { largura: 270, altura: 130 };
    expect(posicaoDoMenu(botao, largo, estreita).left).toBe(5);
  });

  it("opens above the button when there's no room under it", () => {
    const botao = { top: 560, bottom: 592, left: 320, right: 352 };
    expect(posicaoDoMenu(botao, menu, tela).top).toBe(560 - 8 - 130);
  });

  it("stays under the button when there's no room above either, clamped to the screen", () => {
    const baixa = { largura: 740, altura: 200 };
    const botao = { top: 60, bottom: 92, left: 600, right: 632 };
    expect(posicaoDoMenu(botao, menu, baixa).top).toBe(200 - 8 - 130);
  });
});
