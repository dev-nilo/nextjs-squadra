import type { CSSProperties, KeyboardEvent } from "react";
import { Check } from "lucide-react";
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
  /** In the Elenco album: what a tap does (open the card, or tick it while selecting). Omitted: a static card. */
  onPress?: () => void;
  /** "Sortear rápido" mode: the card is a toggle. */
  selecting?: boolean;
  /**
   * The card looked at on its own (opened, or in Você): a photo card grows
   * downwards to show its attributes. In the album a photo card shows only
   * the photo, the OVR, the name and the position.
   */
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
 *   name strip (OVR, name, position), printed in the same ink (a navy/Papel
 *   duotone) so phone pictures of every kind sit together, anchored at the
 *   top so the face stays in. Its attributes show when the card is
 *   `completa` (opened, or in Você): the sticker grows downwards.
 * - The attributes are one ink: the Jogador's two best in full weight, the
 *   rest lighter. It says what they're good at, not a traffic light.
 * - From OVR 85 it's a brilhante: the OVR, the rule and a double frame in
 *   gold ink. Flat, like a printed foil, never animated.
 *
 * Every size is in `cqw` (the card is its own container), so one card reads
 * the same in the 2-column album, opened full size and in Você.
 */
export const PlayerCard = ({ player, isMine = false, isSelected = false, onPress, selecting = false, completa = false }: PlayerCardProps) => {
  const labels = player.position === "GOL" ? GK_LABELS : OUTFIELD_LABELS;
  const countryCode = getCountryCode(player.nationality);
  const brilhante = player.rating >= OVR_BRILHANTE;
  const fortes = pontosFortes(player.attributes);
  const comFoto = !!player.image;
  // An opened photo card has no fixed shape: it's the sticker plus its attributes.
  const altura = comFoto && completa ? "" : "aspect-[2/3]";
  const tinta = brilhante ? "text-paper-ouro" : "text-paper-foreground";

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

  const atributos = (
    <dl
      className={`grid grid-cols-2 gap-x-[8cqw] border-t-[0.6cqw] pt-[2cqw] ${brilhante ? "border-paper-ouro" : "border-paper-foreground"}`}
      aria-label="Atributos do jogador"
    >
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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (onPress && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onPress();
    }
  };

  const label = `Carta de ${player.name}, ${player.position}, rating ${player.rating}${isSelected ? ", selecionado" : ""}${isMine ? ", você" : player.conta_id ? ", com conta" : ""}`;

  return (
    <div
      role={onPress ? "button" : "img"}
      tabIndex={onPress ? 0 : undefined}
      aria-pressed={onPress && selecting ? isSelected : undefined}
      aria-label={label}
      onClick={onPress}
      onKeyDown={onPress ? handleKeyDown : undefined}
      style={{ containerType: "inline-size" } as CSSProperties}
      className={`relative mx-auto w-full max-w-[17rem] select-none rounded-[6cqw] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:max-w-64 ${altura} ${
        onPress ? "cursor-pointer" : ""
      }`}
    >
      {/* White die-cut edge, lifted a little off the page. */}
      <div
        className={`relative h-full rounded-[6cqw] bg-paper-borda p-[2.5cqw] shadow-[0_1px_2px_rgb(0_0_0/0.14),0_6px_16px_-6px_rgb(0_0_0/0.3)] ${
          isSelected ? "ring-[1.2cqw] ring-accent" : ""
        }`}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[4cqw] bg-paper text-paper-foreground">
          {comFoto ? (
            <>
              {/* Duotone: the photo in grey multiplied onto Papel, then the navy ink lightened in, so black prints navy. */}
              <div className={`relative isolate bg-paper ${completa ? "aspect-[4/5]" : "min-h-0 flex-1"}`}>
                <img src={player.image!} alt="" className="absolute inset-0 h-full w-full object-cover object-top mix-blend-multiply grayscale contrast-125" />
                <div aria-hidden="true" className="absolute inset-0 bg-paper-foreground mix-blend-lighten" />
              </div>
              <div
                className={`flex shrink-0 items-center gap-[3.5cqw] border-t-[0.6cqw] px-[5cqw] py-[3.5cqw] ${brilhante ? "border-paper-ouro" : "border-paper-foreground"}`}
              >
                <span className={`text-numeral text-[22cqw] leading-[0.82] ${tinta}`}>{player.rating}</span>
                <div className="flex min-w-0 flex-col gap-[1cqw]">
                  <span className="flex min-w-0 items-center gap-[2cqw]">
                    <span className="truncate text-[9cqw] font-bold leading-[1.05] tracking-tight">{player.name}</span>
                    {voce}
                  </span>
                  {posicao}
                </div>
              </div>
              {completa && <div className="px-[6cqw] pb-[5cqw]">{atributos}</div>}
            </>
          ) : (
            <div className="flex flex-1 flex-col px-[6cqw] pb-[5cqw] pt-[4.5cqw]">
              <div className="flex items-start justify-between gap-[3cqw]">
                <span className={`text-numeral -ml-[1cqw] text-[54cqw] leading-[0.82] ${tinta}`}>{player.rating}</span>
                <span className="pt-[1.5cqw]">{posicao}</span>
              </div>
              <div className="mt-auto flex items-end gap-[2.5cqw]">
                <p className="line-clamp-2 min-w-0 text-[9.5cqw] font-bold leading-[1.02] tracking-tight [overflow-wrap:anywhere]">{player.name}</p>
                {voce && <span className="mb-[1cqw]">{voce}</span>}
              </div>
              <div className="mt-[3cqw]">{atributos}</div>
            </div>
          )}

          {brilhante && (
            // The brilhante's frame: a double rule in gold ink, inside the paper.
            <div aria-hidden="true" className="pointer-events-none absolute inset-[1.8cqw] rounded-[2.5cqw] border-[1.2cqw] border-double border-paper-ouro" />
          )}
        </div>
      </div>

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
