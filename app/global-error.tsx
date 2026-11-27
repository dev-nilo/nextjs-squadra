"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { TelaDeAviso } from "@/components/ui/tela-de-aviso";
import "./globals.css";

/** Last-resort boundary: replaces the root layout when it throws, and reports to Sentry. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased bg-background text-foreground">
        <TelaDeAviso
          titulo="Não deu pra abrir o Squadra"
          texto="Já ficamos sabendo do problema. Tente de novo em instantes."
          tentarDeNovo={reset}
        />
      </body>
    </html>
  );
}
