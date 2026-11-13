"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WifiOff } from "lucide-react";
import { useSemConexao } from "@/lib/pwa/conexao";
import { quandoFoiSalvo, salvoEm } from "@/lib/pwa/paginas";

/**
 * With no signal, says so and how old the list on screen is: "Sem conexão.
 * Mostrando a lista de 20h15." Writes are disabled meanwhile (each screen
 * reads `useSemConexao`).
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
    <p role="status" className="mb-5 flex items-center gap-2 rounded-xl bg-warning/15 px-3 py-2 text-sm font-medium text-foreground">
      <WifiOff size={16} aria-hidden="true" className="shrink-0" />
      <span>
        Sem conexão.{" "}
        {quando ? `Mostrando a lista de ${quando}.` : "Você vê o que já estava na tela, mas não dá pra mudar nada."}
      </span>
    </p>
  );
}
