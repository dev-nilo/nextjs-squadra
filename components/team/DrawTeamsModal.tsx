"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Logo } from "@/components/ui/logo";
import { Player, Time } from "@/types";
import { membrosPorNome } from "@/lib/sorteio";
import { getTeamPresentation } from "@/lib/constants";
import { Download, Loader2, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/ui/player-avatar";


interface DrawTeamsModalProps {
    isOpen: boolean;
    onClose: () => void;
    generatedTeams: Time[] | null;
    onMover: (jogadorId: string, deTime: number, paraTime: number) => void;
    onRedraw: () => void;
}

export const DrawTeamsModal = ({
    isOpen,
    onClose,
    generatedTeams,
    onMover,
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

    const handleDragOver = (e: React.DragEvent<HTMLElement>, teamIndex: number) => {
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
        onMover(playerId, fromTeam, toTeam);
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
                backgroundColor: `rgb(${getComputedStyle(document.documentElement)
                    .getPropertyValue("--background")
                    .trim()})`,
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

    const totalPlayers = generatedTeams.reduce((n, t) => n + t.members.length, 0);
    const averages = generatedTeams.map((t) => t.avg);
    const spread = Math.max(...averages) - Math.min(...averages);
    const drawDate = new Date().toLocaleDateString("pt-BR");

    const gridCols =
        generatedTeams.length <= 2
            ? "grid-cols-1 sm:grid-cols-2"
            : generatedTeams.length === 3
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : generatedTeams.length <= 6
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl">
            <ModalHeader className="flex flex-col gap-3 bg-content1">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 w-full">
                    <div className="min-w-0">
                        <h2 className="text-title">Times sorteados</h2>
                        <p className="text-muted mt-1">
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
                            onClick={handleDownloadPng}
                            isLoading={isExporting}
                            startContent={<Download size={16} />}
                            size="sm"
                            className="w-full sm:w-auto"
                        >
                            Baixar PNG
                        </Button>
                        <Button
                            color="secondary"
                            onClick={onRedraw}
                            startContent={<Shuffle size={16} />}
                            size="sm"
                            className="w-full sm:w-auto"
                        >
                            Sortear de novo
                        </Button>
                    </div>
                </div>
            </ModalHeader>

            <ModalBody padded={false} className="bg-content1">
                <div className="p-4 sm:p-6 overflow-x-hidden">
                    <div
                        ref={exportRef}
                        className="bg-background rounded-xl p-3 sm:p-5 flex flex-col gap-4"
                    >
                        <div
                            className="flex items-center justify-between gap-3 pb-4 border-b border-divider"
                            data-export-title
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Logo className="h-10 w-10 sm:h-12 sm:w-12" />
                                <div className="min-w-0">
                                    <p className="text-lg sm:text-xl font-black text-brand tracking-tight leading-tight">
                                        Squadra
                                    </p>
                                    <p className="text-xs text-default-500 font-medium">
                                        <span className="whitespace-nowrap">{drawDate}</span>,{" "}
                                        <span className="whitespace-nowrap">{totalPlayers} jogadores</span>
                                    </p>
                                </div>
                            </div>
                            {generatedTeams.length > 1 && (
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-medium text-default-500">
                                        Diferença<span className="hidden sm:inline"> de média</span>
                                    </p>
                                    <p className="text-numeral text-2xl text-foreground">
                                        {spread} {spread === 1 ? "ponto" : "pontos"}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className={`grid gap-3 sm:gap-4 items-start ${gridCols}`}>
                            {generatedTeams.map((team, idx) => {
                                const presentation = getTeamPresentation(idx);
                                const numero = team.name.split(" ").pop();
                                return (
                                <section
                                    key={idx}
                                    aria-label={team.name}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={() => handleDrop(idx)}
                                    className={`
                                        rounded-xl border border-divider bg-content1 overflow-hidden
                                        transition-shadow
                                        ${dragOverTeam === idx ? `ring-2 ${presentation.ring} ring-offset-2 ring-offset-background` : ""}
                                    `}
                                >
                                    <header className="flex items-center gap-3 px-3 py-3 border-b border-divider">
                                        <span
                                            aria-hidden="true"
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-background ${presentation.crest}`}
                                        >
                                            {numero}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base font-semibold text-foreground leading-tight truncate">
                                                {team.name}
                                            </h3>
                                            <p className="text-xs text-default-500">
                                                {team.members.length}{" "}
                                                {team.members.length === 1 ? "jogador" : "jogadores"}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-numeral text-4xl text-foreground">
                                                {team.avg}
                                            </p>
                                            <p className="text-xs text-default-500 mt-1">
                                                média
                                            </p>
                                        </div>
                                    </header>

                                    {team.members.length === 0 ? (
                                        <p className="text-center text-muted py-10">
                                            Arraste jogadores para cá
                                        </p>
                                    ) : (
                                        <ul className="divide-y divide-divider">
                                            {membrosPorNome(team.members).map((player) => (
                                                <li
                                                    key={player.id}
                                                    draggable
                                                    onDragStart={() =>
                                                        handleDragStart(player.id, idx)
                                                    }
                                                    onDragEnd={() => {
                                                        setDraggedPlayer(null);
                                                        setDragOverTeam(null);
                                                    }}
                                                    aria-label={`${player.name}, ${player.position}, arraste para mover de ${team.name}`}
                                                    className="flex items-center gap-2.5 px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-default-50 transition-colors touch-manipulation"
                                                >
                                                    <PlayerAvatar
                                                        src={player.image}
                                                        name={player.name}
                                                        size="sm"
                                                    />
                                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                                        {player.name}
                                                    </span>
                                                    <span className="shrink-0 rounded-full bg-default-100 px-2 py-0.5 text-xs font-medium text-default-600">
                                                        {player.position}
                                                    </span>
                                                    <span
                                                        data-export-ignore="true"
                                                        className="w-7 shrink-0 text-right text-sm font-semibold tabular-nums text-default-600"
                                                    >
                                                        {player.rating}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
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
        </Modal>
    );
};
