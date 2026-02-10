"use client";

import type React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus,
  X,
  Upload,
  Shield,
  Trash2,
  Save,
  User,
  Shuffle,
  CheckCircle2,
  Loader2,
  Pencil,
  Search,
  Grid3x3,
  List,
  Cloud,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth/auth-modal";
import { UserMenu } from "@/components/auth/user-menu";
import { createClient } from "@/lib/supabase/client";

type PlayerPosition = "GOL" | "FIX" | "ALA" | "ATA";

interface Attributes {
  velocidade: number;
  resistencia: number;
  chute: number;
  posicionamento: number;
  defesa: number;
  drible: number;
  passe: number;
  fisico: number;
}

interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  image: string | null;
  attributes: Attributes;
  rating: number;
}

interface TeamData {
  name: string;
  members: Player[];
  avg: number;
  color: string;
  borderColor: string;
  headerColor: string;
}

const OUTFIELD_LABELS = {
  velocidade: "VEL",
  resistencia: "RES",
  chute: "CHU",
  posicionamento: "POS",
  defesa: "DEF",
  drible: "DRI",
  passe: "PAS",
  fisico: "FIS",
};

const GK_LABELS = {
  velocidade: "VEL",
  resistencia: "RES",
  chute: "CHU",
  posicionamento: "POS",
  defesa: "DEF",
  drible: "DRI",
  passe: "PAS",
  fisico: "FIS",
};

const POSITIONS: PlayerPosition[] = ["GOL", "FIX", "ALA", "ATA"];

const calculateOVR = (attrs: Attributes): number => {
  const values = Object.values(attrs);
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
};

const getStatColor = (value: number) => {
  if (value >= 90) return "text-chart-1";
  if (value >= 80) return "text-chart-1";
  if (value >= 70) return "text-chart-4";
  if (value >= 50) return "text-chart-5";
  return "text-destructive";
};

const processImage = (file: File): Promise<string> => {
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

const LOCAL_STORAGE_KEY = "fut-cards-players-v2"; // Version bump to avoid conflicts

const saveToLocalStorage = (players: Player[]) => {
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

const loadFromLocalStorage = (): Player[] => {
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

const StatSlider = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
}) => (
  <div className="flex flex-col space-y-1">
    <div className="flex justify-between text-xs font-bold tracking-wider text-muted-foreground">
      <span>{label}</span>
      <span className={getStatColor(value)}>{value}</span>
    </div>
    <input
      type="range"
      min="1"
      max="99"
      value={value}
      onChange={(e) => onChange(Number.parseInt(e.target.value))}
      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/90 transition-all"
    />
  </div>
);

interface PlayerCardProps {
  player: Player;
  onDelete: (id: string) => void;
  onEdit: (player: Player) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const PlayerCard = ({
  player,
  onDelete,
  onEdit,
  isSelected,
  onToggleSelect,
}: PlayerCardProps) => {
  const labels = player.position === "GOL" ? GK_LABELS : OUTFIELD_LABELS;

  const attributesList = [
    {
      key: "velocidade",
      label: labels.velocidade,
      value: player.attributes.velocidade,
    },
    {
      key: "posicionamento",
      label: labels.posicionamento,
      value: player.attributes.posicionamento,
    },
    {
      key: "resistencia",
      label: labels.resistencia,
      value: player.attributes.resistencia,
    },
    { key: "defesa", label: labels.defesa, value: player.attributes.defesa },
    { key: "chute", label: labels.chute, value: player.attributes.chute },
    { key: "drible", label: labels.drible, value: player.attributes.drible },
    { key: "passe", label: labels.passe, value: player.attributes.passe },
    { key: "fisico", label: labels.fisico, value: player.attributes.fisico },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggleSelect(player.id);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Carta de ${player.name}, ${player.position}, rating ${player.rating}${isSelected ? ", selecionado" : ""}`}
      onClick={() => onToggleSelect(player.id)}
      onKeyDown={handleKeyDown}
      className={`
        relative group w-full max-w-64 aspect-[2/3] 
        transition-all duration-300 ease-out
        hover:scale-105 hover:z-10 
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
        cursor-pointer select-none
        ${isSelected ? "ring-4 ring-primary rounded-t-[2rem] rounded-b-xl" : "rounded-t-[2rem] rounded-b-xl"}
      `}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div
          className="absolute -top-3 -left-3 z-50 bg-primary text-primary-foreground p-1 rounded-full shadow-lg animate-in zoom-in duration-200"
          aria-hidden="true"
        >
          <CheckCircle2 size={24} />
        </div>
      )}

      {/* Action Buttons - Always visible on mobile, hover on desktop */}
      <div
        className="absolute -top-2 -right-2 z-50 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
        role="toolbar"
        aria-label="Ações da carta"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(player);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          aria-label={`Editar carta de ${player.name}`}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(player.id);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className="bg-destructive text-destructive-foreground p-2 rounded-full shadow-lg hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          aria-label={`Excluir carta de ${player.name}`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Card Container */}
      <div
        className={`
          relative w-full h-full 
          bg-gradient-to-br from-card via-card to-secondary/20 
          border-2 ${isSelected ? "border-primary" : "border-border/30"} 
          rounded-t-[2rem] rounded-b-xl 
          shadow-2xl overflow-hidden 
          flex flex-col
        `}
      >
        {/* Background Textures */}
        <div
          className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"
          aria-hidden="true"
        />

        {/* Header Section: Rating, Position, Flag, and Player Image */}
        <header className="flex h-[50%] relative z-10 p-4">
          {/* Stats Column */}
          <div className="flex flex-col items-center justify-start pt-4 w-1/4 gap-1">
            <span className="text-4xl font-black text-primary tracking-tighter leading-none">
              {player.rating}
            </span>
            <span className="text-lg font-bold text-accent-foreground/80 tracking-wide">
              {player.position}
            </span>
            <div className="w-8 h-px bg-primary/50 my-2" aria-hidden="true" />
            <img
              src="https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Flag_of_Brazil.svg/640px-Flag_of_Brazil.svg.png"
              alt="Brasil"
              width={24}
              height={16}
              className="w-6 h-4 object-cover shadow-sm opacity-80"
              loading="lazy"
            />
          </div>

          {/* Player Image */}
          <div className="w-3/4 flex items-end justify-center">
            {player.image ? (
              <img
                src={player.image || "/placeholder.svg"}
                alt=""
                className="h-full w-full object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]"
                loading="lazy"
              />
            ) : (
              <User
                size={96}
                className="text-muted-foreground mb-4"
                aria-hidden="true"
              />
            )}
          </div>
        </header>

        {/* Player Name Section */}
        <div className="flex flex-col items-center px-4 relative z-10">
          <div
            className="w-[90%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            aria-hidden="true"
          />
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight py-2 truncate max-w-[90%] text-center">
            {player.name}
          </h2>
          <div
            className="w-[90%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            aria-hidden="true"
          />
        </div>

        {/* Attributes Grid */}
        <div
          className="grid grid-cols-2 gap-x-4 gap-y-1 px-6 py-4 text-sm font-bold relative z-10 flex-1"
          role="list"
          aria-label="Atributos do jogador"
        >
          {attributesList.map(({ key, label, value }) => (
            <div
              key={key}
              className="flex justify-between items-center"
              role="listitem"
            >
              <span className="text-muted-foreground w-8">{label}</span>
              <span className={getStatColor(value)}>{value}</span>
            </div>
          ))}
        </div>

        {/* Decorative Shield */}
        <div
          className="absolute bottom-4 left-0 right-0 flex justify-center opacity-20 pointer-events-none"
          aria-hidden="true"
        >
          <Shield size={64} className="text-muted-foreground fill-muted/50" />
        </div>
      </div>
    </article>
  );
};

const MiniPlayerRow = ({ player }: { player: Player }) => (
  <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg border border-border hover:border-primary/50 transition-colors">
    <div className="w-10 h-10 rounded-full overflow-hidden bg-card border border-border shrink-0">
      {player.image ? (
        <img
          src={player.image || "/placeholder.svg"}
          alt={player.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <User size={20} />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-bold text-foreground truncate">{player.name}</div>
      <div className="text-xs text-accent font-bold">{player.position}</div>
    </div>
    <div className="text-xl font-black text-secondary-foreground">
      {player.rating}
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="w-64 h-96 bg-card/50 rounded-[2rem] animate-pulse">
    <div className="w-full h-full flex flex-col p-4">
      <div className="flex gap-4">
        <div className="flex flex-col gap-2">
          <div className="w-12 h-12 bg-muted rounded"></div>
          <div className="w-12 h-6 bg-muted rounded"></div>
        </div>
        <div className="flex-1 bg-muted rounded"></div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-6 bg-muted rounded"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  </div>
);

export default function App() {
  const supabase = createClient();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [generatedTeams, setGeneratedTeams] = useState<TeamData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "position">(
    "rating",
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [draggedPlayer, setDraggedPlayer] = useState<{
    playerId: string;
    fromTeam: number;
  } | null>(null);

  // Team configuration state
  const [isTeamConfigOpen, setIsTeamConfigOpen] = useState(false);
  const [numTeams, setNumTeams] = useState(3);
  const [playersPerTeam, setPlayersPerTeam] = useState(5);

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPosition, setNewPosition] = useState<PlayerPosition>("ATA");
  const [newImage, setNewImage] = useState<string | null>(null);
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

  // Initialize: load local data immediately, sync with Supabase when user is authenticated
  useEffect(() => {
    // Load local data immediately as fallback
    const localPlayers = loadFromLocalStorage();
    setPlayers(localPlayers);
    setLoading(false);
  }, []);

  // Sync with Supabase when user authentication state changes
  useEffect(() => {
    const syncWithSupabase = async () => {
      if (!user) return;

      try {
        setIsOnline(true);
        console.log("[v0] Syncing with Supabase for user:", user.id);

        // Fetch players from Supabase for authenticated user
        const { data: playersData, error } = await supabase
          .from("players")
          .select("*")
          .eq("user_id", user.id);

        if (error) {
          console.error("[v0] Supabase fetch error:", error);
          return;
        }

        if (playersData && playersData.length > 0) {
          const cloudPlayers = playersData as Player[];
          console.log(
            `[v0] Loaded ${cloudPlayers.length} players from Supabase`,
          );
          setPlayers(cloudPlayers);
          saveToLocalStorage(cloudPlayers);
        } else {
          // If no cloud data but user is authenticated, upload local data
          const localPlayers = loadFromLocalStorage();
          if (localPlayers.length > 0) {
            console.log("[v0] Uploading local players to cloud...");
            for (const player of localPlayers) {
              await supabase
                .from("players")
                .upsert({ ...player, user_id: user.id }, { onConflict: "id" });
            }
            console.log(
              `[v0] Uploaded ${localPlayers.length} players to cloud`,
            );
          }
        }
      } catch (error) {
        console.error("[v0] Supabase sync error:", error);
      }
    };

    syncWithSupabase();
  }, [user]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conectado", {
        description: "Sincronizando com a nuvem...",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Modo Offline", {
        description: "Dados salvos localmente",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processedImage = await processImage(file);
        setNewImage(processedImage);
      } catch (error) {
        console.error("Error processing image:", error);
        toast.error("Erro ao processar imagem.");
      }
    }
  };

  const handleEdit = (player: Player) => {
    setEditingPlayerId(player.id);
    setNewName(player.name);
    setNewPosition(player.position);
    setNewImage(player.image);
    setAttributes(player.attributes);
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!newName.trim()) {
      toast.error("Nome do jogador é obrigatório");
      return;
    }

    const idToUse = editingPlayerId || Date.now().toString();

    const playerData: Player = {
      id: idToUse,
      name: newName.trim(),
      position: newPosition,
      image: newImage,
      attributes: { ...attributes },
      rating: calculateOVR(attributes),
    };

    const updatedPlayers = editingPlayerId
      ? players.map((p) => (p.id === idToUse ? playerData : p))
      : [...players, playerData];

    setPlayers(updatedPlayers);
    saveToLocalStorage(updatedPlayers);

    // Sync with Supabase if user is authenticated
    if (user && isOnline) {
      setIsSyncing(true);
      try {
        const playerDataWithUser = { ...playerData, user_id: user.id };

        if (editingPlayerId) {
          await supabase
            .from("players")
            .update(playerDataWithUser)
            .eq("id", idToUse);
        } else {
          await supabase.from("players").insert(playerDataWithUser);
        }

        toast.success(editingPlayerId ? "Carta Atualizada" : "Carta Criada", {
          description: "Sincronizado com a nuvem",
        });
      } catch (e) {
        console.error("[v0] Error saving player to Supabase:", e);
        toast.warning(
          editingPlayerId
            ? "Carta Atualizada Localmente"
            : "Carta Criada Localmente",
          {
            description: "Erro ao sincronizar com a nuvem",
          },
        );
      } finally {
        setIsSyncing(false);
      }
    } else {
      toast.success(editingPlayerId ? "Carta Atualizada" : "Carta Criada", {
        description: "Salvo localmente",
      });
    }

    resetForm();
    setIsModalOpen(false);
  };

  const resetForm = () => {
    setEditingPlayerId(null);
    setNewName("");
    setNewPosition("ATA");
    setNewImage(null);
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
  };

  const handleDelete = async (id: string) => {
    const updatedPlayers = players.filter((p) => p.id !== id);
    setPlayers(updatedPlayers);
    saveToLocalStorage(updatedPlayers);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (user && isOnline) {
      try {
        await supabase
          .from("players")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        toast.success("Carta Excluída", {
          description: "Removida da nuvem",
        });
      } catch (e) {
        console.error("[v0] Error deleting player from Supabase:", e);
        toast.error("Erro ao sincronizar exclusão", {
          description: "Removida localmente",
        });
      }
    } else {
      toast.success("Carta Excluída", {
        description: "Removida localmente",
      });
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const allIds = new Set(players.map((p) => p.id));
    const allSelected = players.every((p) => selectedIds.has(p.id));

    if (allSelected) {
      setSelectedIds(new Set());
      toast.info("Seleção limpa");
    } else {
      setSelectedIds(allIds);
      toast.success(`${allIds.size} carta(s) selecionada(s)`);
    }
  };

  const handleDrawTeams = () => {
    const selectedPlayers = players.filter((p) => selectedIds.has(p.id));
    const minRequiredPlayers = numTeams * playersPerTeam;

    if (selectedPlayers.length < minRequiredPlayers) {
      toast.error("Poucos Jogadores", {
        description: `Selecione pelo menos ${minRequiredPlayers} jogadores (${numTeams} times × ${playersPerTeam} jogadores)`,
      });
      return;
    }

    // Fisher-Yates shuffle for true randomization
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Shuffle players first for randomization, then sort by rating within tiers
    const shuffledPlayers = shuffleArray(selectedPlayers);

    // Group players by rating tiers (90+, 80-89, 70-79, etc.) and shuffle within tiers
    const ratingTiers: Player[][] = [[], [], [], [], []];
    shuffledPlayers.forEach((player) => {
      if (player.rating >= 90) ratingTiers[0].push(player);
      else if (player.rating >= 80) ratingTiers[1].push(player);
      else if (player.rating >= 70) ratingTiers[2].push(player);
      else if (player.rating >= 60) ratingTiers[3].push(player);
      else ratingTiers[4].push(player);
    });

    // Flatten tiers (already shuffled within each tier)
    const sortedPlayers = ratingTiers.flat();

    // Initialize teams array with configurable number of teams
    const teams: Player[][] = Array.from({ length: numTeams }, () => []);

    // Initialize attribute sums for each team
    const emptyAttributes = {
      velocidade: 0,
      resistencia: 0,
      chute: 0,
      posicionamento: 0,
      defesa: 0,
      drible: 0,
      passe: 0,
      fisico: 0,
    };
    const teamAttributeSums = Array.from({ length: numTeams }, () => ({
      ...emptyAttributes,
    }));

    // Distribute players based on total attribute sum balance with randomization for ties
    sortedPlayers.forEach((player) => {
      // Calculate total attribute sum for each team
      const teamTotals = teamAttributeSums.map((sums) =>
        Object.values(sums).reduce((a, b) => a + b, 0),
      );

      // Find all teams with the lowest total (for random tie-breaking)
      const minTotal = Math.min(...teamTotals);
      const teamsWithMinTotal = teamTotals
        .map((total, idx) => ({ total, idx }))
        .filter((t) => t.total === minTotal);

      // Randomly select among tied teams
      const minIndex =
        teamsWithMinTotal[Math.floor(Math.random() * teamsWithMinTotal.length)]
          .idx;

      // Add player to the selected team
      teams[minIndex].push(player);

      // Update attribute sums for the chosen team
      teamAttributeSums[minIndex].velocidade += player.attributes.velocidade;
      teamAttributeSums[minIndex].resistencia += player.attributes.resistencia;
      teamAttributeSums[minIndex].chute += player.attributes.chute;
      teamAttributeSums[minIndex].posicionamento +=
        player.attributes.posicionamento;
      teamAttributeSums[minIndex].defesa += player.attributes.defesa;
      teamAttributeSums[minIndex].drible += player.attributes.drible;
      teamAttributeSums[minIndex].passe += player.attributes.passe;
      teamAttributeSums[minIndex].fisico += player.attributes.fisico;
    });

    // Team color palette for up to 8 teams
    const teamColors = [
      {
        color: "from-primary/30 to-card",
        borderColor: "border-primary/40",
        headerColor: "text-primary-foreground",
      },
      {
        color: "from-destructive/20 to-card",
        borderColor: "border-destructive/40",
        headerColor: "text-destructive-foreground",
      },
      {
        color: "from-chart-1/20 to-card",
        borderColor: "border-chart-1/40",
        headerColor: "text-chart-1",
      },
      {
        color: "from-chart-2/20 to-card",
        borderColor: "border-chart-2/40",
        headerColor: "text-chart-2",
      },
      {
        color: "from-chart-3/20 to-card",
        borderColor: "border-chart-3/40",
        headerColor: "text-chart-3",
      },
      {
        color: "from-chart-4/20 to-card",
        borderColor: "border-chart-4/40",
        headerColor: "text-chart-4",
      },
      {
        color: "from-chart-5/20 to-card",
        borderColor: "border-chart-5/40",
        headerColor: "text-chart-5",
      },
      {
        color: "from-accent/20 to-card",
        borderColor: "border-accent/40",
        headerColor: "text-accent-foreground",
      },
    ];

    // Calculate average overall rating for each team
    const resultTeams: TeamData[] = teams.map((teamMembers, idx) => ({
      name: `TIME ${String.fromCharCode(65 + idx)}`,
      members: teamMembers,
      avg: teamMembers.length
        ? Math.round(
            teamMembers.reduce((sum, p) => sum + p.rating, 0) /
              teamMembers.length,
          )
        : 0,
      color: teamColors[idx].color,
      borderColor: teamColors[idx].borderColor,
      headerColor: teamColors[idx].headerColor,
    }));

    setGeneratedTeams(resultTeams);
    setIsTeamConfigOpen(false);
    setIsDrawModalOpen(true);
  };

  const handleManualSync = async () => {
    if (!user) {
      toast.error("Não Autenticado", {
        description: "Autenticação necessária para sincronizar",
      });
      return;
    }

    setIsSyncing(true);

    try {
      // Iterate over all players and save them to Supabase
      for (const player of players) {
        const playerDataWithUser = { ...player, user_id: user.id };
        await supabase
          .from("players")
          .upsert(playerDataWithUser, { onConflict: "id" });
      }
      toast.success("Sincronização Completa", {
        description: `${players.length} cartas sincronizadas com a nuvem`,
      });
    } catch (e) {
      console.error("[v0] Sync error:", e);
      toast.error("Erro na Sincronização", {
        description: "Não foi possível sincronizar com a nuvem",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredPlayers = useMemo(() => {
    const result = players.filter((player) => {
      const matchesSearch = player.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // Sort based on selected criteria
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rating":
          return b.rating - a.rating; // Higher rating first
        case "position":
          return a.position.localeCompare(b.position);
        default:
          return 0;
      }
    });

    return result;
  }, [players, searchQuery, sortBy]);

  const isGK = newPosition === "GOL";
  const currentLabels = isGK ? GK_LABELS : OUTFIELD_LABELS;
  const liveRating = useMemo(() => calculateOVR(attributes), [attributes]);

  // Drag and Drop Handlers (added for draw modal)
  const handleDragStart = (playerId: string, fromTeam: number) => {
    setDraggedPlayer({ playerId, fromTeam });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (toTeam: number) => {
    if (!draggedPlayer || generatedTeams === null) return;

    const { playerId, fromTeam } = draggedPlayer;
    const playerToMove = generatedTeams[fromTeam].members.find(
      (p) => p.id === playerId,
    );

    // If player not found or dropping onto the same team, do nothing
    if (!playerToMove || fromTeam === toTeam) {
      setDraggedPlayer(null); // Clear dragged player state
      return;
    }

    // Create new teams array to avoid direct mutation
    const newGeneratedTeams = generatedTeams.map((team, index) => {
      if (index === fromTeam) {
        // Remove player from original team
        return {
          ...team,
          members: team.members.filter((p) => p.id !== playerId),
        };
      }
      if (index === toTeam) {
        // Add player to new team
        return { ...team, members: [...team.members, playerToMove] };
      }
      return team; // Return unchanged team
    });

    // Recalculate averages for the affected teams
    const updatedTeamsWithAverages = newGeneratedTeams.map((team, index) => ({
      ...team,
      avg: team.members.length
        ? Math.round(
            team.members.reduce((sum, p) => sum + p.rating, 0) /
              team.members.length,
          )
        : 0,
    }));

    setGeneratedTeams(updatedTeamsWithAverages);
    setDraggedPlayer(null); // Reset dragged player state after drop
  };

  const handleRedrawTeams = () => {
    // This would typically involve re-running the original sorting and distribution logic
    // For simplicity, we'll just re-call handleDrawTeams which uses the current selectedPlayers.
    // In a real application, you might want to pass the selectedPlayers list here to ensure consistency.
    handleDrawTeams();
  };

  if (authLoading || loading) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <AuthModal
          open={!isAuthenticated}
          onOpenChange={() => {}}
          onSuccess={() => setIsAuthModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            {/* Top row: Search and primary actions */}
            <div className="flex flex-col gap-3">
              {/* Search bar takes full width on mobile, shared row on desktop */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 justify-between">
                <div className="relative flex-1 min-w-0">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Buscar jogador..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-input/80 border border-border/50 rounded-lg text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-ring focus:bg-input transition-colors"
                  />
                </div>

                {/* Action buttons group */}
                <div className="flex items-center gap-2 justify-between sm:justify-start w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as "name" | "rating" | "position",
                        )
                      }
                      className="flex-1 sm:flex-none px-3 py-2.5 bg-input/80 border border-border/50 rounded-lg text-foreground text-sm focus:outline-none focus:border-ring transition-colors"
                    >
                      <option value="rating">Rating ↓</option>
                      <option value="name">Nome A-Z</option>
                      <option value="position">Posição</option>
                    </select>

                    <button
                      onClick={() =>
                        setViewMode(viewMode === "grid" ? "list" : "grid")
                      }
                      className="p-2.5 bg-input/80 hover:bg-secondary/20 border border-border/50 rounded-lg text-muted-foreground hover:text-foreground transition-all"
                      title={viewMode === "grid" ? "Modo lista" : "Modo grid"}
                    >
                      {viewMode === "grid" ? (
                        <List size={20} />
                      ) : (
                        <Grid3x3 size={20} />
                      )}
                    </button>

                    <button
                      onClick={handleManualSync}
                      disabled={!isAuthenticated || isSyncing}
                      className="p-2.5 bg-input/80 hover:bg-secondary/20 border border-border/50 rounded-lg text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      title={
                        isOnline
                          ? "Sincronizar com nuvem"
                          : "Offline - Salvando localmente"
                      }
                    >
                      {isSyncing ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : isOnline ? (
                        <Cloud size={18} />
                      ) : (
                        <HardDrive size={18} />
                      )}
                    </button>
                  </div>
                  <UserMenu />
                </div>
              </div>

              {/* Bottom row: Secondary actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleToggleSelectAll}
                  className="px-3 py-2 bg-input/80 hover:bg-secondary/20 border border-border/50 rounded-lg text-foreground text-sm transition-all flex items-center gap-2"
                  title={
                    players.every((p) => selectedIds.has(p.id))
                      ? "Desmarcar todas"
                      : "Selecionar todas"
                  }
                >
                  {players.every((p) => selectedIds.has(p.id)) ? (
                    <>
                      <X size={16} />
                      <span>Desmarcar Todas</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Selecionar Todas</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleOpenNew}
                  className="px-3 py-2 bg-primary hover:bg-primary/90 border border-primary rounded-lg text-primary-foreground text-sm transition-all flex items-center gap-2 font-medium"
                >
                  <Plus size={16} />
                  <span>Nova Carta</span>
                </button>

                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsTeamConfigOpen(true)}
                      className="px-3 py-2 bg-accent hover:bg-accent/90 border border-accent rounded-lg text-accent-foreground text-sm transition-all flex items-center gap-2 font-medium"
                    >
                      <Shuffle size={16} />
                      <span>Sortear Times ({selectedIds.size})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <User size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">
                {searchQuery
                  ? "Nenhuma carta encontrada"
                  : "Nenhuma carta criada ainda"}
              </p>
              <p className="text-sm mt-2">
                {searchQuery
                  ? "Tente ajustar a busca"
                  : "Clique em 'Nova Carta' para começar"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
              {filteredPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  isSelected={selectedIds.has(player.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  onClick={() => handleToggleSelect(player.id)}
                  className={`relative cursor-pointer transition-all group ${selectedIds.has(player.id) ? "ring-2 ring-primary rounded-lg bg-primary/5" : ""}`}
                >
                  <MiniPlayerRow player={player} />

                  {/* Selection indicator */}
                  {selectedIds.has(player.id) && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-2">
                      <CheckCircle2
                        size={20}
                        className="text-primary"
                        fill="currentColor"
                      />
                    </div>
                  )}

                  {/* Action buttons - always visible on mobile */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(player);
                      }}
                      className="bg-primary text-primary-foreground p-1.5 rounded-full shadow hover:bg-primary/90 transition-colors"
                      aria-label={`Editar ${player.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(player.id);
                      }}
                      className="bg-destructive text-destructive-foreground p-1.5 rounded-full shadow hover:bg-destructive/90 transition-colors"
                      aria-label={`Excluir ${player.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  {editingPlayerId ? "Editar Carta" : "Nova Carta"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
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
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Nome do jogador"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-foreground mb-2">
                        Posição
                      </label>
                      <select
                        value={newPosition}
                        onChange={(e) =>
                          setNewPosition(e.target.value as PlayerPosition)
                        }
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
                          {newImage ? "Alterar" : "Adicionar"} Foto
                        </button>
                        {newImage && (
                          <button
                            type="button"
                            onClick={() => setNewImage(null)}
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
                      {newImage && (
                        <div className="mt-2 p-4 bg-secondary/10 border border-border rounded-lg">
                          <img
                            src={newImage || "/placeholder.svg"}
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
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    <Save size={20} />
                    {editingPlayerId ? "Atualizar Carta" : "Criar Carta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-6 py-3 bg-input hover:bg-secondary/20 border border-border text-muted-foreground rounded-lg font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isTeamConfigOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md">
              <div className="bg-card border-b border-border p-6 flex items-center justify-between rounded-t-xl">
                <h2 className="text-2xl font-black text-foreground">
                  Configurar Times
                </h2>
                <button
                  onClick={() => setIsTeamConfigOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-foreground mb-3">
                    Número de Times:{" "}
                    <span className="text-primary font-bold text-lg">
                      {numTeams}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    value={numTeams}
                    onChange={(e) =>
                      setNumTeams(Number.parseInt(e.target.value))
                    }
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
                    <span className="font-semibold">
                      Jogadores Selecionados:
                    </span>{" "}
                    {selectedIds.size}
                  </p>
                  {selectedIds.size >= numTeams * playersPerTeam ? (
                    <p className="text-sm text-chart-1 font-semibold">
                      ✓ Quantidade suficiente
                    </p>
                  ) : (
                    <p className="text-sm text-destructive font-semibold">
                      ✗ Faltam {numTeams * playersPerTeam - selectedIds.size}{" "}
                      jogadores
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <button
                    onClick={handleDrawTeams}
                    disabled={selectedIds.size < numTeams * playersPerTeam}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    <Shuffle size={20} />
                    Sortear
                  </button>
                  <button
                    onClick={() => setIsTeamConfigOpen(false)}
                    className="px-6 py-3 bg-input hover:bg-secondary/20 border border-border text-muted-foreground rounded-lg font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isDrawModalOpen && generatedTeams && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-border p-4 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-foreground">
                    Times Sorteados
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRedrawTeams}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors"
                      title="Sortear novamente"
                    >
                      <Shuffle size={20} />
                      <span>Sortear Novamente</span>
                    </button>
                    <button
                      onClick={() => setIsDrawModalOpen(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Arraste jogadores entre os times para reorganizar manualmente
                </p>
              </div>

              <div
                className={`p-6 grid gap-6 ${
                  generatedTeams.length <= 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : generatedTeams.length === 3
                      ? "grid-cols-1 md:grid-cols-3"
                      : generatedTeams.length <= 6
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
                }`}
              >
                {generatedTeams.map((team, idx) => (
                  <div
                    key={idx}
                    className="bg-card border border-border rounded-xl p-6"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-black text-card-foreground">
                        {team.name}
                      </h3>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                          Overall Médio
                        </div>
                        <div className="text-3xl font-black text-card-foreground">
                          {team.avg}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {team.members.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum jogador neste time
                        </p>
                      ) : (
                        team.members.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-move"
                            draggable
                            onDragStart={() => handleDragStart(player.id, idx)}
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-card border border-border shrink-0">
                              {player.image ? (
                                <img
                                  src={player.image || "/placeholder.svg"}
                                  alt={player.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <User size={20} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-foreground truncate">
                                {player.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {player.position}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
