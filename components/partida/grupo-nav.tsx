"use client";

import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { BrandLockup } from "@/components/ui/logo";

type Aba = "elenco" | "partidas";

/** Header for the Grupo's server-rendered pages: brand, Grupo name and the Elenco / Partidas tabs. */
export function GrupoNav({ slug, nome, aba }: { slug: string; nome: string; aba: Aba }) {
  return (
    <header className="sticky top-0 z-40 border-b border-divider bg-content1/95 shadow-lg backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <BrandLockup compactOnMobile />
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-divider" />
          <span className="truncate text-sm font-bold text-foreground" title={nome}>
            {nome}
          </span>
        </div>
        <UserMenu />
      </div>
      <AbasDoGrupo slug={slug} aba={aba} className="mx-auto max-w-3xl px-3 sm:px-6" />
    </header>
  );
}

/** Elenco / Partidas. Shared with the Elenco page's header. */
export function AbasDoGrupo({ slug, aba, className = "" }: { slug: string; aba: Aba; className?: string }) {
  const abas: { id: Aba; rotulo: string; href: string }[] = [
    { id: "elenco", rotulo: "Elenco", href: `/g/${slug}` },
    { id: "partidas", rotulo: "Partidas", href: `/g/${slug}/partidas` },
  ];
  return (
    <nav aria-label="Seções do fut" className={`flex gap-1 ${className}`}>
      {abas.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          aria-current={a.id === aba ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
            a.id === aba ? "border-accent text-foreground" : "border-transparent text-default-500 hover:text-foreground"
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
