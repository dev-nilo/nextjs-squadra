import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ErroAoAbrirFut, PrimeiroAcesso } from "@/components/grupo/primeiro-acesso";
import { EntrarParaVer } from "@/components/partida/entrar-para-ver";
import { Surface } from "@/components/ui/surface";
import { COOKIE_FUTS_RECENTES, grupoParaAbrir, lerFutsRecentes } from "@/lib/grupo";
import { carregarParticipacoes } from "@/lib/grupo-server";
import { isSupabaseConfigured } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";

/**
 * `/` signs you in, then sends you to a Grupo: the last one opened on this
 * device, else the default. With no Grupo yet, the first-access screen.
 */
export default async function Home() {
  // Per request, always: never prerendered, even when the build has no Supabase env.
  await connection();
  if (!isSupabaseConfigured()) return <SupabaseNaoConfigurado />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <EntrarParaVer />;

  const participacoes = await carregarParticipacoes(supabase, user.id);
  if (!participacoes) return <ErroAoAbrirFut />;

  const recentes = lerFutsRecentes((await cookies()).get(COOKIE_FUTS_RECENTES)?.value);
  const grupo = grupoParaAbrir(participacoes, recentes);
  if (grupo) redirect(`/g/${grupo.slug}`);
  return <PrimeiroAcesso />;
}

function SupabaseNaoConfigurado() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Surface className="max-w-md">
        <h1 className="text-title">Supabase não configurado</h1>
        <p className="text-muted mt-1">
          Crie <code className="text-foreground">.env.local</code> na raiz com NEXT_PUBLIC_SUPABASE_URL e
          NEXT_PUBLIC_SUPABASE_ANON_KEY, depois reinicie <code className="text-foreground">npm run dev</code>.
        </p>
      </Surface>
    </div>
  );
}
