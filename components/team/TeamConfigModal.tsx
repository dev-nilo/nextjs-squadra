import { Shuffle } from "lucide-react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Slider,
} from "@nextui-org/react";

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
    const required = numTeams * playersPerTeam;
    const hasEnough = selectedCount >= required;

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={(open) => !open && onClose()}
            size="md"
            backdrop="blur"
            classNames={{
                base: "mx-2 sm:mx-auto w-[calc(100vw-1rem)] sm:w-full max-w-[calc(100vw-1rem)] sm:max-w-md bg-content1",
                header: "px-4 sm:px-6 border-b border-divider",
                body: "px-4 sm:px-6 py-5 sm:py-6 gap-5",
                footer: "px-4 sm:px-6 border-t border-divider flex-col-reverse sm:flex-row gap-2",
            }}
        >
            <ModalContent>
                {(onModalClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            <h2 className="text-xl sm:text-2xl font-black text-foreground">
                                Configurar Times
                            </h2>
                            <p className="text-sm text-default-500 font-normal">
                                Defina quantos times e jogadores por time
                            </p>
                        </ModalHeader>

                        <ModalBody>
                            <Slider
                                label="Número de Times"
                                step={1}
                                maxValue={8}
                                minValue={2}
                                value={numTeams}
                                onChange={(value) => setNumTeams(value as number)}
                                showSteps
                                showTooltip
                                className="w-full"
                                color="primary"
                                getValue={(v) => `${v}`}
                            />

                            <Slider
                                label="Jogadores por Time"
                                step={1}
                                maxValue={20}
                                minValue={1}
                                value={playersPerTeam}
                                onChange={(value) => setPlayersPerTeam(value as number)}
                                showSteps
                                showTooltip
                                className="w-full"
                                color="primary"
                                getValue={(v) => `${v}`}
                            />

                            <div className="rounded-xl border border-divider bg-default-50 p-4 space-y-2.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-default-600 font-medium">Necessários</span>
                                    <span className="font-black text-foreground tabular-nums">{required}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-default-600 font-medium">Selecionados</span>
                                    <span className="font-black text-foreground tabular-nums">{selectedCount}</span>
                                </div>
                                <div
                                    className={`mt-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                                        hasEnough
                                            ? "bg-success/10 text-success"
                                            : "bg-danger/10 text-danger"
                                    }`}
                                >
                                    {hasEnough
                                        ? "✓ Quantidade suficiente"
                                        : `✗ Faltam ${required - selectedCount} jogadores`}
                                </div>
                            </div>
                        </ModalBody>

                        <ModalFooter>
                            <Button
                                variant="flat"
                                onPress={onModalClose}
                                className="w-full sm:w-auto"
                            >
                                Cancelar
                            </Button>
                            <Button
                                color="primary"
                                onPress={onDraw}
                                isDisabled={!hasEnough}
                                startContent={<Shuffle size={18} />}
                                className="font-semibold w-full sm:w-auto"
                            >
                                Sortear
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
