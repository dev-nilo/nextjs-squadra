"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import "./globals.css";

/** Last-resort boundary: replaces the root layout when it throws, and reports to Sentry. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-background p-4 font-sans text-foreground">
        <main className="flex max-w-sm flex-col items-center gap-4 text-center">
          <Logo className="h-12 w-12" />
          <h1 className="text-xl font-black">Algo deu errado</h1>
          <p className="text-sm text-default-500">
            O erro já foi registrado. Tente de novo; se continuar, recarregue a página.
          </p>
          <Button color="primary" onClick={reset}>
            Tentar de novo
          </Button>
        </main>
      </body>
    </html>
  );
}
