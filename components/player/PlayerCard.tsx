import type { CSSProperties, KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { GK_LABELS, OUTFIELD_LABELS } from "@/lib/constants";
import { getCountryCode, getCountryName, getFlagUrl } from "@/lib/countries";
import { corNoPapel, OVR_BRILHANTE } from "@/lib/stat-color";
import type { Player } from "@/types";

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

/** Up to two letters for a Jogador with no photo: "Café com Leite" → "CL", "Xerife" → "XE". */
export function iniciais(nome: string) {
  const palavras = nome.trim().split(/\s+/).filter((p) => p.length > 2);
  if (palavras.length > 1) return (palavras[0][0] + palavras[palavras.length - 1][0]).toUpperCase();
  return nome.trim().slice(0, 2).toUpperCase();
}

/**
 * The Jogador card, as a figurinha: a white die-cut border around paper card
 * stock (Papel, the same in both themes), the photo in a night-navy window,
 * the OVR as a printed numeral, a navy name band and the attributes as a
 * small table. From OVR 85 it's a "brilhante": a static foil sheen.
 *
 * Every size is in `cqw` (the card is its own container), so one card reads
 * the same in the 2-column album, opened full size and in Você. No hover-only
 * actions: in the album a tap opens it (or ticks it while selecting).
 */
export const PlayerCard = ({ player, isMine = false, isSelected = false, onPress, selecting = false }: PlayerCardProps) => {
  const labels = player.position === "GOL" ? GK_LABELS : OUTFIELD_LABELS;
  const countryCode = getCountryCode(player.nationality);
  const brilhante = player.rating >= OVR_BRILHANTE;

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
      className={`relative mx-auto aspect-[2/3] w-full max-w-[17rem] select-none rounded-[7cqw] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:max-w-64 ${
        onPress ? "cursor-pointer" : ""
      }`}
    >
      {/* The die-cut border: white sticker paper, a little shadow under it. */}
      <div
        className={`absolute inset-0 rounded-[7cqw] bg-paper-borda p-[3cqw] shadow-[0_1px_2px_rgb(0_0_0/0.12),0_8px_24px_-8px_rgb(0_0_0/0.35)] transition-[box-shadow] ${
          isSelected ? "ring-[1.5cqw] ring-accent" : ""
        }`}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[4.5cqw] bg-paper text-paper-foreground">
          {/* Photo window */}
          <div className="relative mx-[4cqw] mt-[4cqw] h-[54%] overflow-hidden rounded-[3.5cqw] bg-paper-foreground">
            {player.image ? (
              <img src={player.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-full w-full items-end justify-center bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.14),transparent_60%),repeating-linear-gradient(90deg,rgb(255_255_255/0.035)_0_12%,transparent_12%_24%)]"
              >
                <span className="text-numeral pb-[6cqw] text-[26cqw] text-paper/90">{iniciais(player.name)}</span>
              </div>
            )}

            {/* OVR and position, printed on a paper tab over the photo's corner */}
            <div className="absolute -left-px -top-px flex flex-col items-center rounded-br-[3.5cqw] bg-paper px-[3cqw] pb-[2cqw] pt-[2.5cqw]">
              <span className="text-numeral text-[17cqw] leading-none">{player.rating}</span>
              <span className="text-[6.5cqw] font-bold leading-tight tracking-wide text-paper-foreground/70">{player.position}</span>
            </div>

            {isMine && (
              // On the photo, so it never covers the attributes.
              <span
                aria-hidden="true"
                className="absolute bottom-[3cqw] left-[3cqw] rounded-full bg-accent px-[4cqw] py-[0.8cqw] text-[6.5cqw] font-bold text-accent-foreground shadow-lg"
              >
                você
              </span>
            )}

            <img
              src={getFlagUrl(countryCode)}
              alt={getCountryName(countryCode)}
              width={24}
              height={16}
              className="absolute right-[3cqw] top-[3cqw] h-[7cqw] w-[10.5cqw] rounded-[1cqw] object-cover ring-[0.8cqw] ring-paper-borda"
            />
          </div>

          {/* Name band */}
          <div className="mt-[4cqw] bg-paper-foreground px-[5cqw] py-[2cqw]">
            <p className="truncate text-center text-[9.5cqw] font-extrabold leading-tight text-paper [font-variation-settings:'wdth'_80]">
              {player.name}
            </p>
          </div>

          {/* Attributes */}
          <dl className="grid flex-1 grid-cols-2 content-center gap-x-[6cqw] px-[6cqw] py-[2.5cqw]" aria-label="Atributos do jogador">
            {ORDEM.map((chave) => (
              <div key={chave} className="flex items-baseline justify-between border-b border-paper-foreground/10 py-[0.6cqw] last:border-0 [&:nth-last-child(2)]:border-0">
                <dt className="text-[5.5cqw] font-semibold tracking-wide text-paper-foreground/60">{labels[chave]}</dt>
                <dd className={`text-numeral text-[7.5cqw] ${corNoPapel(player.attributes[chave])}`}>{player.attributes[chave]}</dd>
              </div>
            ))}
          </dl>

          {brilhante && (
            // Foil: a static sheen across the paper, printed, not animated.
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_18%,rgb(255_255_255/0.55)_30%,rgb(255_214_140/0.35)_40%,rgb(160_205_255/0.35)_52%,rgb(255_255_255/0.4)_60%,transparent_74%)] mix-blend-soft-light"
            />
          )}
        </div>

        {brilhante && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-[1.5cqw] rounded-[5.5cqw] ring-[0.6cqw] ring-paper-ouro/70" />
        )}
      </div>

      {isSelected && (
        <span
          aria-hidden="true"
          className="absolute -left-[2cqw] -top-[2cqw] z-10 flex h-[13cqw] w-[13cqw] items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg"
        >
          <Check className="h-[8cqw] w-[8cqw]" strokeWidth={3} />
        </span>
      )}

    </div>
  );
};
