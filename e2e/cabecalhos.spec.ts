import { expect, test } from "@playwright/test";

// Every page, the ones the proxy handles too, goes out with the security headers (next.config.ts).
for (const caminho of ["/auth", "/", "/g/fut-do-dev", "/convite/qualquer"]) {
  test(`${caminho} sends the security headers`, async ({ request }) => {
    const resposta = await request.get(caminho, { maxRedirects: 0 });
    const h = resposta.headers();
    expect(h["content-security-policy"]).toBe("frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
  });
}
