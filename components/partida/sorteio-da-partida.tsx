"use client";

import { useState, useTransition } from "react";
import { Lock, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { moverNoSorteio, publicarSorteio, sortearDaPartida } from "@/app/actions/sorteio";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useFocoAoMover } from "@/hooks/use-foco-ao-mover";
import { MoverJogador } from "@/components/team/mover-jogador";
import { getTeamPresentation } from "@/lib/constants";
import { membrosPorNome } from "@/lib/sorteio";
import {
  cabeNoSorteio,
  MIN_TIMES,
  minimoDeConfirmados,
  OPCOES_DE_TIMES,
  sorteioEstaEmDia,
  timesDoSorteio,
  type SorteioSalvo,
} from "@/lib/sorteio-partida";

/** The Partida's Sorteio: drawn and adjusted by the dono and admins, read-only for everyone once published. */
export function SorteioDaPartida({
  slug,
  partidaId,
  sorteio,
  confirmados,
  podeGerir,
  aberta,
  onMudou,
}: {
  slug: string;
  partidaId: string;
  sorteio: SorteioSalvo | null;
  /** Ids of the confirmed Jogadores right now. */
  confirmados: string[];
  podeGerir: boolean;
  /** Not cancelled. */
  aberta: boolean;
  onMudou: () => Promise<void>;
}) {
  const [numTimes, setNumTimes] = useState(String(sorteio?.times.length ?? MIN_TIMES));
  const [pendente, startTransition] = useTransition();
  const foco = useFocoAoMover();

  const publicado = !!sorteio?.publicado_em;
  const emDia = sorteio ? sorteioEstaEmDia(sorteio.times, confirmados) : true;
  const times = sorteio ? timesDoSorteio(sorteio.times) : [];
  const editavel = podeGerir && aberta && !!sorteio && !publicado;

  const executar = (acao: () => Promise<{ ok: true } | { ok: false; message: string }>, aviso?: string) =>
    startTransition(async () => {
      const resultado = await acao();
      if (!resultado.ok) {
        toast.error("Não deu certo", { description: resultado.message });
        return;
      }
      if (aviso) toast.success(aviso);
      await onMudou();
    });

  // Members see the Times once they're published, and nothing before.
  if (!podeGerir && !sorteio) return null;

  return (
    <section aria-label="Sorteio" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-label">Times</h2>
        {sorteio && (
          <span className="flex items-center gap-1 rounded-full bg-default-100 px-2 py-0.5 text-xs font-semibold text-default-600">
            {publicado ? (
              <>
                <Lock size={12} aria-hidden="true" /> Publicados
              </>
            ) : (
              "Rascunho: só quem organiza vê"
            )}
          </span>
        )}
      </div>

      {podeGerir && aberta && !publicado && (
        <div className="flex flex-wrap items-end gap-2">
          <Select
            label="Quantos times"
            size="sm"
            value={numTimes}
            onChange={(e) => setNumTimes(e.target.value)}
            className="w-36"
          >
            {OPCOES_DE_TIMES.map((n) => (
              <option key={n} value={n} disabled={!cabeNoSorteio(confirmados.length, n)}>
                {n} times
              </option>
            ))}
          </Select>
          <Button
            color="secondary"
            size="sm"
            startContent={<Shuffle size={16} />}
            isLoading={pendente}
            isDisabled={!cabeNoSorteio(confirmados.length, Number(numTimes))}
            onClick={() => {
              foco.soltar();
              executar(() => sortearDaPartida(slug, partidaId, Number(numTimes)), "Times sorteados");
            }}
          >
            {sorteio ? "Sortear de novo" : "Sortear times"}
          </Button>
          {sorteio && (
            <Button
              color="primary"
              size="sm"
              isDisabled={pendente || !emDia}
              onClick={() => {
                if (!window.confirm("Publicar os times? Depois disso todo mundo vê e não dá mais pra mudar.")) return;
                foco.soltar();
                executar(() => publicarSorteio(slug, partidaId), "Times publicados");
              }}
            >
              Publicar times
            </Button>
          )}
        </div>
      )}

      {podeGerir && !sorteio && !cabeNoSorteio(confirmados.length, MIN_TIMES) && (
        <p className="text-sm text-default-500">
          O sorteio precisa de pelo menos {minimoDeConfirmados(MIN_TIMES)} confirmados.
        </p>
      )}

      {sorteio && !emDia && !publicado && (
        <Alert tone="warning">A lista de confirmados mudou desde o sorteio. Sorteie de novo antes de publicar.</Alert>
      )}

      {times.length > 0 && (
        // Two Times side by side only when this column is wide enough, not the screen:
        // beside the list on a laptop the column is narrow.
        <div className="[container-type:inline-size]">
          <ol className="grid gap-3 [@container(min-width:30rem)]:grid-cols-2">
            {times.map((time, indice) => (
              <li key={time.name} className="flex flex-col gap-2 rounded-2xl border border-divider bg-content1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-bold text-foreground">
                    <span aria-hidden="true" className={`h-3 w-3 rounded-full ${getTeamPresentation(indice).crest}`} />
                    {time.name}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-default-500">OVR médio {time.avg}</span>
                </div>
                <ul className="flex flex-col gap-1" aria-label={`Jogadores do ${time.name}`}>
                  {membrosPorNome(time.members).map((jogador) => (
                    <li key={jogador.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-foreground">
                        {jogador.name} <span className="text-default-500">{jogador.position}</span>
                      </span>
                      {editavel && emDia && sorteio && (
                        <MoverJogador
                          ref={foco.refDo(jogador.id)}
                          nome={jogador.name}
                          indice={indice}
                          times={times}
                          disabled={pendente}
                          onMover={(destino) => {
                            foco.marcar(jogador.id);
                            executar(() => moverNoSorteio(slug, partidaId, jogador.id, destino, sorteio.sorteado_em));
                          }}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
