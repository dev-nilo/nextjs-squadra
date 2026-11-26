"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthErrorWatcher } from "@/components/auth/auth-error-watcher";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthShell } from "@/components/auth/auth-shell";
import { Logo } from "@/components/ui/logo";
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
    <AuthShell>
      <div data-fut-fora="" className="flex flex-col items-center gap-4 text-center">
        <Logo className="h-12 w-12" />
        <div className="flex flex-col gap-1">
          <h1 className="text-title">Esse fut não existe</h1>
          <p className="text-sm text-default-500">Ou você ainda não faz parte dele. Peça o convite pra quem organiza.</p>
        </div>
        <Link href="/" className="rounded font-semibold text-foreground underline-offset-4 hover:underline">
          Ir pro meu fut
        </Link>
      </div>
    </AuthShell>
  );
}
