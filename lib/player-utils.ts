import { Attributes, Player, PlayerPosition } from "@/types";
import { toast } from "sonner";
import { getLocalStorageKey, LOCAL_STORAGE_KEY_LEGACY } from "./constants";
import { getCountryCode } from "./countries";

export const DEFAULT_ATTRIBUTES: Attributes = {
    velocidade: 60,
    resistencia: 60,
    chute: 60,
    posicionamento: 60,
    defesa: 60,
    drible: 60,
    passe: 60,
    fisico: 60,
};

const STAT_KEYS: (keyof Attributes)[] = [
    "velocidade",
    "resistencia",
    "chute",
    "posicionamento",
    "defesa",
    "drible",
    "passe",
    "fisico",
];

export const coerceStat = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return undefined;
        const n = Number(trimmed);
        if (Number.isFinite(n)) return Math.round(n);
    }
    return undefined;
};

export const calculateOVR = (attrs: Attributes): number => {
    const values = Object.values(attrs);
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
};

const parseNestedAttributes = (
    raw: unknown,
): Partial<Record<keyof Attributes, unknown>> | null => {
    if (raw == null) return null;
    if (typeof raw === "object" && !Array.isArray(raw)) {
        return raw as Partial<Record<keyof Attributes, unknown>>;
    }
    if (typeof raw === "string") {
        try {
            const parsed: unknown = JSON.parse(raw);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return parsed as Partial<Record<keyof Attributes, unknown>>;
            }
        } catch {
            return null;
        }
    }
    return null;
};

export const mergePlayerAttributesFromRow = (
    source: Partial<Player> & Partial<Attributes> & Record<string, unknown>,
): Attributes => {
    const nested = parseNestedAttributes(source.attributes);
    const merged: Attributes = { ...DEFAULT_ATTRIBUTES };

    for (const key of STAT_KEYS) {
        const fromRoot = coerceStat(source[key]);
        const fromNested = nested ? coerceStat(nested[key]) : undefined;
        const v = fromRoot ?? fromNested;
        if (v !== undefined) {
            merged[key] = v;
        }
    }

    return merged;
};

export const normalizeAttributes = (value: unknown): Attributes => {
    const source =
        value && typeof value === "object" && !Array.isArray(value)
            ? (value as Partial<Record<keyof Attributes, unknown>>)
            : {};

    const merged: Attributes = { ...DEFAULT_ATTRIBUTES };
    for (const key of STAT_KEYS) {
        const v = coerceStat(source[key]);
        if (v !== undefined) {
            merged[key] = v;
        }
    }
    return merged;
};

export const normalizePlayer = (player: unknown): Player => {
    const source = (player ?? {}) as Partial<Player> &
        Partial<Attributes> &
        Record<string, unknown>;

    const attributes = mergePlayerAttributesFromRow(source);

    const rating =
        coerceStat(source.rating) ??
        coerceStat(source["ovr"]) ??
        calculateOVR(attributes);

    const image =
        (typeof source.image === "string" && source.image.length > 0
            ? source.image
            : null) ??
        (typeof source.image_url === "string" && source.image_url.length > 0
            ? source.image_url
            : null);

    const position = (source.position as PlayerPosition | undefined) ?? "ATA";

    return {
        id: String(source.id ?? Date.now()),
        name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : "Jogador",
        position,
        nationality: getCountryCode(source.nationality),
        image,
        attributes,
        rating,
        user_id: typeof source.user_id === "string" ? source.user_id : undefined,
    };
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

                resolve(canvas.toDataURL("image/jpeg", 0.82));
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};

const isQuotaExceededError = (e: unknown): boolean => {
    if (e instanceof DOMException) {
        return e.name === "QuotaExceededError" || e.code === 22;
    }
    if (e instanceof Error && /quota|exceeded/i.test(e.message)) {
        return true;
    }
    return false;
};

let quotaSaveNoticeShown = false;

const withoutDataUrlImages = (players: Player[]): Player[] =>
    players.map((p) => ({
        ...p,
        image: p.image?.startsWith("data:") ? null : p.image,
    }));

const withoutAnyImages = (players: Player[]): Player[] =>
    players.map((p) => ({
        ...p,
        image: null,
    }));

/** Keep only rows that belong to this user (or have no owner yet under this scoped key). */
export function filterPlayersForUser(players: Player[], userId: string | null | undefined): Player[] {
    if (!userId) {
        return players.filter((p) => !p.user_id);
    }
    return players.filter((p) => !p.user_id || p.user_id === userId);
}

export const saveToLocalStorage = (players: Player[], userId?: string | null) => {
    try {
        if (typeof window === "undefined") return;

        const scoped = filterPlayersForUser(players, userId).map((p) =>
            userId ? { ...normalizePlayer(p), user_id: userId } : normalizePlayer(p),
        );
        const forLocal = withoutDataUrlImages(scoped);
        const key = getLocalStorageKey(userId);

        const tryWrite = (list: Player[]) => {
            localStorage.setItem(key, JSON.stringify(list));
        };

        try {
            tryWrite(forLocal);
            return;
        } catch (first) {
            if (!isQuotaExceededError(first)) throw first;
        }

        try {
            tryWrite(withoutAnyImages(forLocal));
            console.warn("[app] Saved players to localStorage without images — storage quota");
            if (!quotaSaveNoticeShown) {
                quotaSaveNoticeShown = true;
                toast.warning("Armazenamento local", {
                    description:
                        "Limite do navegador atingido. Fotos ficam só na nuvem (URLs); rode o script do bucket se ainda não configurou o Storage.",
                });
            }
            return;
        } catch (third) {
            throw third;
        }
    } catch (e) {
        console.error("[app] Error saving to local storage:", e);
        toast.error("Erro ao salvar dados localmente", {
            description: isQuotaExceededError(e)
                ? "Limite de armazenamento do navegador excedido."
                : undefined,
        });
    }
};

export const loadFromLocalStorage = (userId?: string | null): Player[] => {
    try {
        if (typeof window === "undefined") return [];
        const key = getLocalStorageKey(userId);
        let data = localStorage.getItem(key);

        // One-time migration: legacy unscoped key → guest only (never into another account)
        if (!data && !userId) {
            const legacy = localStorage.getItem(LOCAL_STORAGE_KEY_LEGACY);
            if (legacy) {
                data = legacy;
                localStorage.setItem(getLocalStorageKey(null), legacy);
                localStorage.removeItem(LOCAL_STORAGE_KEY_LEGACY);
            }
        }

        if (!data) return [];

        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
            console.warn("[app] Invalid localStorage data, resetting");
            return [];
        }

        return filterPlayersForUser(parsed.map(normalizePlayer), userId);
    } catch (e) {
        console.error("[app] Error loading from local storage:", e);
        toast.error("Erro ao carregar dados locais");
        return [];
    }
};

/** Clear cache for a specific user (or guest). */
export const clearLocalStorageForUser = (userId?: string | null) => {
    try {
        if (typeof window === "undefined") return;
        localStorage.removeItem(getLocalStorageKey(userId));
    } catch (e) {
        console.error("[app] Error clearing local storage:", e);
    }
};
