"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthErrorWatcher } from "@/components/auth/auth-error-watcher";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthShell } from "@/components/auth/auth-shell";
import { TelaDeAviso } from "@/components/ui/tela-de-aviso";
import { useAuth } from "@/hooks/use-auth";

/** A server-rendered Grupo page reached without a session: sign in, then the page renders again on the server. */
export function EntrarParaVer() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) router.refresh();
  }, [isAuthenticated, router]);

  return (
    <>
      <AuthErrorWatcher />
      <AuthShell>
        <AuthPanel />
      </AuthShell>
    </>
  );
}

/**
 * The slug names a Grupo that doesn't exist or this user isn't in.
 * `data-fut-fora` tells the service worker to forget this fut's saved pages:
 * someone removed from it mustn't keep opening it with no signal.
 */
export function FutNaoEncontrado() {
  return (
    <TelaDeAviso
      data-fut-fora=""
      titulo="Esse fut não existe"
      texto="Ou você ainda não faz parte dele. Peça o convite pra quem organiza."
    />
  );
}
