import { timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { resetarDemo } from "@/lib/demo-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function autorizado(request: NextRequest): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const recebido = Buffer.from(request.headers.get("authorization") ?? "");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

/**
 * Puts the demo back every night. Vercel Cron calls it (vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`; without that secret, nothing happens.
 */
export async function GET(request: NextRequest) {
  if (!autorizado(request)) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 500 });

  try {
    await resetarDemo(admin);
    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "cron/resetar-demo" } });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
