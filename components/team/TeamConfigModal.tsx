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
        <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} size="md" backdrop="blur">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 text-2xl font-black">
                            Configurar Times
                        </ModalHeader>
                        
                        <ModalBody className="py-6 gap-6">
                            <Slider
                                label="Número de Times"
                                step={1}
                                maxValue={8}
                                minValue={2}
                                value={numTeams}
                                onChange={(value) => setNumTeams(value as number)}
                                showSteps={true}
                                className="max-w-md"
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
                                className="max-w-md"
                                color="primary"
                            />

                            <Card className="bg-default-100/50" shadow="none">
                                <CardBody className="gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Total de Jogadores Necessários:</span>
                                        <span>{numTeams * playersPerTeam}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Jogadores Selecionados:</span>
                                        <span>{selectedCount}</span>
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
                            <Button variant="light" onPress={onClose}>
                                Cancelar
                            </Button>
                            <Button 
                                color="primary" 
                                onPress={onDraw} 
                                isDisabled={selectedCount < numTeams * playersPerTeam}
                                startContent={<Shuffle size={20} />}
                                className="font-semibold"
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
