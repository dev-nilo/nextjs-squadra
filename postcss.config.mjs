/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind 4 adds vendor prefixes itself (Lightning CSS): no autoprefixer.
    "@tailwindcss/postcss": {},
  },
};

export default config;
