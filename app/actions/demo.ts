"use server";

import * as Sentry from "@sentry/nextjs";
import { DEMO_EMAIL, DEMO_GRUPO_ID, DEMO_GRUPO_SLUG } from "@/lib/demo";
import { garantirDemo } from "@/lib/demo-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Resultado = { ok: true; caminho: string } | { ok: false; message: string };

/**
 * "Entrar como demo": signs this browser into the shared demo account and
 * says where to go, its open Partida. The account has no password: the server
 * generates a one-time sign-in link and uses it right away, so nothing is
 * emailed and there's no secret to leak or change.
 */
export async function entrarComoDemo(): Promise<Resultado> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "A demo não está disponível aqui." };

  try {
    await garantirDemo(admin);

    const { data: link, error: erroDoLink } = await admin.auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });
    if (erroDoLink) throw erroDoLink;

    const supabase = await createClient();
    const { error: erroDaSessao } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
    if (erroDaSessao) throw erroDaSessao;

    const { data: aberta } = await supabase
      .from("partidas")
      .select("id")
      .eq("grupo_id", DEMO_GRUPO_ID)
      .is("cancelada_em", null)
      .gt("inicio", new Date().toISOString())
      .order("inicio")
      .limit(1)
      .maybeSingle();

    return { ok: true, caminho: aberta ? `/g/${DEMO_GRUPO_SLUG}/partidas/${aberta.id}` : `/g/${DEMO_GRUPO_SLUG}` };
  } catch (err) {
    Sentry.captureException(err, { tags: { action: "entrarComoDemo" } });
    return { ok: false, message: "Não deu pra abrir a demo agora. Tenta de novo." };
  }
}
