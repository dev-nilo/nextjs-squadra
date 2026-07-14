"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Time } from "@/types";
import { teamAverage } from "@/lib/sorteio";
import { getTeamPresentation } from "@/lib/constants";
import { Download, Loader2, Shuffle, User } from "lucide-react";
import { toast } from "sonner";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    Button,
    Avatar,
} from "@nextui-org/react";

interface DrawTeamsModalProps {
    isOpen: boolean;
    onClose: () => void;
    generatedTeams: Time[] | null;
    setGeneratedTeams: (teams: Time[]) => void;
    onRedraw: () => void;
}

export const DrawTeamsModal = ({
    isOpen,
    onClose,
    generatedTeams,
    setGeneratedTeams,
    onRedraw,
}: DrawTeamsModalProps) => {
    const exportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [draggedPlayer, setDraggedPlayer] = useState<{
        playerId: string;
        fromTeam: number;
    } | null>(null);
    const [dragOverTeam, setDragOverTeam] = useState<number | null>(null);

    const handleDragStart = (playerId: string, fromTeam: number) => {
        setDraggedPlayer({ playerId, fromTeam });
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, teamIndex: number) => {
        e.preventDefault();
        setDragOverTeam(teamIndex);
    };

    const handleDragLeave = () => {
        setDragOverTeam(null);
    };

    const handleDrop = (toTeam: number) => {
        if (!draggedPlayer || !generatedTeams) {
            setDragOverTeam(null);
            return;
        }

        const { playerId, fromTeam } = draggedPlayer;
        const playerToMove = generatedTeams[fromTeam].members.find((p) => p.id === playerId);

        if (!playerToMove || fromTeam === toTeam) {
            setDraggedPlayer(null);
            setDragOverTeam(null);
            return;
        }

        const newGeneratedTeams = generatedTeams.map((team, index) => {
            if (index === fromTeam) {
                const members = team.members.filter((p) => p.id !== playerId);
                return { ...team, members, avg: teamAverage(members) };
            }
            if (index === toTeam) {
                const members = [...team.members, playerToMove];
                return { ...team, members, avg: teamAverage(members) };
            }
            return team;
        });

        setGeneratedTeams(newGeneratedTeams);
        setDraggedPlayer(null);
        setDragOverTeam(null);
    };

    const handleDownloadPng = async () => {
        if (!exportRef.current || !generatedTeams) return;

        setIsExporting(true);
        try {
            const dataUrl = await toPng(exportRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: "#ffffff",
                filter: (node) => {
                    if (node instanceof HTMLElement && node.dataset?.exportIgnore === "true") {
                        return false;
                    }
                    return true;
                },
            });

            const link = document.createElement("a");
            const stamp = new Date().toISOString().slice(0, 10);
            link.download = `squadra-times-${stamp}.png`;
            link.href = dataUrl;
            link.click();
            toast.success("PNG baixado", { description: "Imagem dos times salva com sucesso" });
        } catch (error) {
            console.error("[DrawTeamsModal] PNG export failed:", error);
            toast.error("Erro ao gerar PNG", {
                description: "Tente novamente. Imagens externas podem bloquear a exportação.",
            });
        } finally {
            setIsExporting(false);
        }
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
            backdrop="blur"
            classNames={{
                base: "mx-2 sm:mx-auto w-[calc(100vw-1rem)] sm:w-full max-w-[calc(100vw-1rem)] sm:max-w-5xl bg-content1",
                header: "px-4 sm:px-6 border-b border-divider",
                body: "p-0 bg-content1",
            }}
        >
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 w-full">
                                <div className="min-w-0">
                                    <h2 className="text-xl sm:text-2xl font-black text-foreground">
                                        Times Sorteados
                                    </h2>
                                    <p className="text-xs sm:text-sm text-default-500 font-normal mt-1">
                                        <span className="hidden sm:inline">
                                            Arraste jogadores entre os times para reorganizar
                                        </span>
                                        <span className="sm:hidden">
                                            Arraste para reorganizar (melhor no desktop)
                                        </span>
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
                                    <Button
                                        variant="flat"
                                        onPress={handleDownloadPng}
                                        isLoading={isExporting}
                                        startContent={
                                            isExporting ? undefined : <Download size={16} />
                                        }
                                        size="sm"
                                        className="w-full sm:w-auto"
                                    >
                                        Baixar PNG
                                    </Button>
                                    <Button
                                        color="primary"
                                        onPress={onRedraw}
                                        startContent={<Shuffle size={16} />}
                                        size="sm"
                                        className="w-full sm:w-auto font-semibold"
                                    >
                                        Sortear Novamente
                                    </Button>
                                </div>
                            </div>
                        </ModalHeader>

                        <ModalBody>
                            <div className="p-4 sm:p-6 overflow-x-hidden">
                                <div
                                    ref={exportRef}
                                    className="bg-background rounded-xl p-3 sm:p-5 space-y-4"
                                >
                                    <div
                                        className="flex items-center justify-between gap-3 pb-3 border-b border-divider"
                                        data-export-title
                                    >
                                        <div>
                                            <p className="text-lg sm:text-xl font-black text-primary tracking-tight">
                                                Squadra
                                            </p>
                                            <p className="text-xs text-default-500 font-medium">
                                                Times sorteados · {generatedTeams.length} times ·{" "}
                                                {generatedTeams.reduce(
                                                    (n, t) => n + t.members.length,
                                                    0,
                                                )}{" "}
                                                jogadores
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`grid gap-3 sm:gap-4 ${gridCols}`}>
                                        {generatedTeams.map((team, idx) => {
                                            const presentation = getTeamPresentation(idx);
                                            return (
                                            <div
                                                key={idx}
                                                onDragOver={(e) => handleDragOver(e, idx)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={() => handleDrop(idx)}
                                                className={`
                                                    rounded-xl border-2 overflow-hidden bg-content1
                                                    transition-colors
                                                    ${presentation.borderColor}
                                                    ${presentation.color}
                                                    ${dragOverTeam === idx ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                                                `}
                                            >
                                                <div
                                                    className={`flex flex-col items-center justify-center px-3 py-3 border-b ${presentation.borderColor} bg-content1/80`}
                                                >
                                                    <h3
                                                        className={`text-base sm:text-lg font-black tracking-tight ${presentation.headerColor}`}
                                                    >
                                                        {team.name}
                                                    </h3>
                                                    <span className="text-[11px] font-bold text-default-500 mt-0.5 uppercase tracking-wide">
                                                        {team.members.length} jogadores · média{" "}
                                                        {team.avg}
                                                    </span>
                                                </div>

                                                <div className="p-2 space-y-1.5 min-h-[140px] sm:min-h-[180px]">
                                                    {team.members.length === 0 ? (
                                                        <p className="text-center text-xs text-default-400 py-8">
                                                            Arraste jogadores para cá
                                                        </p>
                                                    ) : (
                                                        team.members.map((player) => (
                                                            <div
                                                                key={player.id}
                                                                draggable
                                                                onDragStart={() =>
                                                                    handleDragStart(player.id, idx)
                                                                }
                                                                onDragEnd={() => {
                                                                    setDraggedPlayer(null);
                                                                    setDragOverTeam(null);
                                                                }}
                                                                className="flex items-center gap-2.5 bg-content1 border border-divider hover:border-primary/40 rounded-lg p-2 cursor-grab active:cursor-grabbing transition-colors touch-manipulation"
                                                            >
                                                                <Avatar
                                                                    src={player.image || undefined}
                                                                    name={player.name}
                                                                    icon={
                                                                        !player.image ? (
                                                                            <User size={14} />
                                                                        ) : undefined
                                                                    }
                                                                    size="sm"
                                                                    className="shrink-0"
                                                                    classNames={{
                                                                        base: "w-8 h-8",
                                                                    }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-bold text-sm truncate text-foreground">
                                                                        {player.name}
                                                                    </div>
                                                                    <div className="text-[10px] uppercase font-bold text-default-500">
                                                                        {player.position}
                                                                    </div>
                                                                </div>
                                                                <span className="text-sm font-black text-primary tabular-nums shrink-0">
                                                                    {player.rating}
                                                                </span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {isExporting && (
                                    <div
                                        className="flex items-center justify-center gap-2 text-sm text-default-500 mt-3"
                                        data-export-ignore="true"
                                    >
                                        <Loader2 size={16} className="animate-spin" />
                                        Gerando imagem...
                                    </div>
                                )}
                            </div>
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
