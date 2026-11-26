"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { NomearGrupo } from "@/components/grupo/nomear-grupo";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { TelaDeAviso } from "@/components/ui/tela-de-aviso";
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
    <TelaDeAviso
      titulo="Não deu pra abrir seu fut"
      texto="Confira a conexão e tente de novo."
      tentarDeNovo={() => router.refresh()}
      extra={<UserMenu />}
    />
  );
}
