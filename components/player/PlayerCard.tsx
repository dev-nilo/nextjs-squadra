import { Player } from "@/types";
import { GK_LABELS, OUTFIELD_LABELS } from "@/lib/constants";
import { getStatColor } from "@/lib/stat-color";
import { getCountryCode, getCountryName, getFlagUrl } from "@/lib/countries";
import { CheckCircle2, User } from "lucide-react";

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

/**
 * The Jogador card. No hover-only actions: in the album a tap opens it (or
 * ticks it while selecting for the quick Sorteio); its actions live in the
 * opened card.
 */
export const PlayerCard = ({ player, isMine = false, isSelected = false, onPress, selecting = false }: PlayerCardProps) => {
    const labels = player.position === "GOL" ? GK_LABELS : OUTFIELD_LABELS;
    const attributes = player.attributes;
    const countryCode = getCountryCode(player.nationality);
    const countryName = getCountryName(countryCode);

    const attributesList = [
        {
            key: "velocidade",
            label: labels.velocidade,
            value: attributes.velocidade,
        },
        {
            key: "posicionamento",
            label: labels.posicionamento,
            value: attributes.posicionamento,
        },
        {
            key: "resistencia",
            label: labels.resistencia,
            value: attributes.resistencia,
        },
        { key: "defesa", label: labels.defesa, value: attributes.defesa },
        { key: "chute", label: labels.chute, value: attributes.chute },
        { key: "drible", label: labels.drible, value: attributes.drible },
        { key: "passe", label: labels.passe, value: attributes.passe },
        { key: "fisico", label: labels.fisico, value: attributes.fisico },
    ];

    const handleKeyDown = (e: React.KeyboardEvent) => {
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
            className={`
                relative w-full max-w-[17rem] sm:max-w-64 mx-auto aspect-[2/3]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                ${onPress ? "cursor-pointer select-none" : ""}
            `}
        >
            {/* Selection Indicator */}
            {isSelected && (
                <div
                    className="absolute top-1 left-1 sm:-top-2 sm:-left-2 z-50 bg-primary text-primary-foreground p-1 rounded-full shadow-lg animate-scale-in"
                    aria-hidden="true"
                >
                    <CheckCircle2 size={22} />
                </div>
            )}

            {isMine && (
                <span
                    className="absolute -bottom-2 left-1/2 z-50 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-accent-foreground shadow-lg"
                    aria-hidden="true"
                >
                    Você
                </span>
            )}

            {/* Card Container */}
            <div
                className={`
                    w-full h-full 
                    bg-gradient-to-br from-content1 via-content1 to-default-200/20 
                    border-2 ${isSelected ? "border-primary" : "border-divider/30"} 
                    rounded-t-card rounded-b-xl 
                    shadow-2xl overflow-hidden 
                `}
            >
                {/* Background Textures */}
                <div
                    className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent pointer-events-none"
                    aria-hidden="true"
                />
                
                <div className="flex h-[50%] relative z-10 p-3 sm:p-4 items-start justify-between bg-transparent">
                    {/* Stats Column */}
                    <div className="flex flex-col items-center justify-start pt-1 sm:pt-2 w-1/4 gap-0.5 sm:gap-1">
                        <span className="text-3xl sm:text-4xl font-black text-primary tracking-tighter leading-none">
                            {player.rating}
                        </span>
                        <span className="text-base sm:text-lg font-bold text-foreground/80 tracking-wide">
                            {player.position}
                        </span>
                        <div className="w-8 h-px bg-primary/50 my-1 sm:my-2" aria-hidden="true" />
                        <img
                            src={getFlagUrl(countryCode)}
                            alt={countryName}
                            width={24}
                            height={16}
                            className="w-6 h-4 object-cover shadow-sm opacity-80 rounded-sm"
                        />
                    </div>

                    {/* Player Image */}
                    <div className="w-3/4 h-full pl-2 sm:pl-4 flex items-center justify-center">
                        {player.image ? (
                            <img
                                src={player.image}
                                alt=""
                                className="h-full w-full object-cover rounded-xl shadow-sm"
                            />
                        ) : (
                            <User
                                size={64}
                                className="text-default-400"
                                aria-hidden="true"
                            />
                        )}
                    </div>
                </div>

                <div className="p-0 flex flex-col justify-between overflow-hidden bg-transparent z-10">
                    {/* Player Name Section */}
                    <div className="flex flex-col items-center px-3 sm:px-4">
                        <div
                            className="w-[90%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                            aria-hidden="true"
                        />
                        <h2 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight py-1.5 sm:py-2 truncate max-w-[90%] text-center">
                            {player.name}
                        </h2>
                        <div
                            className="w-[90%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                            aria-hidden="true"
                        />
                    </div>

                    {/* Attributes Grid */}
                    <div
                        className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-0.5 sm:gap-y-1 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold flex-1"
                        role="list"
                        aria-label="Atributos do jogador"
                    >
                        {attributesList.map(({ key, label, value }) => (
                            <div
                                key={key}
                                className="flex justify-between items-center"
                                role="listitem"
                            >
                                <span className="text-default-500 w-8">{label}</span>
                                <span className={getStatColor(value)}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
