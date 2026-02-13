import { Player } from "@/types";
import { GK_LABELS, OUTFIELD_LABELS } from "@/lib/constants";
import { getStatColor } from "@/lib/player-utils";
import { CheckCircle2, Pencil, Trash2, User, Shield } from "lucide-react";

interface PlayerCardProps {
    player: Player;
    onDelete: (id: string) => void;
    onEdit: (player: Player) => void;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
}

export const PlayerCard = ({
    player,
    onDelete,
    onEdit,
    isSelected,
    onToggleSelect,
}: PlayerCardProps) => {
    const labels = player.position === "GOL" ? GK_LABELS : OUTFIELD_LABELS;

    const attributesList = [
        {
            key: "velocidade",
            label: labels.velocidade,
            value: player.attributes.velocidade,
        },
        {
            key: "posicionamento",
            label: labels.posicionamento,
            value: player.attributes.posicionamento,
        },
        {
            key: "resistencia",
            label: labels.resistencia,
            value: player.attributes.resistencia,
        },
        { key: "defesa", label: labels.defesa, value: player.attributes.defesa },
        { key: "chute", label: labels.chute, value: player.attributes.chute },
        { key: "drible", label: labels.drible, value: player.attributes.drible },
        { key: "passe", label: labels.passe, value: player.attributes.passe },
        { key: "fisico", label: labels.fisico, value: player.attributes.fisico },
    ];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleSelect(player.id);
        }
    };

    return (
        <article
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`Carta de ${player.name}, ${player.position}, rating ${player.rating}${isSelected ? ", selecionado" : ""}`}
            onClick={() => onToggleSelect(player.id)}
            onKeyDown={handleKeyDown}
            className={`
        relative group w-full max-w-64 aspect-[2/3] 
        transition-all duration-300 ease-out
        hover:scale-105 hover:z-10 
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
        cursor-pointer select-none
        ${isSelected ? "ring-4 ring-primary rounded-t-[2rem] rounded-b-xl" : "rounded-t-[2rem] rounded-b-xl"}
      `}
        >
            {/* Selection Indicator */}
            {isSelected && (
                <div
                    className="absolute -top-3 -left-3 z-50 bg-primary text-primary-foreground p-1 rounded-full shadow-lg animate-in zoom-in duration-200"
                    aria-hidden="true"
                >
                    <CheckCircle2 size={24} />
                </div>
            )}

            {/* Action Buttons - Always visible on mobile, hover on desktop */}
            <div
                className="absolute -top-2 -right-2 z-50 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                role="toolbar"
                aria-label="Ações da carta"
            >
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(player);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    aria-label={`Editar carta de ${player.name}`}
                >
                    <Pencil size={16} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(player.id);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="bg-destructive text-destructive-foreground p-2 rounded-full shadow-lg hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    aria-label={`Excluir carta de ${player.name}`}
                >
                    <Trash2 size={16} aria-hidden="true" />
                </button>
            </div>

            {/* Card Container */}
            <div
                className={`
          relative w-full h-full 
          bg-gradient-to-br from-card via-card to-secondary/20 
          border-2 ${isSelected ? "border-primary" : "border-border/30"} 
          rounded-t-[2rem] rounded-b-xl 
          shadow-2xl overflow-hidden 
          flex flex-col
        `}
            >
                {/* Background Textures */}
                <div
                    className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent pointer-events-none"
                    aria-hidden="true"
                />
                <div
                    className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"
                    aria-hidden="true"
                />

                {/* Header Section: Rating, Position, Flag, and Player Image */}
                <header className="flex h-[50%] relative z-10 p-4">
                    {/* Stats Column */}
                    <div className="flex flex-col items-center justify-start pt-4 w-1/4 gap-1">
                        <span className="text-4xl font-black text-primary tracking-tighter leading-none">
                            {player.rating}
                        </span>
                        <span className="text-lg font-bold text-accent-foreground/80 tracking-wide">
                            {player.position}
                        </span>
                        <div className="w-8 h-px bg-primary/50 my-2" aria-hidden="true" />
                        <img
                            src="https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Flag_of_Brazil.svg/640px-Flag_of_Brazil.svg.png"
                            alt="Brasil"
                            width={24}
                            height={16}
                            className="w-6 h-4 object-cover shadow-sm opacity-80"
                            loading="lazy"
                        />
                    </div>

                    {/* Player Image */}
                    <div className="w-3/4 flex items-end justify-center">
                        {player.image ? (
                            <img
                                src={player.image || "/placeholder.svg"}
                                alt=""
                                className="h-full w-full object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]"
                                loading="lazy"
                            />
                        ) : (
                            <User
                                size={96}
                                className="text-muted-foreground mb-4"
                                aria-hidden="true"
                            />
                        )}
                    </div>
                </header>

                {/* Player Name Section */}
                <div className="flex flex-col items-center px-4 relative z-10">
                    <div
                        className="w-[90%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                        aria-hidden="true"
                    />
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tight py-2 truncate max-w-[90%] text-center">
                        {player.name}
                    </h2>
                    <div
                        className="w-[90%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                        aria-hidden="true"
                    />
                </div>

                {/* Attributes Grid */}
                <div
                    className="grid grid-cols-2 gap-x-4 gap-y-1 px-6 py-4 text-sm font-bold relative z-10 flex-1"
                    role="list"
                    aria-label="Atributos do jogador"
                >
                    {attributesList.map(({ key, label, value }) => (
                        <div
                            key={key}
                            className="flex justify-between items-center"
                            role="listitem"
                        >
                            <span className="text-muted-foreground w-8">{label}</span>
                            <span className={getStatColor(value)}>{value}</span>
                        </div>
                    ))}
                </div>

                {/* Decorative Shield */}
                <div
                    className="absolute bottom-4 left-0 right-0 flex justify-center opacity-20 pointer-events-none"
                    aria-hidden="true"
                >
                    <Shield size={64} className="text-muted-foreground fill-muted/50" />
                </div>
            </div>
        </article>
    );
};
