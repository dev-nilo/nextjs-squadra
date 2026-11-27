import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier/flat";

// DESIGN.md: only design tokens. Bans raw Tailwind palette colors,
// arbitrary hex colors and arbitrary pixel font sizes in class strings.
const RAW_PALETTE =
  "(bg|text|border|ring|ring-offset|from|via|to|fill|stroke|outline|divide|placeholder|shadow|accent|caret|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\\b";
const ARBITRARY_HEX = "-\\[#[0-9a-fA-F]{3,8}\\]";
const ARBITRARY_FONT_SIZE = "text-\\[\\d+(\\.\\d+)?(px|rem)\\]";

const designTokenRule = (pattern, message) => [
  { selector: `Literal[value=/${pattern}/]`, message },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message },
];

const eslintConfig = [
  ...nextConfig,
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...designTokenRule(RAW_PALETTE, "Use a design token (see DESIGN.md), not a raw Tailwind palette color."),
        ...designTokenRule(ARBITRARY_HEX, "Use a design token (see DESIGN.md), not an arbitrary hex color."),
        ...designTokenRule(
          ARBITRARY_FONT_SIZE,
          "Use the type scale (see DESIGN.md), e.g. text-2xs, not an arbitrary font size.",
        ),
      ],
    },
  },
  {
    // Unused code is checked here, not with tsc's noUnusedLocals: tsconfig
    // includes the route types Next generates (.next/types), and those import
    // names they don't always use. A leading underscore marks one on purpose.
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // Last, so it turns off any style rule above that Prettier now owns.
  prettierConfig,
];

export default eslintConfig;
