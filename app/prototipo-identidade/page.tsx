// PROTOTYPE (#146), never merged: three directions for Squadra's new identity, on one throwaway route.
// /prototipo-identidade?variant=A|B|C&tema=claro|escuro&lista=vagas|lotada
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Prototipo } from "./prototipo";

export const metadata: Metadata = { title: "Protótipo da identidade · Squadra", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  // Never in production, even if this branch were merged by mistake.
  if (process.env.VERCEL_ENV === "production") notFound();
  const { variant, tema, lista } = await searchParams;
  return (
    <Prototipo
      inicial={{
        variante: variant === "B" || variant === "C" ? variant : "A",
        escuro: tema === "escuro",
        lotada: lista === "lotada",
      }}
    />
  );
}
