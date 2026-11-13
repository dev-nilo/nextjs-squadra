"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { MenuDeAcoes, type AcaoDoMenu } from "@/components/ui/menu-de-acoes";
import { GK_LABELS, OUTFIELD_LABELS } from "@/lib/constants";
import { getCountryCode, getCountryName, getFlagUrl } from "@/lib/countries";
import { OVR_BRILHANTE } from "@/lib/stat-color";
import type { Player, PlayerPosition } from "@/types";

interface PlayerCardProps {
  player: Player;
  /** The signed-in user's own Jogador ("você"). */
  isMine?: boolean;
  /** Ticked in the Elenco's "Sortear rápido" mode. */
  isSelected?: boolean;
  /** "Sortear rápido" mode: a tap ticks the card (`onSelect`) instead of turning it. */
  selecting?: boolean;
  onSelect?: () => void;
  /** What this person can do to the card (Editar, Excluir…), in a ⋯ at its corner. Empty or omitted: no ⋯. */
  acoes?: readonly AcaoDoMenu[];
  /** The card on its own (Você): a photo card shows its attributes under the name strip. */
  completa?: boolean;
}

const ORDEM = ["velocidade", "posicionamento", "resistencia", "defesa", "chute", "drible", "passe", "fisico"] as const;
type Atributo = (typeof ORDEM)[number];

const POSICAO_POR_EXTENSO: Record<PlayerPosition, string> = {
  GOL: "goleiro",
  FIX: "fixo",
  ALA: "ala",
  ATA: "atacante",
};

/** The Jogador's two best attributes (the first ones in table order on a tie): what they're good at. */
export function pontosFortes(atributos: Record<Atributo, number>): Set<Atributo> {
  return new Set([...ORDEM].sort((a, b) => atributos[b] - atributos[a]).slice(0, 2));
}

/**
 * The Jogador card, as a figurinha printed in two inks: navy on Papel card
 * stock, inside a white die-cut border. No decoration that isn't print.
 *
 * - No photo (most of the pelada): the OVR, printed huge, is the card's
 *   face, with the name and the attributes under it.
 * - A photo: a real album sticker. The photo fills the card down to the
 *   name strip, printed in the same ink (a navy/Papel duotone), anchored at
 *   the top so the face stays in. Its attributes come up over the photo on
 *   hover (where there's a mouse) or on a tap, which turns the card; another
 *   tap turns it back. In Você (`completa`) they sit under the strip.
 * - The attributes are one ink: the Jogador's two best in full weight, the
 *   rest lighter. It says what they're good at, not a traffic light.
 * - From OVR 85 it's a brilhante: the OVR, the rule and a double frame in
 *   gold ink. Flat, like a printed foil.
 * - The card's actions (Editar, Excluir…) are in a ⋯ at its top-right
 *   corner, a sibling of the card face so it's never a button in a button.
 *
 * Every size is in `cqw` (the card is its own container), so one card reads
 * the same in the 2-column album and in Você.
 */
export const PlayerCard = ({ player, isMine = false, isSelected = false, selecting = false, onSelect, acoes = [], completa = false }: PlayerCardProps) => {
  const [virada, setVirada] = useState(false);
  const labels = player.position === "GOL" ? GK_LABELS : OUTFIELD_LABELS;
  const countryCode = getCountryCode(player.nationality);
  const brilhante = player.rating >= OVR_BRILHANTE;
  const fortes = pontosFortes(player.attributes);
  const comFoto = !!player.image;
  const tinta = brilhante ? "text-paper-ouro" : "text-paper-foreground";
  const regua = brilhante ? "border-paper-ouro" : "border-paper-foreground";

  // What a tap does: tick it while selecting, turn it when it hides its attributes, nothing otherwise.
  const seleciona = selecting && !!onSelect;
  const vira = !seleciona && comFoto && !completa;
  const tocar = seleciona ? onSelect : vira ? () => setVirada((v) => !v) : undefined;
  const mostraNotas = virada && vira;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (tocar && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      tocar();
    }
  };

  const label = `Carta de ${player.name}, ${player.position}, rating ${player.rating}${isSelected ? ", selecionado" : ""}${isMine ? ", você" : player.conta_id ? ", com conta" : ""}`;

  const posicao = (
    <span className="flex items-center gap-[2cqw] text-[6cqw] font-semibold text-paper-foreground/60">
      <img
        src={getFlagUrl(countryCode)}
        alt={getCountryName(countryCode)}
        width={24}
        height={16}
        className="h-[4.5cqw] w-[6.75cqw] shrink-0 rounded-[0.6cqw] object-cover"
      />
      {POSICAO_POR_EXTENSO[player.position]}
    </span>
  );

  const voce = isMine && (
    <span aria-hidden="true" className="shrink-0 rounded-full bg-accent px-[2.5cqw] py-[0.4cqw] text-[5cqw] font-bold text-accent-foreground">
      você
    </span>
  );

  const atributos = (borda: boolean) => (
    <dl className={`grid grid-cols-2 gap-x-[8cqw] ${borda ? `border-t-[0.6cqw] pt-[2cqw] ${regua}` : ""}`} aria-label="Atributos do jogador">
      {ORDEM.map((chave) => {
        const forte = fortes.has(chave);
        return (
          <div key={chave} className="flex items-baseline justify-between py-[0.5cqw]">
            <dt className="text-[5.5cqw] font-medium text-paper-foreground/55">{labels[chave].toLowerCase()}</dt>
            <dd className={`text-[7cqw] tabular-nums ${forte ? "font-extrabold text-paper-foreground" : "font-medium text-paper-foreground/55"}`}>
              {player.attributes[chave]}
            </dd>
          </div>
        );
      })}
    </dl>
  );

  return (
    <div
      style={{ containerType: "inline-size" } as CSSProperties}
      className={`group relative mx-auto w-full max-w-[17rem] select-none sm:max-w-64 ${comFoto && completa ? "" : "aspect-[2/3]"}`}
    >
      {/* The card face: what a tap turns or ticks. */}
      <div
        role={tocar ? "button" : "img"}
        tabIndex={tocar ? 0 : undefined}
        aria-pressed={seleciona ? isSelected : undefined}
        aria-expanded={vira ? virada : undefined}
        aria-label={vira ? `${label}. Toque para ver as notas` : label}
        onClick={tocar}
        onKeyDown={tocar ? handleKeyDown : undefined}
        className={`relative h-full rounded-[6cqw] bg-paper-borda p-[2.5cqw] shadow-[0_1px_2px_rgb(0_0_0/0.14),0_6px_16px_-6px_rgb(0_0_0/0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          isSelected ? "ring-[1.2cqw] ring-accent" : ""
        } ${tocar ? "cursor-pointer" : ""}`}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[4cqw] bg-paper text-paper-foreground">
          {comFoto ? (
            <>
              <div className={`relative isolate bg-paper ${completa ? "aspect-[4/5]" : "min-h-0 flex-1"}`}>
                {/* Duotone: the photo in grey multiplied onto Papel, then the navy ink lightened in, so black prints navy. */}
                <img src={player.image!} alt="" className="absolute inset-0 h-full w-full object-cover object-top mix-blend-multiply grayscale contrast-125" />
                <div aria-hidden="true" className="absolute inset-0 bg-paper-foreground mix-blend-lighten" />
                {vira && (
                  // The back of the sticker: the attributes over the photo, on hover or after a tap.
                  <div
                    aria-hidden={!mostraNotas}
                    className={`absolute inset-0 flex flex-col justify-center bg-paper px-[6cqw] transition-opacity duration-150 motion-reduce:transition-none [@media(hover:hover)]:group-hover:opacity-100 ${
                      mostraNotas ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {atributos(false)}
                  </div>
                )}
              </div>
              {/* The rule under the photo; a brilhante's stops inside its gold frame. */}
              <div aria-hidden="true" className={`shrink-0 border-t-[0.6cqw] ${regua} ${brilhante ? "mx-[3cqw]" : ""}`} />
              <div className="flex shrink-0 items-center gap-[3.5cqw] px-[5cqw] py-[3.5cqw]">
                <span className={`text-numeral text-[22cqw] leading-[0.82] ${tinta}`}>{player.rating}</span>
                <div className="flex min-w-0 flex-col gap-[1cqw]">
                  <span className="flex min-w-0 items-center gap-[2cqw]">
                    <span className="truncate text-[9cqw] font-bold leading-[1.05] tracking-tight">{player.name}</span>
                    {voce}
                  </span>
                  {posicao}
                </div>
              </div>
              {completa && <div className="px-[6cqw] pb-[5cqw]">{atributos(true)}</div>}
            </>
          ) : (
            <div className="flex flex-1 flex-col px-[6cqw] pb-[5cqw] pt-[4.5cqw]">
              <span className={`text-numeral -ml-[1cqw] text-[54cqw] leading-[0.82] ${tinta}`}>{player.rating}</span>
              <span className="mt-[2.5cqw]">{posicao}</span>
              <div className="mt-auto flex items-end gap-[2.5cqw]">
                <p className="line-clamp-2 min-w-0 text-[9.5cqw] font-bold leading-[1.02] tracking-tight [overflow-wrap:anywhere]">{player.name}</p>
                {voce && <span className="mb-[1cqw]">{voce}</span>}
              </div>
              <div className="mt-[3cqw]">{atributos(true)}</div>
            </div>
          )}

          {brilhante && (
            // The brilhante's frame: a double rule in gold ink, inside the paper.
            <div aria-hidden="true" className="pointer-events-none absolute inset-[1.8cqw] rounded-[2.5cqw] border-[1.2cqw] border-double border-paper-ouro" />
          )}
        </div>
      </div>

      {acoes.length > 0 && !selecting && (
        <div className="absolute right-[5cqw] top-[5cqw] z-10">
          <MenuDeAcoes
            nome={`Ações da carta de ${player.name}`}
            rotulo={`Ações da carta de ${player.name}`}
            acoes={acoes}
            classeDoBotao="rounded-full bg-paper-borda/90 text-paper-foreground shadow-sm hover:bg-paper-borda"
          />
        </div>
      )}

      {isSelected && (
        <span
          aria-hidden="true"
          className="absolute -left-[2cqw] -top-[2cqw] z-10 flex h-[12cqw] w-[12cqw] items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg"
        >
          <Check className="h-[7cqw] w-[7cqw]" strokeWidth={3} />
        </span>
      )}
    </div>
  );
};
