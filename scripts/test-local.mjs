#!/usr/bin/env node
// Runs the database-backed checks from CI against the local Supabase (`npm run db:start`):
//
//   npm run test:local                  integration tests, then build + E2E
//   npm run test:local -- integration   integration tests only
//   npm run test:local -- e2e           build + E2E only
//
// It reads the local URL and keys from `supabase status`, so nothing gets copied by hand,
// and it blanks the Sentry variables. A `.env.local` pulled from Vercel holds the real
// Sentry token and DSN, so a local build would upload source maps and the E2E run would
// report its errors to Sentry. Next never overrides a variable that is already set, even
// when it is empty, so the blanks win over `.env.local`. The same goes for the Supabase
// variables: whatever `.env.local` says, these tests talk to the local database only.
import { spawnSync } from "node:child_process";
import net from "node:net";

const ETAPAS = {
  integration: [["npm", ["run", "test:integration"]]],
  e2e: [
    ["npm", ["run", "build"]],
    ["npm", ["run", "test:e2e"]],
  ],
};

const pedidas = process.argv.slice(2);
const desconhecidas = pedidas.filter((p) => !Object.hasOwn(ETAPAS, p));
if (desconhecidas.length > 0) {
  console.error(`Unknown step: ${desconhecidas.join(", ")}. Use: ${Object.keys(ETAPAS).join(", ")}.`);
  process.exit(2);
}
const etapas = pedidas.length > 0 ? pedidas : Object.keys(ETAPAS);

const status = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
let local;
try {
  local = JSON.parse(status.stdout);
} catch {
  local = null;
}
const url = local?.API_URL;
const anon = local?.ANON_KEY ?? local?.PUBLISHABLE_KEY;
const service = local?.SERVICE_ROLE_KEY ?? local?.SECRET_KEY;
if (status.status !== 0 || !url || !anon || !service) {
  console.error("The local Supabase isn't running. Start it with `npm run db:start` (it needs Docker).");
  process.exit(1);
}

// Playwright reuses whatever already listens on :3000 outside CI, such as a `npm run dev`
// pointed at another database. Stop it rather than test the wrong app.
if (etapas.includes("e2e") && (await portaOcupada(3000))) {
  console.error("Port 3000 is in use. Stop that server first: the E2E run starts its own production build there.");
  process.exit(1);
}

const env = {
  ...process.env,
  SUPABASE_URL: url,
  SUPABASE_ANON_KEY: anon,
  SUPABASE_SERVICE_ROLE_KEY: service,
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
  SENTRY_AUTH_TOKEN: "",
  SENTRY_ORG: "",
  SENTRY_PROJECT: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
};

console.log(`Local Supabase at ${url}. Sentry is off for this run.`);
for (const etapa of etapas) {
  for (const [comando, args] of ETAPAS[etapa]) {
    console.log(`\n> ${comando} ${args.join(" ")}`);
    const r = spawnSync(comando, args, { stdio: "inherit", env });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}

function portaOcupada(porta) {
  return new Promise((resolve) => {
    const s = net.connect({ port: porta, host: "127.0.0.1" });
    s.once("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.once("error", () => resolve(false));
  });
}
