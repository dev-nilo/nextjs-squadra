import { useState } from "react";
import { TeamData } from "@/types";
import { Shuffle, User } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Avatar, Card, CardHeader, CardBody } from "@nextui-org/react";

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

    const handleDragStart = (playerId: string, fromTeam: number) => {
        setDraggedPlayer({ playerId, fromTeam });
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (toTeam: number) => {
        if (!draggedPlayer || !generatedTeams) return;

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

        setGeneratedTeams(newGeneratedTeams);
        setDraggedPlayer(null);
    };

    if (!generatedTeams) return null;

    const gridCols =
        generatedTeams.length <= 2
            ? "grid-cols-1 sm:grid-cols-2"
            : generatedTeams.length === 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : generatedTeams.length <= 6
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

    return (
        <Modal 
            isOpen={isOpen} 
            onOpenChange={(open) => !open && onClose()} 
            size="5xl"
            scrollBehavior="inside"
            classNames={{
                backdrop: "bg-black/60 backdrop-blur-md",
                base: "mx-2 sm:mx-auto w-[calc(100vw-1rem)] sm:w-full max-w-[calc(100vw-1rem)] sm:max-w-5xl bg-content1/40 backdrop-blur-xl border border-white/20 shadow-2xl",
                header: "border-b border-white/10 bg-black/40 px-3 sm:px-6",
                body: "p-3 sm:p-6 bg-transparent",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-2 sm:gap-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                                <h2 className="text-xl sm:text-2xl font-black">
                                    Times Sorteados
                                </h2>
                                <Button 
                                    color="primary" 
                                    onPress={onRedraw}
                                    startContent={<Shuffle size={18} />}
                                    size="sm"
                                    className="w-full sm:w-auto shrink-0"
                                >
                                    Sortear Novamente
                                </Button>
                            </div>
                            <p className="text-xs sm:text-sm text-default-500 font-normal">
                                <span className="hidden sm:inline">Arraste jogadores entre os times para reorganizar manualmente</span>
                                <span className="sm:hidden">Toque e arraste para reorganizar (melhor no desktop)</span>
                            </p>
                        </ModalHeader>
                        
                        <ModalBody>
                            <div className={`grid gap-3 sm:gap-4 lg:gap-6 ${gridCols}`}>
                                {generatedTeams.map((team, idx) => (
                                    <Card 
                                        key={idx}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop(idx)}
                                        className={`${team.color} border-1 ${team.borderColor} overflow-hidden shadow-none`}
                                    >
                                        <CardHeader className={`flex-col items-center justify-center p-2.5 sm:p-3 border-b-1 ${team.borderColor} bg-transparent`}>
                                            <h3 className={`text-lg sm:text-xl font-black ${team.headerColor} tracking-tight`}>
                                                {team.name}
                                            </h3>
                                            <span className="text-xs font-bold text-default-400 mt-1">
                                                {team.members.length} Jogadores · MÉDIA {team.avg}
                                            </span>
                                        </CardHeader>

                                        <CardBody className="p-2 space-y-2 min-h-[160px] sm:min-h-[200px] overflow-visible">
                                            {team.members.map((player) => (
                                                <div
                                                    key={player.id}
                                                    draggable
                                                    onDragStart={() => handleDragStart(player.id, idx)}
                                                    className="flex items-center gap-2 sm:gap-3 bg-content1/50 hover:bg-content2/80 rounded-md p-2 cursor-grab active:cursor-grabbing transition-colors touch-manipulation"
                                                >
                                                    <Avatar 
                                                        src={player.image || undefined} 
                                                        name={player.name}
                                                        icon={!player.image ? <User size={16} /> : undefined}
                                                        size="sm"
                                                        isBordered
                                                        className="shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-sm truncate">
                                                            {player.name}
                                                        </div>
                                                        <div className="text-[10px] uppercase font-bold text-default-500">
                                                            {player.position} · {player.rating}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardBody>
                                    </Card>
                                ))}
                            </div>
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
