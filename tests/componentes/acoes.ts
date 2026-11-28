import type { Resultado } from "@/lib/acoes/executar";

/**
 * Server Actions in a component test. Mock the action's module in the test
 * file (`vi.mock("@/app/actions/jogador", () => ({ salvarJogador: vi.fn() }))`),
 * then answer each call with one of these, the way the real seam does
 * (lib/acoes/executar.ts).
 */
export const ok = <T = null>(valor: T = null as T): Resultado<T> => ({ ok: true, valor });

/** A refusal the server explains (RLS, a check, a stale versão). */
export const recusa = (message: string): Resultado<never> => ({ ok: false, message });

/** A failure nobody expected: the write may or may not have happened. */
export const falha = (message = "Tente de novo em instantes."): Resultado<never> => ({
  ok: false,
  message,
  inesperado: true,
});
