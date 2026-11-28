import path from "node:path";
import tsParser from "@typescript-eslint/parser";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";
import { fronteiras, uiSemSupabase } from "../../eslint.fronteiras.mjs";

/**
 * Lints tests/fronteiras/projeto, a small tree with the layout of ADR 0009,
 * with the rules of eslint.fronteiras.mjs. Each file says in its name what
 * should happen: `viola-*` breaks exactly one rule, every other file is clean.
 */
const projeto = path.join(__dirname, "projeto");

let erros: Map<string, string[]>;

beforeAll(async () => {
  const eslint = new ESLint({
    cwd: projeto,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.{ts,tsx}"],
        languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
        settings: {
          "boundaries/root-path": projeto,
          "import/resolver": { node: { extensions: [".ts", ".tsx"] } },
        },
      },
      fronteiras,
      uiSemSupabase,
    ],
  });
  const resultados = await eslint.lintFiles(["**/*.{ts,tsx}"]);
  erros = new Map(
    resultados.map((r) => [
      path.relative(projeto, r.filePath),
      r.messages.map((m) => `${m.ruleId ?? "parser"}: ${m.message}`),
    ]),
  );
}, 60_000);

const arquivos = () => [...erros.keys()].sort();

describe("the dependency rule (ADR 0009)", () => {
  it("lints the whole fixture", () => {
    expect(arquivos()).toHaveLength(31);
  });

  it("lets the allowed imports through", () => {
    const limpos = arquivos().filter((a) => !path.basename(a).startsWith("viola-"));
    expect(Object.fromEntries(limpos.map((a) => [a, erros.get(a)]))).toEqual(
      Object.fromEntries(limpos.map((a) => [a, []])),
    );
  });

  const DOMINIO_PURO = "dominio is plain TypeScript: no React, Next, Supabase or Sentry";
  it.each([
    ["src/modulos/a/dominio/viola-react.ts", DOMINIO_PURO],
    ["src/modulos/a/dominio/viola-supabase.ts", DOMINIO_PURO],
    ["src/modulos/a/dominio/viola-next.ts", DOMINIO_PURO],
    ["src/modulos/a/dominio/viola-aplicacao.ts", ["dominio", "aplicacao"]],
    ["src/modulos/a/dominio/viola-legado-em-valor.ts", ["dominio", "legado"]],
    ["src/modulos/a/ui/viola-infra.tsx", ["ui", "infra"]],
    ["src/modulos/a/ui/viola-compartilhado-infra.tsx", ["ui", "compartilhado-infra"]],
    ["src/modulos/a/infra/viola-aplicacao.ts", ["infra", "aplicacao"]],
    ["src/modulos/a/aplicacao/viola-ui.ts", ["aplicacao", "ui"]],
    ["src/modulos/a/ui/viola-outro-modulo-por-dentro.tsx", ["ui", "dominio"]],
    ["src/compartilhado/dominio/viola-infra.ts", ["compartilhado-dominio", "compartilhado-infra"]],
    ["src/compartilhado/infra/viola-modulo.ts", ["compartilhado-infra", "modulo"]],
    ["app/viola-modulo-por-dentro.tsx", ["app", "dominio"]],
    ["lib/viola-modulo-por-dentro.ts", ["legado", "infra"]],
  ] as const)("refuses %s", (arquivo, esperado) => {
    const deste = erros.get(arquivo) ?? [];
    expect(deste).toHaveLength(1);
    const [mensagem = ""] = deste;
    expect(mensagem).toMatch(/^boundaries\/dependencies: /);
    if (typeof esperado === "string") {
      expect(mensagem).toContain(esperado);
    } else {
      const [de, para] = esperado;
      expect(mensagem).toContain(`from elements of type "${de}"`);
      expect(mensagem).toContain(`to elements of type "${para}"`);
    }
  });

  it.each(["components/viola-supabase.tsx", "hooks/viola-cliente-do-app.ts"])(
    "refuses Supabase in the legacy UI: %s",
    (arquivo) => {
      expect(erros.get(arquivo)).toEqual([
        expect.stringMatching(/^no-restricted-imports: .*go through a Server Action/),
      ]);
    },
  );

  it("checks every viola- file", () => {
    expect(arquivos().filter((a) => path.basename(a).startsWith("viola-"))).toHaveLength(16);
  });
});
