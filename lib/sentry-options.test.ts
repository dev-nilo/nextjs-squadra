import { describe, expect, it } from "vitest";
import { sentryEnvironment, sentryOptions } from "./sentry-options";

describe("sentryEnvironment", () => {
  it("tags production deployments as production", () => {
    expect(sentryEnvironment("production")).toBe("production");
  });

  it("tags preview deployments as staging, since previews use the staging database", () => {
    expect(sentryEnvironment("preview")).toBe("staging");
  });

  it("falls back to development locally and in CI", () => {
    expect(sentryEnvironment("development")).toBe("development");
    expect(sentryEnvironment(undefined)).toBe("development");
  });
});

describe("sentryOptions", () => {
  it("samples a tenth of production traffic and everything elsewhere", () => {
    expect(sentryOptions("production", "dsn").tracesSampleRate).toBe(0.1);
    expect(sentryOptions("preview", "dsn").tracesSampleRate).toBe(1);
  });

  it("never collects user info, cookies, headers or bodies", () => {
    expect(sentryOptions("production", "dsn").dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
    });
  });

  it("passes an absent DSN through so the SDK stays inert", () => {
    expect(sentryOptions(undefined, undefined).dsn).toBeUndefined();
  });
});
