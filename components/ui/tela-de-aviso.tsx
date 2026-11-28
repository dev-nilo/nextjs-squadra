import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

/**
 * The one layout for a screen that stands in for a page: a failed load, an
 * address that doesn't exist, a fut you're not in, a dead invite. The mark, one
 * title, one sentence on what happened, then the way out. "Tentar de novo"
 * when trying again can help, and always a link home, so the installed app
 * never ends in a dead end. public/offline.html is the same screen, by hand.
 */
export function TelaDeAviso({
  titulo,
  texto,
  tentarDeNovo,
  inicio = "Ir pro meu fut",
  aoIrProInicio,
  extra,
  ...data
}: {
  titulo: React.ReactNode;
  texto: React.ReactNode;
  /** Shown as the main action when trying again can work (a failed load, not a wrong link). */
  tentarDeNovo?: () => void;
  /** The link to `/`, which opens the person's fut (or the sign-in screen). */
  inicio?: string;
  aoIrProInicio?: () => void;
  /** Something the person may need from here, e.g. the account menu to sign out. */
  extra?: React.ReactNode;
} & { [atributo: `data-${string}`]: string }) {
  return (
    <div
      {...data}
      className="margem-lateral flex min-h-dvh items-center justify-center bg-background pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-foreground"
    >
      <main className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <Logo className="h-12 w-12" />
        <div className="flex flex-col gap-1">
          <h1 className="text-title text-balance">{titulo}</h1>
          <p className="text-muted text-balance">{texto}</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          {tentarDeNovo && (
            <Button color="primary" size="lg" radius="full" onClick={tentarDeNovo}>
              Tentar de novo
            </Button>
          )}
          <Link
            href="/"
            onClick={aoIrProInicio}
            className="area-de-toque rounded-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
          >
            {inicio}
          </Link>
        </div>
        {extra}
      </main>
    </div>
  );
}
