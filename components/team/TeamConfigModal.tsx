import { X, Shuffle } from "lucide-react";

interface TeamConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    numTeams: number;
    setNumTeams: (n: number) => void;
    playersPerTeam: number;
    setPlayersPerTeam: (n: number) => void;
    selectedCount: number;
    onDraw: () => void;
}

export const TeamConfigModal = ({
    isOpen,
    onClose,
    numTeams,
    setNumTeams,
    playersPerTeam,
    setPlayersPerTeam,
    selectedCount,
    onDraw,
}: TeamConfigModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md">
                <div className="bg-card border-b border-border p-6 flex items-center justify-between rounded-t-xl">
                    <h2 className="text-2xl font-black text-foreground">
                        Configurar Times
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-secondary-foreground mb-3">
                            Número de Times:{" "}
                            <span className="text-primary font-bold text-lg">{numTeams}</span>
                        </label>
                        <input
                            type="range"
                            min="2"
                            max="8"
                            value={numTeams}
                            onChange={(e) => setNumTeams(Number.parseInt(e.target.value))}
                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>2</span>
                            <span>8</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary-foreground mb-3">
                            Jogadores por Time:{" "}
                            <span className="text-primary font-bold text-lg">
                                {playersPerTeam}
                            </span>
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={playersPerTeam}
                            onChange={(e) =>
                                setPlayersPerTeam(Number.parseInt(e.target.value))
                            }
                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>1</span>
                            <span>20</span>
                        </div>
                    </div>

                    <div className="bg-secondary/20 border border-border rounded-lg p-4 space-y-2">
                        <p className="text-sm text-secondary-foreground">
                            <span className="font-semibold">
                                Total de Jogadores Necessários:
                            </span>{" "}
                            {numTeams * playersPerTeam}
                        </p>
                        <p className="text-sm text-secondary-foreground">
                            <span className="font-semibold">Jogadores Selecionados:</span>{" "}
                            {selectedCount}
                        </p>
                        {selectedCount >= numTeams * playersPerTeam ? (
                            <p className="text-sm text-chart-1 font-semibold">
                                ✓ Quantidade suficiente
                            </p>
                        ) : (
                            <p className="text-sm text-destructive font-semibold">
                                ✗ Faltam {numTeams * playersPerTeam - selectedCount} jogadores
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-border">
                        <button
                            onClick={onDraw}
                            disabled={selectedCount < numTeams * playersPerTeam}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                            <Shuffle size={20} />
                            Sortear
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-input hover:bg-secondary/20 border border-border text-muted-foreground rounded-lg font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
