"use client";

import type React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Plus, X, Trash2, User, Shuffle, CheckCircle2, Loader2, Pencil, Search, Grid3x3, List, Cloud, HardDrive, FileUp, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useElenco } from "@/hooks/use-elenco";
import { useGrupo } from "@/hooks/use-grupo";
import { NomearGrupo } from "@/components/grupo/nomear-grupo";
import { GrupoSwitcher } from "@/components/grupo/grupo-switcher";
import { slugDoCaminho } from "@/lib/grupo";
import { ConvidarModal } from "@/components/convite/convidar-modal";
import { caminhoDoConvite, convitePendente } from "@/lib/convite";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthErrorWatcher } from "@/components/auth/auth-error-watcher";
import { UserMenu } from "@/components/auth/user-menu";
import { isSupabaseConfigured } from "@/lib/sessao";
import type { Player, Time } from "@/types";
import { sortearTimes } from "@/lib/sorteio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { BrandLockup, Logo } from "@/components/ui/logo";
import { Surface } from "@/components/ui/surface";

// Import refactored components
import { PlayerCard } from "@/components/player/PlayerCard";
import { MiniPlayerRow } from "@/components/player/MiniPlayerRow";
import { PlayerModal } from "@/components/player/PlayerModal";
import { ImportCsvModal } from "@/components/player/ImportCsvModal";
import { TeamConfigModal } from "@/components/team/TeamConfigModal";
import { DrawTeamsModal } from "@/components/team/DrawTeamsModal";

export function ElencoApp() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const slug = slugDoCaminho(usePathname());
  const { state: grupoState, participacoes, definirGrupo, tentarDeNovo } = useGrupo(user?.id, slug);
  const grupo = grupoState.status === "pronto" ? grupoState.grupo : null;
  // Only the dono and admins edit the Elenco (RLS enforces it; this just hides what would fail).
  const podeEditar = grupo?.papel === "dono" || grupo?.papel === "admin";
  // Someone who opened an invite and has no Grupo yet goes back to it, never to the naming screen.
  const conviteDoNovato = grupoState.status === "sem-grupo" ? convitePendente() : null;
  const userId = user?.id;
  const grupoId = grupo?.id;
  const elencoScope = useMemo(
    () => (userId && grupoId ? { userId, grupoId } : null),
    [userId, grupoId],
  );
  const {
    players,
    selectedIds,
    loading,
    isSyncing,
    isOnline,
    actions: elencoActions,
  } = useElenco(elencoScope);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [isTeamConfigOpen, setIsTeamConfigOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [isConvidarOpen, setIsConvidarOpen] = useState(false);

  const [generatedTeams, setGeneratedTeams] = useState<Time[] | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "position">("rating");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [numTeams, setNumTeams] = useState(3);
  const [minPlayersPerTeam, setMinPlayersPerTeam] = useState(5);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const resetViewState = () => {
      setGeneratedTeams(null);
      setEditingPlayer(null);
    };
    // Hard reset view-local state whenever the user or the Grupo changes
    resetViewState();
  }, [user?.id, grupoId]);

  // The URL always names the open Grupo: `/` becomes `/g/<slug>`, so the link
  // can be shared. Replace, not push, so Back doesn't bounce through `/`.
  const grupoSlug = grupo?.slug;
  useEffect(() => {
    if (grupoSlug && slug !== grupoSlug) window.history.replaceState(null, "", `/g/${grupoSlug}`);
  }, [grupoSlug, slug]);

  useEffect(() => {
    if (conviteDoNovato) window.location.replace(caminhoDoConvite(conviteDoNovato));
  }, [conviteDoNovato]);

  // Switching Grupos only changes the URL; the app follows it without remounting.
  const trocarDeGrupo = useCallback((novo: string) => {
    window.history.pushState(null, "", `/g/${novo}`);
  }, []);

  const handleEdit = useCallback((player: Player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  }, []);

  const handleOpenNew = () => {
    setEditingPlayer(null);
    setIsModalOpen(true);
  };

  const handleDrawTeams = () => {
    const selectedPlayers = players.filter((p) => selectedIds.has(p.id));
    const minRequiredPlayers = numTeams * minPlayersPerTeam;

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

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Surface className="max-w-md">
          <h1 className="text-title">Supabase não configurado</h1>
          <p className="text-muted mt-1">
            Crie <code className="text-foreground">.env.local</code> na raiz com
            NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY, depois reinicie{" "}
            <code className="text-foreground">npm run dev</code>.
          </p>
        </Surface>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <FullScreenLoader />
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthErrorWatcher />
        <AuthShell>
          <AuthPanel />
        </AuthShell>
      </>
    );
  }

  if (grupoState.status === "loading") {
    return <FullScreenLoader />;
  }

  if (grupoState.status === "sem-grupo") {
    if (conviteDoNovato) return <FullScreenLoader />;
    return <NomearGrupo onCriado={definirGrupo} />;
  }

  if (grupoState.status === "nao-encontrado") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Surface className="max-w-md flex flex-col gap-4">
          <div>
            <h1 className="text-title">Esse fut não existe</h1>
            <p className="text-muted mt-1">Ou você ainda não faz parte dele. Peça o convite pra quem organiza.</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button color="primary" radius="full" onClick={() => window.history.pushState(null, "", "/")}>
              Ir pro meu fut
            </Button>
            <UserMenu />
          </div>
        </Surface>
      </div>
    );
  }

  if (grupoState.status === "erro") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Surface className="max-w-md flex flex-col gap-4">
          <div>
            <h1 className="text-title">Não deu pra abrir seu fut</h1>
            <p className="text-muted mt-1">Confira a conexão e tente de novo.</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button color="primary" radius="full" onClick={tentarDeNovo}>
              Tentar de novo
            </Button>
            <UserMenu />
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <header className="sticky top-0 z-40 bg-content1/95 backdrop-blur-sm border-b border-divider shadow-lg">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 justify-between">
                <div className="flex flex-1 w-full min-w-0 items-center gap-3">
                    <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
                      <BrandLockup compactOnMobile />
                      {grupo && (
                        <>
                          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-divider" />
                          <div className="min-w-0 max-w-[9rem] sm:max-w-[16rem]">
                            <GrupoSwitcher grupo={grupo} participacoes={participacoes} onTrocar={trocarDeGrupo} />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <Input
                            placeholder="Buscar jogador..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            startContent={<Search size={18} className="text-default-400 shrink-0" />}
                            className="w-full"
                            size="sm"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-start w-full sm:w-auto">
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 min-w-[7.5rem] sm:flex-none sm:w-32"
                    size="sm"
                    aria-label="Ordenar por"
                  >
                    <option value="rating">Rating ↓</option>
                    <option value="name">Nome A-Z</option>
                    <option value="position">Posição</option>
                  </Select>

                  <div className="flex shrink-0 overflow-hidden rounded-xl">
                    <Button
                        isIconOnly
                        variant="flat"
                        size="sm"
                        className="rounded-r-none"
                        onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                        aria-label={viewMode === "grid" ? "Modo lista" : "Modo grid"}
                    >
                        {viewMode === "grid" ? <List size={20} /> : <Grid3x3 size={20} />}
                    </Button>
                    <Button
                        isIconOnly
                        variant="flat"
                        size="sm"
                        className="rounded-l-none border-l border-default-300"
                        onClick={elencoActions.sync}
                        isDisabled={!isAuthenticated || isSyncing}
                        aria-label={isOnline ? "Sincronizar com nuvem" : "Offline - Salvando localmente"}
                    >
                        {isSyncing ? <Loader2 size={18} className="animate-spin" /> : isOnline ? <Cloud size={18} /> : <HardDrive size={18} />}
                    </Button>
                  </div>
                  <UserMenu />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={elencoActions.toggleSelectAll}
                  variant="flat"
                  startContent={players.every((p) => selectedIds.has(p.id)) ? <X size={16} /> : <CheckCircle2 size={16} />}
                  size="sm"
                  className="min-w-0"
                >
                  <span className="sm:hidden">{players.every((p) => selectedIds.has(p.id)) ? "Desmarcar" : "Selecionar"}</span>
                  <span className="hidden sm:inline">{players.every((p) => selectedIds.has(p.id)) ? "Desmarcar Todas" : "Selecionar Todas"}</span>
                </Button>

                {podeEditar && (
                  <>
                <Button
                  onClick={handleOpenNew}
                  color="primary"
                  startContent={<Plus size={16} />}
                  size="sm"
                >
                  <span className="sm:hidden">Nova</span>
                  <span className="hidden sm:inline">Nova Carta</span>
                </Button>

                <Button
                  onClick={() => setIsImportCsvOpen(true)}
                  variant="flat"
                  startContent={<FileUp size={16} />}
                  size="sm"
                >
                  <span className="sm:hidden">CSV</span>
                  <span className="hidden sm:inline">Importar CSV</span>
                </Button>

                    {grupo && (
                      <Button
                        onClick={() => setIsConvidarOpen(true)}
                        variant="flat"
                        startContent={<UserPlus size={16} />}
                        size="sm"
                      >
                        Convidar
                      </Button>
                    )}
                  </>
                )}

                {selectedIds.size > 0 && (
                  <Button
                    onClick={() => setIsTeamConfigOpen(true)}
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
            <div className="text-center py-12 sm:py-16 px-2">
              {searchQuery ? (
                <User size={64} className="mx-auto mb-4 text-default-400" aria-hidden="true" />
              ) : (
                <Logo className="mx-auto mb-4 h-20 w-20 opacity-90" />
              )}
              <p className="text-section">
                {searchQuery ? "Nenhuma carta encontrada" : "Nenhuma carta criada ainda"}
              </p>
              <p className="text-muted mt-2">
                {searchQuery
                  ? "Tente ajustar a busca"
                  : podeEditar
                    ? "Clique em 'Nova Carta' para começar"
                    : "Quem organiza o fut cadastra os Jogadores"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 justify-items-center">
              {filteredPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onDelete={podeEditar ? elencoActions.delete : undefined}
                  onEdit={podeEditar ? handleEdit : undefined}
                  isSelected={selectedIds.has(player.id)}
                  onToggleSelect={elencoActions.toggleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  onClick={() => elencoActions.toggleSelect(player.id)}
                  className={`relative cursor-pointer transition-all group ${selectedIds.has(player.id) ? "ring-2 ring-primary rounded-lg bg-primary/10" : ""}`}
                >
                  <MiniPlayerRow
                    player={player}
                    isSelected={selectedIds.has(player.id)}
                    actions={
                      podeEditar ? (
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
                                elencoActions.delete(player.id);
                            }}
                            aria-label={`Excluir ${player.name}`}
                        >
                            <Trash2 size={14} />
                        </Button>
                      </div>
                      ) : undefined
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
            onSave={elencoActions.save}
            initialData={editingPlayer}
        />

        {grupo && podeEditar && (
          <ConvidarModal isOpen={isConvidarOpen} onClose={() => setIsConvidarOpen(false)} grupo={grupo} />
        )}

        <ImportCsvModal
            isOpen={isImportCsvOpen}
            onClose={() => setIsImportCsvOpen(false)}
            onImport={elencoActions.importMany}
        />

        <TeamConfigModal
            isOpen={isTeamConfigOpen}
            onClose={() => setIsTeamConfigOpen(false)}
            numTeams={numTeams}
            setNumTeams={setNumTeams}
            minPlayersPerTeam={minPlayersPerTeam}
            setMinPlayersPerTeam={setMinPlayersPerTeam}
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
