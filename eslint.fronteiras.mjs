import boundaries from "eslint-plugin-boundaries";

/**
 * The dependency rule of ADR 0009, checked by eslint-plugin-boundaries.
 * docs/architecture.md §12 draws it; tests/fronteiras proves each policy fires.
 *
 *   app/  ──▶ a module's index.ts ──▶ ui, aplicacao
 *   ui ──▶ dominio          aplicacao ──▶ dominio, infra          infra ──▶ dominio
 *   each layer ──▶ the same layer of compartilhado (ui and aplicacao: its dominio too)
 *
 * Nothing imports outward, no module reaches into another module's folders,
 * and dominio imports no React, Next, Supabase or Sentry.
 */

const CAMADAS = ["dominio", "aplicacao", "infra", "ui"];

const elementos = [
  // A layer of a module: src/modulos/<modulo>/<camada>/**
  ...CAMADAS.map((camada) => ({ type: camada, pattern: `src/modulos/*/${camada}`, capture: ["modulo"] })),
  // What is left of a module is its public surface, src/modulos/<modulo>/index.ts.
  { type: "modulo", pattern: "src/modulos/*", capture: ["modulo"] },
  ...CAMADAS.map((camada) => ({ type: `compartilhado-${camada}`, pattern: `src/compartilhado/${camada}` })),
  { type: "compartilhado-pwa", pattern: "src/compartilhado/pwa" },
  { type: "app", pattern: "app", partialMatch: false },
  // The flat tree that the modules replace, deleted in M8.
  { type: "legado", pattern: ["lib", "components", "hooks", "types"], partialMatch: false },
];

const doMesmoModulo = (type) => ({
  element: { type, captured: { modulo: "{{ from.element.captured.modulo }}" } },
});
const entradaDeUmModulo = { element: { type: "modulo", fileInternalPath: "index.{ts,tsx}" } };
const entradaDeOutroModulo = {
  element: { ...entradaDeUmModulo.element, captured: { modulo: "!{{ from.element.captured.modulo }}" } },
};
const tipo = (type) => ({ element: { type } });

/** Packages that are runtime, framework or infrastructure: none of them belongs in a domain. */
const FORA_DO_DOMINIO = ["react", "react-dom", "next", "@supabase/*", "@sentry/*", "server-only", "sonner"];

/** @type {import("eslint").Linter.Config} */
export const fronteiras = {
  files: ["**/*.{ts,tsx}"],
  plugins: { boundaries },
  settings: {
    "boundaries/elements": elementos,
    "boundaries/legacy-templates": false,
  },
  rules: {
    "boundaries/dependencies": [
      "error",
      {
        default: "disallow",
        checkAllOrigins: true,
        policies: [
          // Packages and Node built-ins are fine, except in dominio (below).
          { allow: { to: { module: { origin: ["external", "core"] } } } },

          // Inside a module, inward only.
          { from: tipo("ui"), allow: [{ to: doMesmoModulo("dominio") }, { to: tipo("compartilhado-ui") }] },
          {
            from: tipo("aplicacao"),
            allow: [
              { to: doMesmoModulo("dominio") },
              { to: doMesmoModulo("infra") },
              { to: tipo("compartilhado-aplicacao") },
            ],
          },
          { from: tipo("infra"), allow: [{ to: doMesmoModulo("dominio") }, { to: tipo("compartilhado-infra") }] },
          {
            from: tipo("modulo"),
            allow: [{ to: doMesmoModulo("ui") }, { to: doMesmoModulo("aplicacao") }, { to: doMesmoModulo("dominio") }],
          },

          // Every layer may use the domain of compartilhado, and anyone may use
          // another module, through its index.ts only.
          {
            from: [tipo("dominio"), tipo("aplicacao"), tipo("infra"), tipo("ui"), tipo("modulo")],
            allow: [{ to: tipo("compartilhado-dominio") }, { to: entradaDeOutroModulo }],
          },
          {
            from: [
              tipo("compartilhado-aplicacao"),
              tipo("compartilhado-infra"),
              tipo("compartilhado-ui"),
              tipo("compartilhado-pwa"),
            ],
            allow: { to: tipo("compartilhado-dominio") },
          },
          { from: tipo("compartilhado-aplicacao"), allow: { to: tipo("compartilhado-infra") } },

          // app/ and the legacy tree reach a module through its index.ts, and
          // compartilhado through any layer. Legacy imports legacy freely.
          {
            from: [tipo("app"), tipo("legado")],
            allow: [
              { to: entradaDeUmModulo },
              { to: { element: { type: "compartilhado-*" } } },
              { to: tipo("legado") },
              { to: tipo("app") },
            ],
          },
          // Until M8 the new code may still use the legacy tree, but dominio
          // only for types, so no runtime dependency sneaks in through it.
          { from: [tipo("aplicacao"), tipo("infra"), tipo("ui"), tipo("modulo")], allow: { to: tipo("legado") } },
          { from: tipo("dominio"), allow: { to: tipo("legado"), dependency: { kind: "type" } } },

          // Last, so it wins over the first policy.
          {
            from: tipo("dominio"),
            disallow: { to: { module: { origin: "external", source: FORA_DO_DOMINIO } } },
            message: "dominio is plain TypeScript: no React, Next, Supabase or Sentry (ADR 0009).",
          },
        ],
      },
    ],
  },
};

/**
 * The legacy UI may not call Supabase: it goes through a Server Action. These
 * files still do, and the list may only shrink (each module milestone empties
 * part of it, M8 deletes it).
 */
const AINDA_CHAMAM_O_SUPABASE = [
  "components/auth/auth-form.tsx",
  "components/auth/change-password-modal.tsx",
  "components/elenco/elenco-view.tsx",
  "components/pessoas/convites-do-fut.tsx",
  "hooks/use-auth.ts",
  "hooks/use-partida-ao-vivo.ts",
];

/** @type {import("eslint").Linter.Config} */
export const uiSemSupabase = {
  files: ["components/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}"],
  ignores: AINDA_CHAMAM_O_SUPABASE,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/lib/supabase/*", "@supabase/*"],
            message: "UI doesn't call Supabase: go through a Server Action (ADR 0007, ADR 0009).",
          },
        ],
      },
    ],
  },
};
