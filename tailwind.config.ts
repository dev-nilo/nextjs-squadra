/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        focus: "rgb(var(--focus) / <alpha-value>)",
        divider: "rgb(var(--divider) / <alpha-value>)",
        content1: {
          DEFAULT: "rgb(var(--content1) / <alpha-value>)",
          foreground: "rgb(var(--content1-foreground) / <alpha-value>)",
        },
        content2: {
          DEFAULT: "rgb(var(--content2) / <alpha-value>)",
          foreground: "rgb(var(--content2-foreground) / <alpha-value>)",
        },
        content3: {
          DEFAULT: "rgb(var(--content3) / <alpha-value>)",
          foreground: "rgb(var(--content3-foreground) / <alpha-value>)",
        },
        content4: {
          DEFAULT: "rgb(var(--content4) / <alpha-value>)",
          foreground: "rgb(var(--content4-foreground) / <alpha-value>)",
        },
        default: {
          50: "rgb(var(--default-50) / <alpha-value>)",
          100: "rgb(var(--default-100) / <alpha-value>)",
          200: "rgb(var(--default-200) / <alpha-value>)",
          300: "rgb(var(--default-300) / <alpha-value>)",
          400: "rgb(var(--default-400) / <alpha-value>)",
          500: "rgb(var(--default-500) / <alpha-value>)",
          600: "rgb(var(--default-600) / <alpha-value>)",
          700: "rgb(var(--default-700) / <alpha-value>)",
          800: "rgb(var(--default-800) / <alpha-value>)",
          900: "rgb(var(--default-900) / <alpha-value>)",
          DEFAULT: "rgb(var(--default) / <alpha-value>)",
          foreground: "rgb(var(--default-foreground) / <alpha-value>)",
        },
        primary: {
          50: "rgb(var(--primary-50) / <alpha-value>)",
          100: "rgb(var(--primary-100) / <alpha-value>)",
          200: "rgb(var(--primary-200) / <alpha-value>)",
          300: "rgb(var(--primary-300) / <alpha-value>)",
          400: "rgb(var(--primary-400) / <alpha-value>)",
          500: "rgb(var(--primary-500) / <alpha-value>)",
          600: "rgb(var(--primary-600) / <alpha-value>)",
          700: "rgb(var(--primary-700) / <alpha-value>)",
          800: "rgb(var(--primary-800) / <alpha-value>)",
          900: "rgb(var(--primary-900) / <alpha-value>)",
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          foreground: "rgb(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--warning) / <alpha-value>)",
          600: "rgb(var(--warning-600) / <alpha-value>)",
          foreground: "rgb(var(--warning-foreground) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          foreground: "rgb(var(--danger-foreground) / <alpha-value>)",
        },
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

export default config;
