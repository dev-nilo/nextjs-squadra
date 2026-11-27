import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

/**
 * Sent with every response. Vercel already adds Strict-Transport-Security.
 *
 * The CSP only has the directives that can't break anything the app loads:
 * no framing by other sites (clickjacking), no <base> or plugin tricks, and
 * forms post only here. A script/connect policy would need a nonce on every
 * render (forcing every page dynamic) and the Supabase, Sentry and Vercel
 * origins listed; that's a separate change.
 */
const CABECALHOS_DE_SEGURANCA = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  // frame-ancestors for browsers that predate it.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Most browsers' default already; said here so it can't drift. Invite links carry their token in the path.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here uses them. A photo comes from a file input, which this doesn't govern.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS_DE_SEGURANCA }];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source maps upload only when the token is set: Vercel builds, and a local build whose
  // .env.local was pulled from Vercel. CI and `npm run test:local` leave it empty and skip it.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
