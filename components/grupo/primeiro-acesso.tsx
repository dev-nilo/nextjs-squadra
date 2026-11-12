"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { NomearGrupo } from "@/components/grupo/nomear-grupo";
import { Button } from "@/components/ui/button";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { Surface } from "@/components/ui/surface";
import { caminhoDoConvite, convitePendente } from "@/lib/convite";
import type { Participacao } from "@/lib/grupo";

const semAssinatura = () => () => {};

/**
 * `/` for a signed-in user with no Grupo. Someone who opened an invite goes
 * back to it; anyone else names their Grupo first.
 */
export function PrimeiroAcesso() {
  const router = useRouter();
  // The pending invite lives in this browser: undefined while rendering on the server.
  const convite = useSyncExternalStore(semAssinatura, convitePendente, () => undefined);

  useEffect(() => {
    if (convite) window.location.replace(caminhoDoConvite(convite));
  }, [convite]);

  const abrir = useCallback((grupo: Participacao) => router.replace(`/g/${grupo.slug}`), [router]);

  if (convite !== null) return <FullScreenLoader />;
  return <NomearGrupo onCriado={abrir} />;
}

/** The user's Grupos couldn't be read (the database or the network failed). */
export function ErroAoAbrirFut() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Surface className="max-w-md flex flex-col gap-4">
        <div>
          <h1 className="text-title">Não deu pra abrir seu fut</h1>
          <p className="text-muted mt-1">Confira a conexão e tente de novo.</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button color="primary" radius="full" onClick={() => router.refresh()}>
            Tentar de novo
          </Button>
          <UserMenu />
        </div>
      </Surface>
    </div>
  );
}
