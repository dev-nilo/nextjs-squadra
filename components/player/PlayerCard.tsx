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
 * stock, inside a white die-cut border. No decoration that isn't print:
 *
 * - No photo (most of the pelada): no empty photo window. The OVR, printed
 *   big, is the card's face.
 * - A photo is printed in the same ink (a navy/Papel duotone), so phone
 *   pictures of every kind sit together in one album.
 * - The attributes are one ink: the Jogador's two best in full weight, the
 *   rest lighter. It says what they're good at, not a traffic light.
 * - The flag, small, next to the position.
 * - From OVR 85 it's a brilhante: the OVR, the rule and a double frame in
 *   gold ink. Flat, like a printed foil, never animated.
 *
 * Every size is in `cqw` (the card is its own container), so one card reads
 * the same in the 2-column album, opened full size and in Você.
 */
export const PlayerCard = ({ player, isMine = false, isSelected = false, onPress, selecting = false }: PlayerCardProps) => {
  const labels = player.position === "GOL" ? GK_LABELS : OUTFIELD_LABELS;
  const countryCode = getCountryCode(player.nationality);
  const brilhante = player.rating >= OVR_BRILHANTE;
  const fortes = pontosFortes(player.attributes);
  const comFoto = !!player.image;
  const tinta = brilhante ? "text-paper-ouro" : "text-paper-foreground";

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
      className={`relative mx-auto aspect-[2/3] w-full max-w-[17rem] select-none rounded-[6cqw] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:max-w-64 ${
        onPress ? "cursor-pointer" : ""
      }`}
    >
      {/* White die-cut edge, lifted a little off the page. */}
      <div
        className={`absolute inset-0 rounded-[6cqw] bg-paper-borda p-[2.5cqw] shadow-[0_1px_2px_rgb(0_0_0/0.14),0_6px_16px_-6px_rgb(0_0_0/0.3)] ${
          isSelected ? "ring-[1.2cqw] ring-accent" : ""
        }`}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[4cqw] bg-paper text-paper-foreground">
          {comFoto && (
            // Duotone: the photo in grey multiplied onto Papel, then the navy ink lightened in, so black prints navy.
            <div className="relative isolate h-[36%] shrink-0 bg-paper">
              <img src={player.image!} alt="" className="h-full w-full object-cover mix-blend-multiply grayscale contrast-125" />
              <div aria-hidden="true" className="absolute inset-0 bg-paper-foreground mix-blend-lighten" />
            </div>
          )}

          <div className="flex flex-1 flex-col px-[6cqw] pb-[5cqw] pt-[4.5cqw]">
            <div className="flex items-start justify-between gap-[3cqw]">
              <span className={`text-numeral leading-[0.82] ${tinta} ${comFoto ? "text-[20cqw]" : "text-[54cqw] -ml-[1cqw]"}`}>{player.rating}</span>
              <span className="flex items-center gap-[2cqw] pt-[1.5cqw] text-[6cqw] font-semibold text-paper-foreground/60">
                <img
                  src={getFlagUrl(countryCode)}
                  alt={getCountryName(countryCode)}
                  width={24}
                  height={16}
                  className="h-[4.5cqw] w-[6.75cqw] rounded-[0.6cqw] object-cover"
                />
                {POSICAO_POR_EXTENSO[player.position]}
              </span>
            </div>

            <div className="mt-auto flex items-end gap-[2.5cqw]">
              <p className={`${comFoto ? "line-clamp-1" : "line-clamp-2"} min-w-0 text-[9.5cqw] font-bold leading-[1.02] tracking-tight [overflow-wrap:anywhere]`}>{player.name}</p>
              {isMine && (
                <span aria-hidden="true" className="mb-[1cqw] shrink-0 rounded-full bg-accent px-[2.5cqw] py-[0.4cqw] text-[5cqw] font-bold text-accent-foreground">
                  você
                </span>
              )}
            </div>

            <dl
              className={`mt-[3cqw] grid grid-cols-2 gap-x-[8cqw] border-t-[0.6cqw] pt-[2cqw] ${brilhante ? "border-paper-ouro" : "border-paper-foreground"}`}
              aria-label="Atributos do jogador"
            >
              {ORDEM.map((chave) => {
                const forte = fortes.has(chave);
                return (
                  <div key={chave} className="flex items-baseline justify-between py-[0.5cqw]">
                    <dt className="text-[5.5cqw] font-medium text-paper-foreground/55">{labels[chave].toLowerCase()}</dt>
                    <dd
                      className={`text-[7cqw] tabular-nums ${forte ? "font-extrabold text-paper-foreground" : "font-medium text-paper-foreground/55"}`}
                    >
                      {player.attributes[chave]}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

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
