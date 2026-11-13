"use client";

import { useId } from "react";
import { Shuffle } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { MAX_TIMES, MIN_TIMES } from "@/lib/sorteio-partida";

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
                <output htmlFor={inputId} className="text-numeral text-lg text-foreground">
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
    minimoPorTime: number;
    setMinimoPorTime: (n: number) => void;
    selectedCount: number;
    /** From faltamParaSortear: 0 when there are enough selected Jogadores. */
    faltam: number;
    onDraw: () => void;
}

export const TeamConfigModal = ({
    isOpen,
    onClose,
    numTeams,
    setNumTeams,
    minimoPorTime,
    setMinimoPorTime,
    selectedCount,
    faltam,
    onDraw,
}: TeamConfigModalProps) => {
    const required = numTeams * minimoPorTime;
    const hasEnough = faltam === 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
            <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-title">Configurar times</h2>
                <p className="text-muted">
                    Quantos times, e o mínimo de jogadores em cada. Quem sobrar também entra num time.
                </p>
            </ModalHeader>

            <ModalBody className="flex flex-col gap-5">
                <RangeSlider
                    label="Número de times"
                    min={MIN_TIMES}
                    max={MAX_TIMES}
                    value={numTeams}
                    onChange={setNumTeams}
                />

                <RangeSlider
                    label="Mínimo por time"
                    min={1}
                    max={20}
                    value={minimoPorTime}
                    onChange={setMinimoPorTime}
                />

                <div className="rounded-xl border border-divider bg-default-50 p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-default-600 font-medium">Necessários</span>
                        <span className="font-semibold text-foreground tabular-nums">{required}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-default-600 font-medium">Selecionados</span>
                        <span className="font-semibold text-foreground tabular-nums">{selectedCount}</span>
                    </div>
                    <Alert tone={hasEnough ? "success" : "danger"} className="mt-1">
                        {hasEnough
                            ? "✓ Quantidade suficiente"
                            : `✗ Faltam ${faltam} jogadores`}
                    </Alert>
                </div>
            </ModalBody>

            <ModalFooter>
                <Button variant="flat" onClick={onClose} className="w-full sm:w-auto">
                    Cancelar
                </Button>
                <Button
                    color="secondary"
                    onClick={onDraw}
                    isDisabled={!hasEnough}
                    startContent={<Shuffle size={18} />}
                    className="w-full sm:w-auto"
                >
                    Sortear
                </Button>
            </ModalFooter>
        </Modal>
    );
};
