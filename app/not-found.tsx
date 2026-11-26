import type { Metadata } from "next";
import Link from "next/link";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Página não encontrada · Squadra" };

/**
 * Any address the app doesn't have (a mistyped link, an old one). Next sends it
 * with a 404. Inside a fut, an unknown fut or Partida has its own screen.
 */
export default function NaoEncontrada() {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <Surface className="max-w-md flex flex-col gap-4">
        <div>
          <h1 className="text-title">Essa página não existe</h1>
          <p className="text-muted mt-1">O link pode estar errado ou ser antigo.</p>
        </div>
        <Link
          href="/"
          className="inline-flex h-10 items-center self-start rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Ir para o início
        </Link>
      </Surface>
    </div>
  );
}
