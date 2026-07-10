"use client";

import type React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, X, Shield, Trash2, User, Shuffle, CheckCircle2, Loader2, Pencil, Search, Grid3x3, List, Cloud, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth/auth-modal";
import { UserMenu } from "@/components/auth/user-menu";
import { createClient } from "@/lib/supabase/client";
import { normalizePlayer } from "@/lib/player-utils";
import { playerToSupabaseRow } from "@/lib/player-supabase";
import type { Player, TeamData } from "@/types";
import { Button, Input, Select, SelectItem, ButtonGroup } from "@nextui-org/react";

// Import refactored components
import { PlayerCard } from "@/components/player/PlayerCard";
import { MiniPlayerRow } from "@/components/player/MiniPlayerRow";
import { PlayerModal } from "@/components/player/PlayerModal";
import { TeamConfigModal } from "@/components/team/TeamConfigModal";
import { DrawTeamsModal } from "@/components/team/DrawTeamsModal";

const LOCAL_STORAGE_KEY = "fut-cards-players-v2";

const saveToLocalStorage = (players: Player[]) => {
  try {
    if (typeof window === "undefined") return;
    const minimized = players.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      image: typeof p.image === "string" && p.image.length < 200 ? p.image : null,
    }));
    let data = JSON.stringify(minimized);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, data);
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        const limited = minimized.slice(0, 50);
        data = JSON.stringify(limited);
        localStorage.setItem(LOCAL_STORAGE_KEY, data);
      } else {
        throw e;
      }
    }
  } catch (e) {
    console.error("Error saving to local storage:", e);
    toast.error("Erro ao salvar dados localmente");
  }
};

const loadFromLocalStorage = (): Player[] => {
  try {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("Error loading from local storage:", e);
    return [];
  }
};

export default function App() {
  const supabase = createClient();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTeamConfigOpen, setIsTeamConfigOpen] = useState(false);
  
  const [generatedTeams, setGeneratedTeams] = useState<TeamData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "position">("rating");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [numTeams, setNumTeams] = useState(3);
  const [playersPerTeam, setPlayersPerTeam] = useState(5);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const loadPlayers = async () => {
      setLoading(true);
      try {
        if (user) {
          const { data: playersData, error } = await supabase
            .from("players")
            .select("*")
            .eq("user_id", user.id);

          if (error) {
            const local = loadFromLocalStorage();
            setPlayers(local);
            setLoading(false);
            return;
          }

          if (playersData && playersData.length > 0) {
            const cloudPlayers = playersData.map((p) => normalizePlayer(p) as Player);
            setPlayers(cloudPlayers);
            saveToLocalStorage(cloudPlayers);
          } else {
            const local = loadFromLocalStorage();
            if (local.length > 0) {
              const uploadedPlayers: Player[] = [];
              for (const player of local) {
                const row = playerToSupabaseRow(player, user.id);
                const { data, error: upsertError } = await supabase
                  .from("players")
                  .upsert(row, { onConflict: "id" })
                  .select()
                  .single();

                if (!upsertError && data) {
                  uploadedPlayers.push(normalizePlayer(data) as Player);
                } else {
                  uploadedPlayers.push(player);
                }
              }
              setPlayers(uploadedPlayers);
              saveToLocalStorage(uploadedPlayers);
            }
          }
        } else {
          const local = loadFromLocalStorage();
          setPlayers(local);
        }
      } catch (e) {
        console.error("Player load error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadPlayers();
  }, [user?.id]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conectado", { description: "Sincronizando com a nuvem..." });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Modo Offline", { description: "Dados salvos localmente" });
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleEdit = useCallback((player: Player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  }, []);

  const handleOpenNew = () => {
    setEditingPlayer(null);
    setIsModalOpen(true);
  };

  const handleSavePlayer = async (playerData: Omit<Player, "rating" | "user_id">) => {
    const isNew = !players.some(p => p.id === playerData.id);
    const attrs = playerData.attributes;
    const values = Object.values(attrs);
    const rating = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    
    const fullPlayer: Player = {
      ...playerData,
      rating,
    };

    const updatedPlayers = isNew 
      ? [...players, fullPlayer]
      : players.map((p) => (p.id === fullPlayer.id ? fullPlayer : p));

    setPlayers(updatedPlayers);
    saveToLocalStorage(updatedPlayers);

    if (user && isOnline) {
      setIsSyncing(true);
      try {
        const row = playerToSupabaseRow(fullPlayer, user.id);
        if (!isNew) {
          await supabase.from("players").update(row).eq("id", fullPlayer.id);
        } else {
          const { data, error } = await supabase.from("players").insert(row).select().single();
          if (!error && data) {
            const normalized = normalizePlayer(data) as Player;
            setPlayers((prev) => prev.map((p) => (p.id === fullPlayer.id ? normalized : p)));
          }
        }
        toast.success(isNew ? "Carta Criada" : "Carta Atualizada", { description: "Sincronizado com a nuvem" });
      } catch (e) {
        toast.warning(isNew ? "Carta Criada Localmente" : "Carta Atualizada Localmente");
      } finally {
        setIsSyncing(false);
      }
    } else {
      toast.success(isNew ? "Carta Criada" : "Carta Atualizada", { description: "Salvo localmente" });
    }
  };

  const handleDelete = useCallback(async (id: string) => {
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
        await supabase.from("players").delete().eq("id", id).eq("user_id", user.id);
        toast.success("Carta Excluída", { description: "Removida da nuvem" });
      } catch (e) {
        toast.error("Erro ao sincronizar exclusão", { description: "Removida localmente" });
      }
    } else {
      toast.success("Carta Excluída", { description: "Removida localmente" });
    }
  }, [players, user, isOnline, supabase]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    const allIds = new Set(players.map((p) => p.id));
    if (players.every((p) => selectedIds.has(p.id))) {
      setSelectedIds(new Set());
      toast.info("Seleção limpa");
    } else {
      setSelectedIds(allIds);
      toast.success(`${allIds.size} carta(s) selecionada(s)`);
    }
  }, [players, selectedIds]);

  const handleDrawTeams = () => {
    const selectedPlayers = players.filter((p) => selectedIds.has(p.id));
    const minRequiredPlayers = numTeams * playersPerTeam;

    if (selectedPlayers.length < minRequiredPlayers) {
      toast.error("Poucos Jogadores", {
        description: `Selecione pelo menos ${minRequiredPlayers} jogadores`,
      });
      return;
    }

    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const shuffledPlayers = shuffleArray(selectedPlayers);
    const ratingTiers: Player[][] = [[], [], [], [], []];
    
    shuffledPlayers.forEach((player) => {
      if (player.rating >= 90) ratingTiers[0].push(player);
      else if (player.rating >= 80) ratingTiers[1].push(player);
      else if (player.rating >= 70) ratingTiers[2].push(player);
      else if (player.rating >= 60) ratingTiers[3].push(player);
      else ratingTiers[4].push(player);
    });

    const sortedPlayers = ratingTiers.flat();
    const teams: Player[][] = Array.from({ length: numTeams }, () => []);
    
    const teamAttributeSums = Array.from({ length: numTeams }, () => ({
      velocidade: 0, resistencia: 0, chute: 0, posicionamento: 0,
      defesa: 0, drible: 0, passe: 0, fisico: 0,
    }));

    sortedPlayers.forEach((player) => {
      const teamTotals = teamAttributeSums.map((sums) =>
        Object.values(sums).reduce((a, b) => a + b, 0),
      );

      const minTotal = Math.min(...teamTotals);
      const teamsWithMinTotal = teamTotals
        .map((total, idx) => ({ total, idx }))
        .filter((t) => t.total === minTotal);

      const minIndex = teamsWithMinTotal[Math.floor(Math.random() * teamsWithMinTotal.length)].idx;
      teams[minIndex].push(player);

      const attrs = player.attributes ?? {
        velocidade: 0, resistencia: 0, chute: 0, posicionamento: 0,
        defesa: 0, drible: 0, passe: 0, fisico: 0,
      };
      
      teamAttributeSums[minIndex].velocidade += attrs.velocidade;
      teamAttributeSums[minIndex].resistencia += attrs.resistencia;
      teamAttributeSums[minIndex].chute += attrs.chute;
      teamAttributeSums[minIndex].posicionamento += attrs.posicionamento;
      teamAttributeSums[minIndex].defesa += attrs.defesa;
      teamAttributeSums[minIndex].drible += attrs.drible;
      teamAttributeSums[minIndex].passe += attrs.passe;
      teamAttributeSums[minIndex].fisico += attrs.fisico;
    });

    const teamColors = [
      { color: "bg-primary/10", borderColor: "border-primary/20", headerColor: "text-primary" },
      { color: "bg-danger/10", borderColor: "border-danger/20", headerColor: "text-danger" },
      { color: "bg-success/10", borderColor: "border-success/20", headerColor: "text-success" },
      { color: "bg-warning/10", borderColor: "border-warning/20", headerColor: "text-warning" },
      { color: "bg-secondary/10", borderColor: "border-secondary/20", headerColor: "text-secondary" },
      { color: "bg-default/10", borderColor: "border-default/20", headerColor: "text-default-foreground" },
      { color: "bg-primary/10", borderColor: "border-primary/20", headerColor: "text-primary" },
      { color: "bg-danger/10", borderColor: "border-danger/20", headerColor: "text-danger" },
    ];

    const resultTeams: TeamData[] = teams.map((teamMembers, idx) => ({
      name: `TIME ${String.fromCharCode(65 + idx)}`,
      members: teamMembers,
      avg: teamMembers.length
          ? Math.round(teamMembers.reduce((sum, p) => sum + (p.rating ?? 0), 0) / teamMembers.length)
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
      toast.error("Não Autenticado", { description: "Autenticação necessária para sincronizar" });
      return;
    }
    setIsSyncing(true);
    try {
      const syncedPlayers: Player[] = [];
      for (const player of players) {
        const row = playerToSupabaseRow(player, user.id);
        const { data, error } = await supabase.from("players").upsert(row, { onConflict: "id" }).select().single();
        if (!error && data) {
          syncedPlayers.push(normalizePlayer(data) as Player);
        } else {
          syncedPlayers.push(player);
        }
      }
      setPlayers(syncedPlayers);
      saveToLocalStorage(syncedPlayers);
      toast.success("Sincronização Completa", { description: `${players.length} cartas sincronizadas` });
    } catch (e) {
      toast.error("Erro na Sincronização");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredPlayers = useMemo(() => {
    const result = players.filter((player) => player.name.toLowerCase().includes(searchQuery.toLowerCase()));
    result.sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "rating": return b.rating - a.rating;
        case "position": return a.position.localeCompare(b.position);
        default: return 0;
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
            <Loader2 className="w-12 h-12 animate-spin text-default-500" />
            <p className="text-default-500">Carregando...</p>
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
        <header className="sticky top-0 z-40 bg-content1/95 backdrop-blur-sm border-b border-divider shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 justify-between">
                <div className="flex-1 w-full">
                    <Input
                        placeholder="Buscar jogador..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        startContent={<Search size={18} className="text-default-400" />}
                        className="w-full"
                        size="sm"
                    />
                </div>

                <div className="flex items-center gap-2 justify-between sm:justify-start w-full sm:w-auto">
                  <Select
                    selectedKeys={[sortBy]}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-32"
                    size="sm"
                    aria-label="Ordenar por"
                  >
                    <SelectItem key="rating" value="rating">Rating ↓</SelectItem>
                    <SelectItem key="name" value="name">Nome A-Z</SelectItem>
                    <SelectItem key="position" value="position">Posição</SelectItem>
                  </Select>

                  <ButtonGroup size="sm" variant="flat">
                    <Button
                        isIconOnly
                        onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                        aria-label={viewMode === "grid" ? "Modo lista" : "Modo grid"}
                    >
                        {viewMode === "grid" ? <List size={20} /> : <Grid3x3 size={20} />}
                    </Button>
                    <Button
                        isIconOnly
                        onPress={handleManualSync}
                        isDisabled={!isAuthenticated || isSyncing}
                        aria-label={isOnline ? "Sincronizar com nuvem" : "Offline - Salvando localmente"}
                    >
                        {isSyncing ? <Loader2 size={18} className="animate-spin" /> : isOnline ? <Cloud size={18} /> : <HardDrive size={18} />}
                    </Button>
                  </ButtonGroup>
                  <UserMenu />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onPress={handleToggleSelectAll}
                  variant="flat"
                  startContent={players.every((p) => selectedIds.has(p.id)) ? <X size={16} /> : <CheckCircle2 size={16} />}
                  size="sm"
                >
                  {players.every((p) => selectedIds.has(p.id)) ? "Desmarcar Todas" : "Selecionar Todas"}
                </Button>

                <Button
                  onPress={handleOpenNew}
                  color="primary"
                  startContent={<Plus size={16} />}
                  size="sm"
                >
                  Nova Carta
                </Button>

                {selectedIds.size > 0 && (
                  <Button
                    onPress={() => setIsTeamConfigOpen(true)}
                    color="secondary"
                    startContent={<Shuffle size={16} />}
                    size="sm"
                  >
                    Sortear Times ({selectedIds.size})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-16 text-default-500">
              <User size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">
                {searchQuery ? "Nenhuma carta encontrada" : "Nenhuma carta criada ainda"}
              </p>
              <p className="text-sm mt-2">
                {searchQuery ? "Tente ajustar a busca" : "Clique em 'Nova Carta' para começar"}
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
                  className={`relative cursor-pointer transition-all group ${selectedIds.has(player.id) ? "ring-2 ring-primary rounded-lg bg-primary/10" : ""}`}
                >
                  <MiniPlayerRow player={player} />
                  
                  {selectedIds.has(player.id) && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-2 z-10 pointer-events-none">
                      <CheckCircle2 size={20} className="text-primary" fill="currentColor" />
                    </div>
                  )}

                  <div className="absolute top-1/2 -translate-y-1/2 right-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                    <Button
                        isIconOnly
                        size="sm"
                        color="primary"
                        radius="full"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(player);
                        }}
                    >
                        <Pencil size={14} />
                    </Button>
                    <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        radius="full"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(player.id);
                        }}
                    >
                        <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <PlayerModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSavePlayer}
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
