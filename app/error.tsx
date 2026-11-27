"use client";

import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { TelaDeAviso } from "@/components/ui/tela-de-aviso";

/** A server-rendered page failed to load its data. Trying again re-renders it on the server. */
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const tentarDeNovo = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <TelaDeAviso
      titulo="Não deu pra carregar essa página"
      texto="Confira a conexão e tente de novo."
      tentarDeNovo={tentarDeNovo}
    />
  );
}
