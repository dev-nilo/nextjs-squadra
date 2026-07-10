import { nextui } from "@nextui-org/react";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            primary: {
              50: "#f2f7ed",
              100: "#e6f0db",
              200: "#cde0b8",
              300: "#b4d194",
              400: "#9ac270",
              500: "#81b34d",
              600: "#678f3d",
              700: "#4e6b2e",
              800: "#34471f",
              900: "#1a240f",
              DEFAULT: "#81b34d",
              foreground: "#ffffff",
            },
            focus: "#81b34d",
          },
        },
        dark: {
          colors: {
            primary: {
              50: "#12190b",
              100: "#1a240f",
              200: "#34471f",
              300: "#4e6b2e",
              400: "#678f3d",
              500: "#81b34d",
              600: "#9ac270",
              700: "#b4d194",
              800: "#cde0b8",
              900: "#e6f0db",
              DEFAULT: "#81b34d",
              foreground: "#ffffff",
            },
            focus: "#81b34d",
          },
        },
      },
    }),
  ],
};

export default config;
