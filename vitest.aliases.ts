import path from "node:path";

const raiz = (...partes: string[]) => path.resolve(__dirname, ...partes);

/**
 * The same paths as tsconfig.json, for both Vitest configs. The new layout
 * (ADR 0009) comes first: "@" would otherwise read "@/modulos/x" as ./modulos/x.
 */
export const aliases = [
  { find: /^@\/modulos\//, replacement: raiz("src/modulos") + "/" },
  { find: /^@\/compartilhado\//, replacement: raiz("src/compartilhado") + "/" },
  { find: /^@\//, replacement: raiz() + "/" },
  { find: /^server-only$/, replacement: raiz("tests/stubs/server-only.ts") },
];
