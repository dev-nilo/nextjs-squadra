import { useState } from "react";
import { TeamData } from "@/types";
import { Shuffle, User, Shield } from "lucide-react";
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

    return (
        <Modal 
            isOpen={isOpen} 
            onOpenChange={(open) => !open && onClose()} 
            size="5xl" 
            scrollBehavior="inside"
            classNames={{
                backdrop: "bg-black/60 backdrop-blur-md",
                base: "bg-content1/40 backdrop-blur-xl border border-white/20 shadow-2xl",
                header: "border-b border-white/10 bg-black/40",
                body: "p-6 bg-transparent",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black">
                                    Times Sorteados
                                </h2>
                                <Button 
                                    color="primary" 
                                    onPress={onRedraw}
                                    startContent={<Shuffle size={20} />}
                                >
                                    Sortear Novamente
                                </Button>
                            </div>
                            <p className="text-sm text-default-500 font-normal">
                                Arraste jogadores entre os times para reorganizar manualmente
                            </p>
                        </ModalHeader>
                        
                        <ModalBody className="p-6">
                            <div className={`grid gap-6 ${generatedTeams.length <= 2
                                    ? "grid-cols-1 md:grid-cols-2"
                                    : generatedTeams.length === 3
                                        ? "grid-cols-1 md:grid-cols-3"
                                        : generatedTeams.length <= 6
                                            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
                                }`}>
                                {generatedTeams.map((team, idx) => (
                                    <Card 
                                        key={idx}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop(idx)}
                                        className={`${team.color} border-1 ${team.borderColor} overflow-hidden shadow-none`}
                                    >
                                        <CardHeader className={`flex-col items-center justify-center p-3 border-b-1 ${team.borderColor} bg-transparent`}>
                                            <h3 className={`text-xl font-black ${team.headerColor} tracking-tight`}>
                                                {team.name}
                                            </h3>
                                            <span className="text-xs font-bold text-default-400 mt-1">
                                                {team.members.length} Jogadores
                                            </span>
                                        </CardHeader>

                                        <CardBody className="p-2 space-y-2 min-h-[200px] overflow-visible">
                                            {team.members.map((player) => (
                                                <div
                                                    key={player.id}
                                                    draggable
                                                    onDragStart={() => handleDragStart(player.id, idx)}
                                                    className="flex items-center gap-3 bg-content1/50 hover:bg-content2/80 rounded-md p-2 cursor-grab active:cursor-grabbing transition-colors"
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
                                                            {player.position}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {team.members.length === 0 && (
                                                <div className="h-full flex items-center justify-center text-default-400/50 p-4">
                                                    <Shield size={32} />
                                                </div>
                                            )}
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
