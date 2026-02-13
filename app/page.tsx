"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  X,
  Shuffle,
  CheckCircle2,
  Loader2,
  List,
  Grid3x3,
  Cloud,
  HardDrive,
  User,
  Search,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth/auth-modal";
import { UserMenu } from "@/components/auth/user-menu";
import { createClient } from "@/lib/supabase/client";

import { Player, TeamData } from "@/types";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  calculateOVR,
} from "@/lib/player-utils";
import { generateTeams } from "@/lib/team-utils";

import { PlayerCard } from "@/components/player/PlayerCard";
import { MiniPlayerRow } from "@/components/player/MiniPlayerRow";
import { PlayerModal } from "@/components/player/PlayerModal";
import { TeamConfigModal } from "@/components/team/TeamConfigModal";
import { DrawTeamsModal } from "@/components/team/DrawTeamsModal";

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
  const [isOnline, setIsOnline] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "position">(
    "rating"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Team configuration state
  const [isTeamConfigOpen, setIsTeamConfigOpen] = useState(false);
  const [numTeams, setNumTeams] = useState(3);
  const [playersPerTeam, setPlayersPerTeam] = useState(5);

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

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
            `[v0] Loaded ${cloudPlayers.length} players from Supabase`
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
              `[v0] Uploaded ${localPlayers.length} players to cloud`
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

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingPlayer(null);
    setIsModalOpen(true);
  };

  const handleSave = async (playerData: Omit<Player, "rating" | "user_id">) => {
    const rating = calculateOVR(playerData.attributes);
    const fullPlayerData = {
      ...playerData,
      rating,
    } as Player;

    const updatedPlayers = editingPlayer
      ? players.map((p) => (p.id === fullPlayerData.id ? fullPlayerData : p))
      : [...players, fullPlayerData];

    setPlayers(updatedPlayers);
    saveToLocalStorage(updatedPlayers);

    // Sync with Supabase if user is authenticated
    if (user && isOnline) {
      setIsSyncing(true);
      try {
        const playerDataWithUser = { ...fullPlayerData, user_id: user.id };

        if (editingPlayer) {
          await supabase
            .from("players")
            .update(playerDataWithUser)
            .eq("id", fullPlayerData.id);
        } else {
          await supabase.from("players").insert(playerDataWithUser);
        }

        toast.success(editingPlayer ? "Carta Atualizada" : "Carta Criada", {
          description: "Sincronizado com a nuvem",
        });
      } catch (e) {
        console.error("[v0] Error saving player to Supabase:", e);
        toast.warning(
          editingPlayer
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
      toast.success(editingPlayer ? "Carta Atualizada" : "Carta Criada", {
        description: "Salvo localmente",
      });
    }

    setIsModalOpen(false);
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

    const resultTeams = generateTeams(selectedPlayers, numTeams);

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
          onOpenChange={() => { }}
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
                  className={`relative cursor-pointer transition-all group ${selectedIds.has(player.id)
                      ? "ring-2 ring-primary rounded-lg bg-primary/5"
                      : ""
                    }`}
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

        <PlayerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          initialData={editingPlayer}
        />

        <TeamConfigModal
          isOpen={isTeamConfigOpen}
          onClose={() => setIsTeamConfigOpen(false)}
          numTeams={numTeams}
          setNumTeams={setNumTeams}
          playersPerTeam={playersPerTeam}
          setPlayersPerTeam={setPlayersPerTeam}
          selectedCount={selectedIds.size}
          onDraw={handleDrawTeams}
        />

        <DrawTeamsModal
          isOpen={isDrawModalOpen}
          onClose={() => setIsDrawModalOpen(false)}
          generatedTeams={generatedTeams}
          setGeneratedTeams={setGeneratedTeams}
          onRedraw={handleDrawTeams}
        />
      </div>
    </>
  );
}
