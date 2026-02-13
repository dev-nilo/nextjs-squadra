import { useState, useRef, useEffect } from "react";
import { Player, PlayerPosition, Attributes } from "@/types";
import { POSITIONS } from "@/lib/constants";
import { calculateOVR, processImage } from "@/lib/player-utils";
import { StatSlider } from "./StatSlider";
import { X, Upload, Save } from "lucide-react";
import { toast } from "sonner";

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
    const [image, setImage] = useState<string | null>(null);
    const [attributes, setAttributes] = useState<Attributes>({
        velocidade: 60,
        resistencia: 60,
        chute: 60,
        posicionamento: 60,
        defesa: 60,
        drible: 60,
        passe: 60,
        fisico: 60,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setPosition(initialData.position);
                setImage(initialData.image);
                setAttributes(initialData.attributes);
            } else {
                // Reset form
                setName("");
                setPosition("ATA");
                setImage(null);
                setAttributes({
                    velocidade: 60,
                    resistencia: 60,
                    chute: 60,
                    posicionamento: 60,
                    defesa: 60,
                    drible: 60,
                    passe: 60,
                    fisico: 60,
                });
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
            id: initialData?.id || Date.now().toString(),
            name: name.trim(),
            position,
            image,
            attributes: { ...attributes },
        };

        await onSave(playerData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">
                        {initialData ? "Editar Carta" : "Nova Carta"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-foreground mb-2">
                                    Nome do Jogador
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Nome do jogador"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary-foreground mb-2">
                                    Posição
                                </label>
                                <select
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {POSITIONS.map((pos) => (
                                        <option key={pos} value={pos}>
                                            {pos}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary-foreground mb-2">
                                    Foto do Jogador
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-4 py-2 bg-input hover:bg-secondary/20 border border-border rounded-lg text-foreground transition-colors"
                                    >
                                        <Upload size={16} />
                                        {image ? "Alterar" : "Adicionar"} Foto
                                    </button>
                                    {image && (
                                        <button
                                            type="button"
                                            onClick={() => setImage(null)}
                                            className="px-4 py-2 bg-input hover:bg-secondary/20 border border-border rounded-lg text-muted-foreground transition-colors"
                                        >
                                            Remover
                                        </button>
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
                                    <div className="mt-2 p-4 bg-secondary/10 border border-border rounded-lg">
                                        <img
                                            src={image || "/placeholder.svg"}
                                            alt="Prévia"
                                            className="w-full h-40 object-cover rounded"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-secondary-foreground mb-4">
                                    Atributos (OVR: {calculateOVR(attributes)})
                                </h3>
                                <div className="space-y-3">
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
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-border">
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                            <Save size={20} />
                            {initialData ? "Atualizar Carta" : "Criar Carta"}
                        </button>
                        <button
                            type="button"
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
