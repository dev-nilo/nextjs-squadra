"use client";

import type React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, X, Trash2, User, Shuffle, CheckCircle2, Loader2, Pencil, Search, Grid3x3, List, Cloud, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth/auth-modal";
import { AuthErrorWatcher } from "@/components/auth/auth-error-watcher";
import { UserMenu } from "@/components/auth/user-menu";
import { createClient } from "@/lib/supabase/client";
import { calculateOVR } from "@/lib/jogador";
import {
  createElencoDeps,
  deleteJogador,
  loadElenco,
  saveJogador,
  syncElenco,
} from "@/lib/elenco";
import type { Player, Time } from "@/types";
import { sortearTimes } from "@/lib/sorteio";
import { Button, Input, Select, SelectItem, ButtonGroup } from "@nextui-org/react";

// Import refactored components
import { PlayerCard } from "@/components/player/PlayerCard";
import { MiniPlayerRow } from "@/components/player/MiniPlayerRow";
import { PlayerModal } from "@/components/player/PlayerModal";
import { TeamConfigModal } from "@/components/team/TeamConfigModal";
import { DrawTeamsModal } from "@/components/team/DrawTeamsModal";

export default function App() {
  const elenco = useMemo(() => createElencoDeps(createClient()), []);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTeamConfigOpen, setIsTeamConfigOpen] = useState(false);
  
  const [generatedTeams, setGeneratedTeams] = useState<Time[] | null>(null);
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
    // Hard reset UI state whenever the authenticated user changes
    setPlayers([]);
    setSelectedIds(new Set());
    setGeneratedTeams(null);
    setEditingPlayer(null);

    const loadPlayers = async () => {
      setLoading(true);
      try {
        if (!user) {
          setPlayers([]);
          return;
        }
        const roster = await loadElenco(elenco, user.id);
        setPlayers(roster);
      } catch (e) {
        console.error("Player load error:", e);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };
    loadPlayers();
  }, [user?.id, elenco]);

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
    if (!user) {
      toast.error("Não autenticado", { description: "Faça login para gerenciar suas cartas." });
      return;
    }

    const isNew = !players.some((p) => p.id === playerData.id);
    const rating = calculateOVR(playerData.attributes);
    const fullPlayer: Player = {
      ...playerData,
      rating,
      user_id: user.id,
    };

    // Optimistic paint before cloud round-trip
    setPlayers(
      isNew
        ? [...players, fullPlayer]
        : players.map((p) => (p.id === fullPlayer.id ? fullPlayer : p)),
    );

    if (isOnline) {
      setIsSyncing(true);
      try {
        const { roster } = await saveJogador(elenco, user.id, fullPlayer, {
          roster: players,
          isNew,
          online: true,
        });
        setPlayers(roster);
        toast.success(isNew ? "Carta Criada" : "Carta Atualizada", {
          description: "Sincronizado com a nuvem",
        });
      } catch (e) {
        console.error("[app] Failed to sync player:", e);
        const { roster } = await saveJogador(elenco, user.id, fullPlayer, {
          roster: players,
          isNew,
          online: false,
        });
        setPlayers(roster);
        toast.warning(isNew ? "Carta Criada Localmente" : "Carta Atualizada Localmente", {
          description: "Salvo no navegador; a nuvem recusou o sync.",
        });
      } finally {
        setIsSyncing(false);
      }
    } else {
      const { roster } = await saveJogador(elenco, user.id, fullPlayer, {
        roster: players,
        isNew,
        online: false,
      });
      setPlayers(roster);
      toast.success(isNew ? "Carta Criada" : "Carta Atualizada", {
        description: "Salvo localmente",
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return;

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      try {
        const roster = await deleteJogador(elenco, user.id, id, {
          roster: players,
          online: isOnline,
        });
        setPlayers(roster);
        toast.success("Carta Excluída", {
          description: isOnline ? "Removida da nuvem" : "Removida localmente",
        });
      } catch (e) {
        const roster = await deleteJogador(elenco, user.id, id, {
          roster: players,
          online: false,
        });
        setPlayers(roster);
        toast.error("Erro ao sincronizar exclusão", {
          description: "Removida localmente",
        });
      }
    },
    [players, user, isOnline, elenco],
  );

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

    setGeneratedTeams(sortearTimes(selectedPlayers, numTeams));
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
      const syncedPlayers = await syncElenco(elenco, user.id, players);
      setPlayers(syncedPlayers);
      toast.success("Sincronização Completa", {
        description: `${syncedPlayers.length} cartas sincronizadas`,
      });
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
        <Toaster position="top-center" richColors />
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
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
        <Toaster position="top-center" richColors />
        <AuthErrorWatcher />
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
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <header className="sticky top-0 z-40 bg-content1/95 backdrop-blur-sm border-b border-divider shadow-lg">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 justify-between">
                <div className="flex-1 w-full min-w-0">
                    <Input
                        placeholder="Buscar jogador..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        startContent={<Search size={18} className="text-default-400 shrink-0" />}
                        className="w-full"
                        size="sm"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-start w-full sm:w-auto">
                  <Select
                    selectedKeys={[sortBy]}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 min-w-[7.5rem] sm:flex-none sm:w-32"
                    size="sm"
                    aria-label="Ordenar por"
                  >
                    <SelectItem key="rating" value="rating">Rating ↓</SelectItem>
                    <SelectItem key="name" value="name">Nome A-Z</SelectItem>
                    <SelectItem key="position" value="position">Posição</SelectItem>
                  </Select>

                  <ButtonGroup size="sm" variant="flat" className="shrink-0">
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
                  className="min-w-0"
                >
                  <span className="sm:hidden">{players.every((p) => selectedIds.has(p.id)) ? "Desmarcar" : "Selecionar"}</span>
                  <span className="hidden sm:inline">{players.every((p) => selectedIds.has(p.id)) ? "Desmarcar Todas" : "Selecionar Todas"}</span>
                </Button>

                <Button
                  onPress={handleOpenNew}
                  color="primary"
                  startContent={<Plus size={16} />}
                  size="sm"
                >
                  <span className="sm:hidden">Nova</span>
                  <span className="hidden sm:inline">Nova Carta</span>
                </Button>

                {selectedIds.size > 0 && (
                  <Button
                    onPress={() => setIsTeamConfigOpen(true)}
                    color="secondary"
                    startContent={<Shuffle size={16} />}
                    size="sm"
                    className="min-w-0"
                  >
                    <span className="sm:hidden">Sortear ({selectedIds.size})</span>
                    <span className="hidden sm:inline">Sortear Times ({selectedIds.size})</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12 sm:py-16 text-default-500 px-2">
              <User size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-base sm:text-lg">
                {searchQuery ? "Nenhuma carta encontrada" : "Nenhuma carta criada ainda"}
              </p>
              <p className="text-sm mt-2">
                {searchQuery ? "Tente ajustar a busca" : "Clique em 'Nova Carta' para começar"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 justify-items-center">
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
                  <MiniPlayerRow
                    player={player}
                    isSelected={selectedIds.has(player.id)}
                    actions={
                      <div className="flex gap-1.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                            isIconOnly
                            size="sm"
                            color="primary"
                            radius="full"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(player);
                            }}
                            aria-label={`Editar ${player.name}`}
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
                            aria-label={`Excluir ${player.name}`}
                        >
                            <Trash2 size={14} />
                        </Button>
                      </div>
                    }
                  />
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
