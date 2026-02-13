import { Attributes, Player } from "@/types";
import { toast } from "sonner";
import { LOCAL_STORAGE_KEY } from "./constants";

export const calculateOVR = (attrs: Attributes): number => {
    const values = Object.values(attrs);
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
};

export const getStatColor = (value: number) => {
    if (value >= 90) return "text-chart-1";
    if (value >= 80) return "text-chart-1";
    if (value >= 70) return "text-chart-4";
    if (value >= 50) return "text-chart-5";
    return "text-destructive";
};

export const processImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const targetWidth = 300;
                const targetHeight = 400;
                const targetRatio = targetWidth / targetHeight;

                const canvas = document.createElement("canvas");
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    resolve(img.src);
                    return;
                }

                const imgRatio = img.width / img.height;

                let renderW, renderH, offsetX, offsetY;

                if (imgRatio > targetRatio) {
                    renderH = targetHeight;
                    renderW = targetHeight * imgRatio;
                    offsetX = (targetWidth - renderW) / 2;
                    offsetY = 0;
                } else {
                    renderW = targetWidth;
                    renderH = targetWidth / imgRatio;
                    offsetX = 0;
                    offsetY = 0;
                }

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

                resolve(canvas.toDataURL("image/png"));
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};

export const saveToLocalStorage = (players: Player[]) => {
    try {
        if (typeof window === "undefined") return;
        const data = JSON.stringify(players);
        localStorage.setItem(LOCAL_STORAGE_KEY, data);
        console.log(`[v0] Saved ${players.length} players to localStorage`);
    } catch (e) {
        console.error("[v0] Error saving to local storage:", e);
        toast.error("Erro ao salvar dados localmente");
    }
};

export const loadFromLocalStorage = (): Player[] => {
    try {
        if (typeof window === "undefined") return [];
        const data = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!data) return [];

        const parsed = JSON.parse(data);
        // Validate structure
        if (!Array.isArray(parsed)) {
            console.warn("[v0] Invalid localStorage data, resetting");
            return [];
        }

        console.log(`[v0] Loaded ${parsed.length} players from localStorage`);
        return parsed;
    } catch (e) {
        console.error("[v0] Error loading from local storage:", e);
        toast.error("Erro ao carregar dados locais");
        return [];
    }
};
