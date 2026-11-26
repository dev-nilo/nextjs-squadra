"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSemConexao } from "@/lib/pwa/conexao";
import { quandoFoiSalvo, salvoEm } from "@/lib/pwa/paginas";

/**
 * With no signal, says so and how old the list on screen is: "Sem conexão.
 * Mostrando a lista de 20h15." Writes are disabled meanwhile (each screen
 * reads `useSemConexao`). It stays under the header while the page scrolls,
 * so an old list is never read as a live one.
 */
export function SemConexao() {
  const semConexao = useSemConexao();
  const pathname = usePathname();
  const [quando, setQuando] = useState<string | null>(null);

  useEffect(() => {
    if (!semConexao) return;
    let ativo = true;
    void salvoEm(pathname).then((ms) => {
      if (ativo) setQuando(ms ? quandoFoiSalvo(ms, Date.now()) : null);
    });
    return () => {
      ativo = false;
    };
  }, [semConexao, pathname]);

  if (!semConexao) return null;
  return (
    // Under the sticky header (h-14 and its border, below the status bar when installed).
    // The canvas under the tint, so the list doesn't show through as it scrolls by.
    <div className="sticky top-[calc(3.5rem+1px+env(safe-area-inset-top))] z-30 baixa:top-[calc(3rem+1px+env(safe-area-inset-top))] mb-5 rounded-xl bg-background">
      <div className="flex items-center gap-2 rounded-xl bg-warning/15 px-3 py-2">
        <WifiOff size={16} aria-hidden="true" className="shrink-0" />
        <p role="status" className="min-w-0 flex-1 text-sm font-medium text-foreground">
          Sem conexão.{" "}
          {quando ? `Mostrando a lista de ${quando}.` : "Você vê o que já estava na tela, mas não dá pra mudar nada."}
        </p>
        <Button variant="light" size="sm" className="-my-1" onClick={() => location.reload()}>
          Tentar de novo
        </Button>
      </div>
    </div>
  );
}
