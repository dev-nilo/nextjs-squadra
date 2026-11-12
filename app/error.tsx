"use client";

import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Surface className="max-w-md flex flex-col gap-4">
        <div>
          <h1 className="text-title">Não deu pra carregar essa página</h1>
          <p className="text-muted mt-1">Confira a conexão e tente de novo.</p>
        </div>
        <Button color="primary" radius="full" className="self-start" onClick={tentarDeNovo}>
          Tentar de novo
        </Button>
      </Surface>
    </div>
  );
}
