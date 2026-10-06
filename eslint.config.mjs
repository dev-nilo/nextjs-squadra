import nextConfig from "eslint-config-next";

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
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...designTokenRule(RAW_PALETTE, "Use a design token (see DESIGN.md), not a raw Tailwind palette color."),
        ...designTokenRule(ARBITRARY_HEX, "Use a design token (see DESIGN.md), not an arbitrary hex color."),
        ...designTokenRule(ARBITRARY_FONT_SIZE, "Use the type scale (see DESIGN.md), e.g. text-2xs, not an arbitrary font size."),
      ],
    },
  },
];

export default eslintConfig;
