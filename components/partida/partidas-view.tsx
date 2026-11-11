"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarPlus, ChevronRight, MapPin } from "lucide-react";
import { criarPartida } from "@/app/actions/partida";
import { GrupoNav } from "@/components/partida/grupo-nav";
import { PartidaForm } from "@/components/partida/partida-form";
import { Button } from "@/components/ui/button";
import type { Participacao } from "@/lib/grupo";
import { estadoDaPartida, formatarInicio, type EstadoDaPartida } from "@/lib/partida";

export type ResumoDaPartida = {
  id: string;
  inicio: string;
  local: string;
  vagas: number;
  cancelada_em: string | null;
  confirmados: number;
};

const ROTULO: Record<EstadoDaPartida, string | null> = { aberta: null, encerrada: "Encerrada", cancelada: "Cancelada" };

/** `/g/<slug>/partidas`: upcoming Partidas first, then past and cancelled ones. */
export function PartidasView({
  grupo,
  partidas,
  podeCriar,
  agora,
}: {
  grupo: Participacao;
  partidas: ResumoDaPartida[];
  podeCriar: boolean;
  /** From the server render, so both sides agree on what's upcoming. */
  agora: number;
}) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const momento = new Date(agora);

  const proximas = partidas
    .filter((p) => estadoDaPartida(p, momento) === "aberta")
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const anteriores = partidas.filter((p) => estadoDaPartida(p, momento) !== "aberta");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GrupoNav slug={grupo.slug} nome={grupo.nome} aba="partidas" />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-3 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-title">Partidas</h1>
          {podeCriar && (
            <Button color="primary" size="sm" startContent={<CalendarPlus size={16} />} onClick={() => setCriando(true)}>
              Nova Partida
            </Button>
          )}
        </div>

        <Secao titulo="Próximas" vazio={podeCriar ? "Nenhuma Partida marcada. Crie a próxima." : "Nenhuma Partida marcada ainda."}>
          {proximas.map((p) => (
            <ItemDaPartida key={p.id} slug={grupo.slug} partida={p} estado="aberta" />
          ))}
        </Secao>

        {anteriores.length > 0 && (
          <Secao titulo="Anteriores">
            {anteriores.map((p) => (
              <ItemDaPartida key={p.id} slug={grupo.slug} partida={p} estado={estadoDaPartida(p, momento)} />
            ))}
          </Secao>
        )}
      </main>

      {criando && (
        <PartidaForm
          titulo="Nova Partida"
          acao="Criar Partida"
          onClose={() => setCriando(false)}
          onSalvo={async (dados) => {
            const resultado = await criarPartida(grupo.slug, grupo.id, dados);
            if (resultado.ok) router.push(`/g/${grupo.slug}/partidas/${resultado.valor.id}`);
            return resultado;
          }}
        />
      )}
    </div>
  );
}

function Secao({ titulo, vazio, children }: { titulo: string; vazio?: string; children: React.ReactNode[] }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-default-500">{titulo}</h2>
      {children.length === 0 ? (
        <p className="text-sm text-default-500">{vazio}</p>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
    </section>
  );
}

function ItemDaPartida({ slug, partida, estado }: { slug: string; partida: ResumoDaPartida; estado: EstadoDaPartida }) {
  const rotulo = ROTULO[estado];
  return (
    <li>
      <Link
        href={`/g/${slug}/partidas/${partida.id}`}
        className={`flex items-center justify-between gap-3 rounded-2xl border border-divider bg-content1 p-4 transition-colors hover:border-primary/50 ${
          estado === "cancelada" ? "opacity-60" : ""
        }`}
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-bold capitalize text-foreground">{formatarInicio(partida.inicio)}</span>
          <span className="flex items-center gap-1 truncate text-sm text-default-500">
            <MapPin size={14} aria-hidden="true" className="shrink-0" />
            {partida.local}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm">
          {rotulo ? (
            <span className="rounded-full bg-default-100 px-2 py-0.5 text-xs font-semibold text-default-600">{rotulo}</span>
          ) : (
            <span className="font-semibold tabular-nums text-foreground">
              {partida.confirmados}/{partida.vagas}
            </span>
          )}
          <ChevronRight size={16} aria-hidden="true" className="text-default-400" />
        </span>
      </Link>
    </li>
  );
}
