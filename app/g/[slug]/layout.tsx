import type { Viewport } from "next";
import { FutShell } from "@/components/fut/fut-shell";
import { EntrarParaVer, FutNaoEncontrado } from "@/components/partida/entrar-para-ver";
import { carregarGrupo, carregarParticipacoes } from "@/lib/grupo-server";

/**
 * The phone's status bar in the header's color (content1), so the two read as
 * one bar; the rest of the app keeps the canvas color (app/layout.tsx).
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#1B2A4C" },
  ],
};

/**
 * Every page of a fut shares this frame: header with the fut switcher, the
 * Partidas / Elenco / Você tabs, one width. Without a session or access, the
 * whole fut shows the sign-in or not-found screen instead (its pages render
 * nothing in that case).
 */
export default async function FutLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await carregarGrupo(slug);
  if (ctx.status === "sem-sessao") return <EntrarParaVer />;
  if (ctx.status === "nao-encontrado") return <FutNaoEncontrado />;

  const participacoes = await carregarParticipacoes(ctx.supabase, ctx.user.id);
  return (
    <FutShell grupo={ctx.grupo} participacoes={participacoes ?? [ctx.grupo]}>
      {children}
    </FutShell>
  );
}
