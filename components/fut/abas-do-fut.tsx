"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleUserRound, Users, type LucideIcon } from "lucide-react";
import { ABAS, abaDoCaminho, caminhoDaAba, type Aba } from "@/lib/navegacao";

const ICONE: Record<Aba, LucideIcon> = { partidas: CalendarDays, elenco: Users, voce: CircleUserRound };

/** Desktop and tablet: the tabs on the right of the header, underlined in Colete when active. */
export function AbasNoTopo({ slug }: { slug: string }) {
  const ativa = abaDoCaminho(usePathname() ?? "");
  return (
    <nav aria-label="Seções do fut" className="ml-auto hidden h-full items-stretch md:flex">
      {ABAS.map((a) => (
        <Link
          key={a.id}
          href={caminhoDaAba(slug, a.id)}
          aria-current={a.id === ativa ? "page" : undefined}
          className={`-mb-px flex items-center border-b-2 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
            a.id === ativa ? "border-accent text-foreground" : "border-transparent text-default-500 hover:text-foreground"
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Phones: the tab bar at the bottom, where the thumb is. Clears the iPhone's
 * home indicator; the page leaves room for it (see FutShell).
 */
export function BarraDeAbas({ slug }: { slug: string }) {
  const ativa = abaDoCaminho(usePathname() ?? "");
  return (
    <nav
      aria-label="Seções do fut"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-content1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-3">
        {ABAS.map((a) => {
          const Icone = ICONE[a.id];
          const atual = a.id === ativa;
          return (
            <li key={a.id}>
              <Link
                href={caminhoDaAba(slug, a.id)}
                aria-current={atual ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                  atual ? "text-foreground" : "text-default-500"
                }`}
              >
                {atual && <span aria-hidden="true" className="absolute top-0 h-1 w-8 rounded-b-full bg-accent" />}
                <Icone size={22} strokeWidth={atual ? 2.4 : 1.8} aria-hidden="true" />
                {a.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
