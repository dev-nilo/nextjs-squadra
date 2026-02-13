import { useState } from "react";
import { TeamData } from "@/types";
import { X, Shuffle, User, Shield } from "lucide-react";
import { getStatColor } from "@/lib/player-utils";

interface DrawTeamsModalProps {
    isOpen: boolean;
    onClose: () => void;
    generatedTeams: TeamData[] | null;
    setGeneratedTeams: (teams: TeamData[]) => void;
    onRedraw: () => void;
}

export const DrawTeamsModal = ({
    isOpen,
    onClose,
    generatedTeams,
    setGeneratedTeams,
    onRedraw,
}: DrawTeamsModalProps) => {
    const [draggedPlayer, setDraggedPlayer] = useState<{
        playerId: string;
        fromTeam: number;
    } | null>(null);

    if (!isOpen || !generatedTeams) return null;

    const handleDragStart = (playerId: string, fromTeam: number) => {
        setDraggedPlayer({ playerId, fromTeam });
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (toTeam: number) => {
        if (!draggedPlayer) return;

        const { playerId, fromTeam } = draggedPlayer;
        const playerToMove = generatedTeams[fromTeam].members.find(
            (p) => p.id === playerId
        );

        if (!playerToMove || fromTeam === toTeam) {
            setDraggedPlayer(null);
            return;
        }

        const newGeneratedTeams = generatedTeams.map((team, index) => {
            if (index === fromTeam) {
                return {
                    ...team,
                    members: team.members.filter((p) => p.id !== playerId),
                };
            }
            if (index === toTeam) {
                return { ...team, members: [...team.members, playerToMove] };
            }
            return team;
        });

        const updatedTeamsWithAverages = newGeneratedTeams.map((team, index) => ({
            ...team,
            avg: team.members.length
                ? Math.round(
                    team.members.reduce((sum, p) => sum + p.rating, 0) /
                    team.members.length
                )
                : 0,
        }));

        setGeneratedTeams(updatedTeamsWithAverages);
        setDraggedPlayer(null);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-card border-b border-border p-4 z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-foreground">
                            Times Sorteados
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onRedraw}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors"
                                title="Sortear novamente"
                            >
                                <Shuffle size={20} />
                                <span>Sortear Novamente</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        Arraste jogadores entre os times para reorganizar manualmente
                    </p>
                </div>

                <div
                    className={`p-6 grid gap-6 ${generatedTeams.length <= 2
                            ? "grid-cols-1 md:grid-cols-2"
                            : generatedTeams.length === 3
                                ? "grid-cols-1 md:grid-cols-3"
                                : generatedTeams.length <= 6
                                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
                        }`}
                >
                    {generatedTeams.map((team, idx) => (
                        <div
                            key={idx}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(idx)}
                            className={`bg-gradient-to-b ${team.color} border-2 ${team.borderColor} rounded-xl overflow-hidden flex flex-col`}
                        >
                            <div
                                className={`p-3 text-center border-b ${team.borderColor} bg-black/20`}
                            >
                                <h3
                                    className={`text-xl font-black ${team.headerColor} tracking-tight`}
                                >
                                    {team.name}
                                </h3>
                                <div className="flex justify-center gap-4 mt-1 text-xs font-bold text-muted-foreground">
                                    <span>{team.members.length} Jogadores</span>
                                    <span>Média {team.avg}</span>
                                </div>
                            </div>

                            <div className="p-2 space-y-2 flex-1 min-h-[200px]">
                                {team.members.map((player) => (
                                    <div
                                        key={player.id}
                                        draggable
                                        onDragStart={() => handleDragStart(player.id, idx)}
                                        className="relative group bg-card/80 hover:bg-card border border-border/50 hover:border-primary/50 rounded-lg p-2 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden shrink-0 border border-border">
                                            {player.image ? (
                                                <img
                                                    src={player.image || "/placeholder.svg"}
                                                    alt={player.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                    <User size={16} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate">
                                                {player.name}
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                                {player.position}
                                            </div>
                                        </div>
                                        <div
                                            className={`text-lg font-black ${getStatColor(
                                                player.rating
                                            )}`}
                                        >
                                            {player.rating}
                                        </div>
                                    </div>
                                ))}
                                {team.members.length === 0 && (
                                    <div className="h-full flex items-center justify-center text-muted-foreground/50 p-4">
                                        <Shield size={32} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
