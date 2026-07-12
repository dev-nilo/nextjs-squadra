import { Shuffle } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Slider, Card, CardBody } from "@nextui-org/react";

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
    return (
        <Modal 
            isOpen={isOpen} 
            onOpenChange={(open) => !open && onClose()} 
            size="md" 
            classNames={{
                backdrop: "bg-black/60 backdrop-blur-md",
                base: "mx-2 sm:mx-auto w-[calc(100vw-1rem)] sm:w-full max-w-[calc(100vw-1rem)] sm:max-w-md bg-content1/40 backdrop-blur-xl border border-white/20 shadow-2xl",
                header: "border-b border-white/10 bg-black/40 px-3 sm:px-6",
                body: "py-4 sm:py-6 gap-4 sm:gap-6 bg-transparent px-3 sm:px-6",
                footer: "border-t border-white/10 bg-black/20 px-3 sm:px-6 flex-col-reverse sm:flex-row gap-2"
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 text-xl sm:text-2xl font-black">
                            Configurar Times
                        </ModalHeader>
                        
                        <ModalBody>
                            <Slider
                                label="Número de Times"
                                step={1}
                                maxValue={8}
                                minValue={2}
                                value={numTeams}
                                onChange={(value) => setNumTeams(value as number)}
                                showSteps={true}
                                className="w-full"
                                color="primary"
                            />

                            <Slider
                                label="Jogadores por Time"
                                step={1}
                                maxValue={20}
                                minValue={1}
                                value={playersPerTeam}
                                onChange={(value) => setPlayersPerTeam(value as number)}
                                showSteps={true}
                                className="w-full"
                                color="primary"
                            />

                            <Card className="bg-default-100/50" shadow="none">
                                <CardBody className="gap-2 text-sm">
                                    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                                        <span className="font-semibold text-default-600">Necessários:</span>
                                        <span className="font-bold">{numTeams * playersPerTeam}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                                        <span className="font-semibold text-default-600">Selecionados:</span>
                                        <span className="font-bold">{selectedCount}</span>
                                    </div>
                                    
                                    {selectedCount >= numTeams * playersPerTeam ? (
                                        <p className="text-success font-semibold mt-2">
                                            ✓ Quantidade suficiente
                                        </p>
                                    ) : (
                                        <p className="text-danger font-semibold mt-2">
                                            ✗ Faltam {numTeams * playersPerTeam - selectedCount} jogadores
                                        </p>
                                    )}
                                </CardBody>
                            </Card>
                        </ModalBody>

                        <ModalFooter>
                            <Button variant="light" onPress={onClose} className="w-full sm:w-auto">
                                Cancelar
                            </Button>
                            <Button 
                                color="primary" 
                                onPress={onDraw} 
                                isDisabled={selectedCount < numTeams * playersPerTeam}
                                startContent={<Shuffle size={20} />}
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
