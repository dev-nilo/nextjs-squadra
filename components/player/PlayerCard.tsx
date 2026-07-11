import { Player } from "@/types";
import { GK_LABELS, OUTFIELD_LABELS } from "@/lib/constants";
import { getStatColor, normalizeAttributes } from "@/lib/player-utils";
import { getCountryCode, getCountryName, getFlagUrl } from "@/lib/countries";
import { CheckCircle2, Pencil, Trash2, User } from "lucide-react";
import { Card, CardHeader, CardBody, Button } from "@nextui-org/react";

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
    const attributes = normalizeAttributes(player.attributes);
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
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleSelect(player.id);
        }
    };

    return (
        <div
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
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
                cursor-pointer select-none
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
                <Button
                    isIconOnly
                    color="primary"
                    size="sm"
                    radius="full"
                    className="shadow-lg"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(player);
                    }}
                    aria-label={`Editar carta de ${player.name}`}
                >
                    <Pencil size={16} />
                </Button>
                <Button
                    isIconOnly
                    color="danger"
                    size="sm"
                    radius="full"
                    className="shadow-lg"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(player.id);
                    }}
                    aria-label={`Excluir carta de ${player.name}`}
                >
                    <Trash2 size={16} />
                </Button>
            </div>

            {/* Card Container */}
            <Card
                className={`
                    w-full h-full 
                    bg-gradient-to-br from-content1 via-content1 to-default-200/20 
                    border-2 ${isSelected ? "border-primary" : "border-divider/30"} 
                    rounded-t-[2rem] rounded-b-xl 
                    shadow-2xl overflow-hidden 
                `}
            >
                {/* Background Textures */}
                <div
                    className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent pointer-events-none"
                    aria-hidden="true"
                />
                
                <CardHeader className="flex h-[50%] relative z-10 p-4 items-start justify-between bg-transparent">
                    {/* Stats Column */}
                    <div className="flex flex-col items-center justify-start pt-2 w-1/4 gap-1">
                        <span className="text-4xl font-black text-primary tracking-tighter leading-none">
                            {player.rating}
                        </span>
                        <span className="text-lg font-bold text-foreground/80 tracking-wide">
                            {player.position}
                        </span>
                        <div className="w-8 h-px bg-primary/50 my-2" aria-hidden="true" />
                        <img
                            src={getFlagUrl(countryCode)}
                            alt={countryName}
                            width={24}
                            height={16}
                            className="w-6 h-4 object-cover shadow-sm opacity-80 rounded-sm"
                        />
                    </div>

                    {/* Player Image */}
                    <div className="w-3/4 h-full pl-4 flex items-center justify-center">
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
                </CardHeader>

                <CardBody className="p-0 flex flex-col justify-between overflow-hidden bg-transparent z-10">
                    {/* Player Name Section */}
                    <div className="flex flex-col items-center px-4">
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
                        className="grid grid-cols-2 gap-x-4 gap-y-1 px-6 py-4 text-sm font-bold flex-1"
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
                </CardBody>
            </Card>
        </div>
    );
};
