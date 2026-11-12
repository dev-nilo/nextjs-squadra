import type { SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  comSessao,
  exigir,
  exigirLinhas,
  FUT_NAO_ENCONTRADO,
  noGrupo,
  recusar,
  SEM_PERMISSAO,
  SESSAO_EXPIRADA,
  validar,
  type Opcoes,
} from "./executar";
import { z } from "zod";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

/** Only what comSessao reads: who is signed in. */
const cliente = (user: { id: string } | null) =>
  ({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } }) as unknown as SupabaseClient;

const opcoes: Opcoes = {
  acao: "teste",
  generica: "Não deu agora. Tenta de novo.",
  motivos: { cancelada: "Essa partida foi cancelada.", "23514": "Confira o local e as vagas." },
};

/** The message an action ends with when its body throws `falha`. */
async function mensagemPara(falha: () => never | unknown) {
  const resultado = await comSessao(cliente({ id: "u1" }), opcoes, async () => falha());
  if (resultado.ok) throw new Error("expected a refusal");
  return resultado.message;
}

const doBanco = (error: { code?: string; hint?: string }) => () => exigir({ data: null, error });

beforeEach(() => vi.mocked(Sentry.captureException).mockClear());

describe("the error table", () => {
  it("says the Sessão expired for both ways Supabase reports it", async () => {
    expect(await mensagemPara(doBanco({ code: "28000" }))).toBe(SESSAO_EXPIRADA);
    expect(await mensagemPara(doBanco({ code: "PGRST301" }))).toBe(SESSAO_EXPIRADA);
    expect(await comSessao(cliente(null), opcoes, async () => "nunca roda")).toEqual({ ok: false, message: SESSAO_EXPIRADA });
  });

  it("uses the action's motivos, by HINT first and then by Postgres code", async () => {
    expect(await mensagemPara(doBanco({ code: "P0001", hint: "cancelada" }))).toBe("Essa partida foi cancelada.");
    expect(await mensagemPara(doBanco({ code: "23514" }))).toBe("Confira o local e as vagas.");
  });

  it("gives one permission message when RLS or a function refuses the papel", async () => {
    expect(await mensagemPara(doBanco({ code: "42501" }))).toBe(SEM_PERMISSAO);
    expect(await mensagemPara(doBanco({ code: "P0001", hint: "sem-permissao" }))).toBe(SEM_PERMISSAO);
    expect(await mensagemPara(() => exigirLinhas({ data: [], error: null }))).toBe(SEM_PERMISSAO);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("shows a refusal as is, without telling Sentry", async () => {
    expect(await mensagemPara(() => recusar("Diz onde vai ser."))).toBe("Diz onde vai ser.");
    expect(await mensagemPara(() => validar(z.string().min(1, "Diz onde vai ser."), "", "Confira."))).toBe("Diz onde vai ser.");
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("reports anything unexpected to Sentry, tagged with the action, and shows the generic message", async () => {
    expect(await mensagemPara(doBanco({ code: "XX000" }))).toBe(opcoes.generica);
    expect(await mensagemPara(() => exigir({ data: null, error: null }))).toBe(opcoes.generica);
    expect(
      await mensagemPara(() => {
        throw new TypeError("bug");
      }),
    ).toBe(opcoes.generica);
    expect(Sentry.captureException).toHaveBeenCalledTimes(3);
    expect(vi.mocked(Sentry.captureException).mock.calls[0][1]).toEqual({ tags: { action: "teste" } });
  });
});

describe("noGrupo", () => {
  it("refuses a slug that can't be a Grupo's before asking anyone", async () => {
    const supabase = cliente({ id: "u1" });
    expect(await noGrupo(supabase, "Não É Slug", opcoes, async () => "nunca roda")).toEqual({ ok: false, message: FUT_NAO_ENCONTRADO });
    expect(await noGrupo(supabase, 42, opcoes, async () => "nunca roda")).toEqual({ ok: false, message: FUT_NAO_ENCONTRADO });
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });
});
