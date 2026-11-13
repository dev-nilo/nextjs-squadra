"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { excluirFut, renomearFut } from "@/app/actions/pessoas";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Participacao } from "@/lib/grupo";
import { esquecerPaginas } from "@/lib/pwa/paginas";
import { ConfirmarComNome } from "./confirmar-com-nome";

/** The dono's controls over the fut itself: rename it, delete it. */
export function ZonaDePerigo({ grupo }: { grupo: Participacao }) {
  const router = useRouter();
  const [nome, setNome] = useState(grupo.nome);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const [excluindo, setExcluindo] = useState(false);
  const mudou = nome.trim() !== grupo.nome && nome.trim().length > 0;

  return (
    <section aria-label="O fut" className="flex flex-col gap-4">
      <h2 className="text-label">O fut</h2>

      <form
        className="flex flex-col gap-2 rounded-2xl border border-divider bg-content1 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!mudou) return;
          setErro(null);
          startTransition(async () => {
            const resultado = await renomearFut(grupo.slug, nome);
            if (!resultado.ok) {
              setErro(resultado.message);
              return;
            }
            setNome(resultado.valor.nome);
            toast.success("Nome do fut salvo");
          });
        }}
      >
        {erro && <Alert tone="danger">{erro}</Alert>}
        <div className="flex items-end gap-2">
          <Input label="Nome do fut" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} size="sm" className="min-w-0 flex-1" />
          <Button type="submit" size="sm" color="primary" isDisabled={!mudou} isLoading={pendente}>
            Salvar
          </Button>
        </div>
        <p className="text-xs text-default-500">O endereço do fut e os links de convite continuam os mesmos.</p>
      </form>

      <div className="flex flex-col items-start gap-3 rounded-2xl border border-danger/40 p-4">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-foreground">Excluir o fut</p>
          <p className="text-sm text-default-500">Apaga o elenco, as partidas, os times e as fotos, pra todo mundo. Não dá pra desfazer.</p>
        </div>
        <Button variant="flat" color="danger" startContent={<Trash2 size={16} />} onClick={() => setExcluindo(true)}>
          Excluir o fut
        </Button>
      </div>

      {excluindo && (
        <ConfirmarComNome
          titulo={`Excluir o ${grupo.nome}?`}
          explicacao="Some tudo: elenco, partidas, times, frequência e fotos. Ninguém mais entra pelos links de convite. Não dá pra desfazer."
          nome={grupo.nome}
          acao="Excluir o fut"
          perigo
          onClose={() => setExcluindo(false)}
          onConfirmar={async (digitado) => {
            // What was typed goes along: the database checks it again.
            const resultado = await excluirFut(grupo.slug, digitado);
            if (!resultado.ok) return resultado.message;
            await esquecerPaginas();
            toast.success(`${resultado.valor.nome} foi excluído`);
            // "/" opens the next fut you're in, or "Dê um nome pro seu fut".
            router.replace("/");
            return null;
          }}
        />
      )}
    </section>
  );
}
