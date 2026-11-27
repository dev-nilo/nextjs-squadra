type Caixa = { top: number; bottom: number; left: number; right: number };
type Tamanho = { largura: number; altura: number };

/** How far a menu keeps from the screen's edges and from its button. */
const MARGEM = 8;

/**
 * Where a ⋯ menu opens (viewport pixels, for `position: fixed`): under its
 * button with the right edges lined up, moved in so it never leaves the screen
 * (a card in the album's first column), and above the button when there's no
 * room under it (the last row, a phone on its side).
 */
export function posicaoDoMenu(botao: Caixa, menu: Tamanho, tela: Tamanho): { top: number; left: number } {
  const maxLeft = tela.largura - MARGEM - menu.largura;
  const left =
    maxLeft < MARGEM
      ? Math.max(0, (tela.largura - menu.largura) / 2) // wider than the screen allows: centered
      : Math.min(Math.max(botao.right - menu.largura, MARGEM), maxLeft);

  const embaixo = botao.bottom + MARGEM;
  const emCima = botao.top - MARGEM - menu.altura;
  let top = embaixo;
  if (embaixo + menu.altura > tela.altura - MARGEM) {
    top = emCima >= MARGEM ? emCima : Math.max(MARGEM, tela.altura - MARGEM - menu.altura);
  }
  return { top, left };
}

/**
 * Places an open popover menu next to the button that opened it. Sets `left`
 * and `top` and clears `right`/`bottom`, which the popover's own `inset: 0`
 * would otherwise win over (the menu would sit at the screen's left edge).
 */
export function posicionarMenu(menu: HTMLElement, botao: HTMLElement) {
  const caixa = botao.getBoundingClientRect();
  const { width, height } = menu.getBoundingClientRect();
  const { top, left } = posicaoDoMenu(
    caixa,
    { largura: width, altura: height },
    { largura: window.innerWidth, altura: window.innerHeight },
  );
  menu.style.inset = "auto";
  menu.style.top = `${Math.round(top)}px`;
  menu.style.left = `${Math.round(left)}px`;
}
