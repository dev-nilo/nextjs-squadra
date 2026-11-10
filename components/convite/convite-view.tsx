"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { aceitarConvite } from "@/app/actions/convite";
import { AuthErrorWatcher } from "@/components/auth/auth-error-watcher";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthShell } from "@/components/auth/auth-shell";
import { UserMenu } from "@/components/auth/user-menu";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";
import {
  caminhoDoConvite,
  esquecerConvitePendente,
  lembrarConvitePendente,
  PROBLEMA_DO_CONVITE,
  type SituacaoDoConvite,
} from "@/lib/convite";

const linkClass =
  "rounded font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/** `/convite/<token>`: sign in or sign up, then join the Grupo as membro. */
export function ConviteView({
  token,
  situacao,
  grupoNome,
}: {
  token: string;
  situacao: SituacaoDoConvite;
  grupoNome: string | null;
}) {
  const { user, isAuthenticated, loading } = useAuth();
  const [entrando, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // A valid link is remembered, so a new account that lands on `/` after
  // confirming its email is sent back here instead of to the naming screen.
  useEffect(() => {
    if (situacao === "valido") lembrarConvitePendente(token);
    else esquecerConvitePendente();
  }, [situacao, token]);

  if (situacao !== "valido") {
    const problema = PROBLEMA_DO_CONVITE[situacao];
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo className="h-12 w-12" />
          <div className="flex flex-col gap-1">
            <h1 className="text-title">{problema.titulo}</h1>
            <p className="text-sm text-default-500">{problema.texto}</p>
          </div>
          <Link href="/" className={linkClass}>
            Ir pro Squadra
          </Link>
        </div>
      </AuthShell>
    );
  }

  const nome = grupoNome ?? "fut";
  const titulo = (
    <>
      Você foi chamado pro <span className="whitespace-nowrap">{nome}</span>
    </>
  );

  if (loading) return <FullScreenLoader />;

  if (!isAuthenticated) {
    return (
      <>
        <AuthErrorWatcher />
        <AuthShell>
          <AuthPanel title={titulo} redirectPath={caminhoDoConvite(token)} />
        </AuthShell>
      </>
    );
  }

  const entrar = () => {
    setErro(null);
    startTransition(async () => {
      const resultado = await aceitarConvite(token);
      if (!resultado.ok) {
        setErro(resultado.message);
        return;
      }
      esquecerConvitePendente();
      window.location.assign(`/g/${resultado.valor.slug}`);
    });
  };

  return (
    <AuthShell>
      <div className="flex flex-col gap-8">
        <div className="flex justify-end">
          <UserMenu />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="h-12 w-12" />
          <div className="flex flex-col gap-1">
            <h1 className="text-title">{titulo}</h1>
            <p className="text-sm text-default-500">
              Entrando como <span className="font-semibold text-foreground">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {erro && <Alert tone="danger">{erro}</Alert>}
          <Button color="primary" size="lg" radius="full" className="w-full" isLoading={entrando} onClick={entrar}>
            {entrando ? "Entrando..." : `Entrar no ${nome}`}
          </Button>
          <p className="text-center text-sm text-default-500">
            Não é isso?{" "}
            <Link href="/" onClick={esquecerConvitePendente} className={linkClass}>
              Ir pro meu fut
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
