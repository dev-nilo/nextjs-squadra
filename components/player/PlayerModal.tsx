import { useState, useRef, useEffect } from "react";
import { Player, PlayerPosition, Attributes } from "@/types";
import { POSITIONS } from "@/lib/constants";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY_CODE, getCountryCode } from "@/lib/countries";
import { processImage } from "@/lib/player-utils";
import {
    DEFAULT_ATTRIBUTES,
    normalizeAttributes,
    calculateOVR,
} from "@/lib/jogador";
import { StatSlider } from "./StatSlider";
import { Upload, Save } from "lucide-react";
import { toast } from "sonner";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Image } from "@nextui-org/react";

interface PlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (playerData: Omit<Player, "rating" | "user_id">) => Promise<void>;
    initialData?: Player | null;
}

export const PlayerModal = ({
    isOpen,
    onClose,
    onSave,
    initialData,
}: PlayerModalProps) => {
    const [name, setName] = useState("");
    const [position, setPosition] = useState<PlayerPosition>("ATA");
    const [nationality, setNationality] = useState(DEFAULT_COUNTRY_CODE);
    const [image, setImage] = useState<string | null>(null);
    const [attributes, setAttributes] = useState<Attributes>(DEFAULT_ATTRIBUTES);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setPosition(initialData.position);
                setNationality(getCountryCode(initialData.nationality));
                setImage(initialData.image);
                setAttributes(normalizeAttributes(initialData.attributes));
            } else {
                // Reset form
                setName("");
                setPosition("ATA");
                setNationality(DEFAULT_COUNTRY_CODE);
                setImage(null);
                setAttributes(DEFAULT_ATTRIBUTES);
            }
        }
    }, [isOpen, initialData]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const processedImage = await processImage(file);
                setImage(processedImage);
            } catch (error) {
                console.error("Error processing image:", error);
                toast.error("Erro ao processar imagem.");
            }
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error("Nome do jogador é obrigatório");
            return;
        }

        const playerData = {
            id: initialData?.id || crypto.randomUUID(),
            name: name.trim(),
            position,
            nationality,
            image,
            attributes: { ...attributes },
        };

        await onSave(playerData);
        onClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onOpenChange={(open) => !open && onClose()} 
            size="3xl"
            scrollBehavior="inside"
            backdrop="blur"
            classNames={{
                base: "mx-2 sm:mx-auto w-[calc(100vw-1rem)] sm:w-full max-w-[calc(100vw-1rem)] sm:max-w-3xl",
                header: "px-3 sm:px-6",
                body: "px-3 sm:px-6",
                footer: "px-3 sm:px-6 flex-col-reverse sm:flex-row gap-2",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 text-lg sm:text-xl">
                            {initialData ? "Editar Carta" : "Nova Carta"}
                        </ModalHeader>

                        <ModalBody>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-4">
                                    <Input
                                        label="Nome do Jogador"
                                        value={name}
                                        onValueChange={setName}
                                        placeholder="Nome do jogador"
                                        isRequired
                                    />

                                    <Select 
                                        label="Posição" 
                                        selectedKeys={[position]}
                                        onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                                    >
                                        {POSITIONS.map((pos) => (
                                            <SelectItem key={pos} value={pos}>
                                                {pos}
                                            </SelectItem>
                                        ))}
                                    </Select>

                                    <Select 
                                        label="Nacionalidade" 
                                        selectedKeys={[nationality]}
                                        onSelectionChange={(keys) => {
                                            const value = Array.from(keys)[0];
                                            if (typeof value === "string" && value) {
                                                setNationality(value);
                                            }
                                        }}
                                    >
                                        {COUNTRY_OPTIONS.map((country) => (
                                            <SelectItem key={country.code} value={country.code}>
                                                {country.name}
                                            </SelectItem>
                                        ))}
                                    </Select>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-default-600">
                                            Foto do Jogador
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                onPress={() => fileInputRef.current?.click()}
                                                startContent={<Upload size={16} />}
                                                variant="flat"
                                                className="flex-1 sm:flex-none min-w-0"
                                            >
                                                {image ? "Alterar Foto" : "Adicionar Foto"}
                                            </Button>
                                            {image && (
                                                <Button
                                                    color="danger"
                                                    variant="flat"
                                                    onPress={() => setImage(null)}
                                                    className="flex-1 sm:flex-none"
                                                >
                                                    Remover
                                                </Button>
                                            )}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                        {image && (
                                            <div className="mt-2 p-3 sm:p-4 bg-default-100 rounded-lg flex justify-center">
                                                <Image
                                                    src={image || "/placeholder.svg"}
                                                    alt="Prévia"
                                                    className="max-h-32 sm:max-h-40 object-cover"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 sm:space-y-4">
                                    <h3 className="text-sm font-bold text-default-600">
                                        Atributos (OVR: {calculateOVR(attributes)})
                                    </h3>
                                    <div className="space-y-3 sm:space-y-4">
                                        <StatSlider
                                            label="Velocidade"
                                            value={attributes.velocidade}
                                            onChange={(val) =>
                                                setAttributes({ ...attributes, velocidade: val })
                                            }
                                        />
                                        <StatSlider
                                            label="Resistência"
                                            value={attributes.resistencia}
                                            onChange={(val) =>
                                                setAttributes({ ...attributes, resistencia: val })
                                            }
                                        />
                                        <StatSlider
                                            label="Chute"
                                            value={attributes.chute}
                                            onChange={(val) =>
                                                setAttributes({ ...attributes, chute: val })
                                            }
                                        />
                                        <StatSlider
                                            label="Posicionamento"
                                            value={attributes.posicionamento}
                                            onChange={(val) =>
                                                setAttributes({
                                                    ...attributes,
                                                    posicionamento: val,
                                                })
                                            }
                                        />
                                        <StatSlider
                                            label="Defesa"
                                            value={attributes.defesa}
                                            onChange={(val) =>
                                                setAttributes({ ...attributes, defesa: val })
                                            }
                                        />
                                        <StatSlider
                                            label="Drible"
                                            value={attributes.drible}
                                            onChange={(val) =>
                                                setAttributes({ ...attributes, drible: val })
                                            }
                                        />
                                        <StatSlider
                                            label="Passe"
                                            value={attributes.passe}
                                            onChange={(val) =>
                                                setAttributes({ ...attributes, passe: val })
                                            }
                                        />
                                        <StatSlider
                                            label="Físico"
                                            value={attributes.fisico}
                                            onChange={(val) =>
                                                setAttributes({ ...attributes, fisico: val })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </ModalBody>

                        <ModalFooter>
                            <Button variant="light" onPress={onClose} className="w-full sm:w-auto">
                                Cancelar
                            </Button>
                            <Button 
                                color="primary" 
                                onPress={handleSubmit}
                                startContent={<Save size={20} />}
                                className="w-full sm:w-auto"
                            >
                                {initialData ? "Atualizar Carta" : "Criar Carta"}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
