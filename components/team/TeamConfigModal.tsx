"use client";

import { useId } from "react";
import { Shuffle } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface RangeSliderProps {
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
}

const RangeSlider = ({ label, min, max, value, onChange }: RangeSliderProps) => {
    const inputId = useId();
    const listId = useId();

    return (
        <div className="flex w-full flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
                <label htmlFor={inputId} className="font-medium text-foreground">
                    {label}
                </label>
                <output htmlFor={inputId} className="font-black tabular-nums text-foreground">
                    {value}
                </output>
            </div>
            <input
                id={inputId}
                type="range"
                list={listId}
                min={min}
                max={max}
                step={1}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-default-200 accent-primary"
            />
            <datalist id={listId}>
                {Array.from({ length: max - min + 1 }, (_, i) => (
                    <option key={min + i} value={min + i} />
                ))}
            </datalist>
        </div>
    );
};

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
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
            <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    Configurar Times
                </h2>
                <p className="text-sm text-default-500 font-normal">
                    Defina quantos times e jogadores por time
                </p>
            </ModalHeader>

            <ModalBody className="flex flex-col gap-5">
                <RangeSlider
                    label="Número de Times"
                    min={2}
                    max={8}
                    value={numTeams}
                    onChange={setNumTeams}
                />

                <RangeSlider
                    label="Jogadores por Time"
                    min={1}
                    max={20}
                    value={playersPerTeam}
                    onChange={setPlayersPerTeam}
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
                <Button variant="flat" onClick={onClose} className="w-full sm:w-auto">
                    Cancelar
                </Button>
                <Button
                    color="primary"
                    onClick={onDraw}
                    isDisabled={!hasEnough}
                    startContent={<Shuffle size={18} />}
                    className="font-semibold w-full sm:w-auto"
                >
                    Sortear
                </Button>
            </ModalFooter>
        </Modal>
    );
};
