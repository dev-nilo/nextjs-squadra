"use client";

import { useAuth } from "@/hooks/use-auth";
import { ehContaDemo } from "@/lib/demo";

/** While signed into the shared demo account: everything is fair game, and it all comes back overnight. */
export function AvisoDemo() {
  const { user } = useAuth();
  if (!ehContaDemo(user)) return null;

  return (
    <p role="note" className="bg-primary/10 px-4 py-2 text-center text-xs text-foreground">
      <strong>Conta demo.</strong> Mexa à vontade: confirme presença, sorteie os Times, edite o Elenco. Tudo volta ao normal toda noite.
    </p>
  );
}
