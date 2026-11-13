"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, User, Shuffle, CheckCircle2, Pencil, Search, Grid3x3, List, FileUp, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { excluirJogador, importarJogadores, salvarJogador } from "@/app/actions/jogador";
import { desvincularJogador } from "@/app/actions/vinculo";
import { GrupoSwitcher } from "@/components/grupo/grupo-switcher";
import { AbasDoGrupo } from "@/components/partida/grupo-nav";
import { ConvidarModal } from "@/components/convite/convidar-modal";
import { QuemSouEu } from "@/components/jogador/quem-sou-eu";
import { capacidades } from "@/lib/capacidades";
import { useSorteioRapido } from "@/hooks/use-sorteio-rapido";
import { UserMenu } from "@/components/auth/user-menu";
import type { Participacao } from "@/lib/grupo";
import { isDataUrlImage, uploadPlayerImage } from "@/lib/player-image";
import { createClient } from "@/lib/supabase/client";
import { meuJogador } from "@/lib/vinculo";
import type { Player } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BrandLockup, Logo } from "@/components/ui/logo";
import { PlayerCard } from "@/components/player/PlayerCard";
import { MiniPlayerRow } from "@/components/player/MiniPlayerRow";
import { PlayerModal } from "@/components/player/PlayerModal";
import { ImportCsvModal } from "@/components/player/ImportCsvModal";
import { TeamConfigModal } from "@/components/team/TeamConfigModal";
import { DrawTeamsModal } from "@/components/team/DrawTeamsModal";

type DadosDaCarta = Omit<Player, "rating" | "user_id">;

/** What the Server Actions take: no rating (the server computes it), author or link. */
const paraSalvar = (j: DadosDaCarta) => ({
  id: j.id,
  name: j.name,
  position: j.position,
  nationality: j.nationality,
  image: j.image,
  attributes: j.attributes,
});

/**
 * Before the Elenco was read on the server, the browser kept a copy of each
 * Grupo's Jogadores and the last Grupo opened. Drop those leftovers.
 */
function esquecerCacheAntigo() {
  try {
    const antigas = Object.keys(localStorage).filter(
      (k) => k.startsWith("fut-cards-players-v2") || k.startsWith("squadra:grupo-atual:"),
    );
    for (const k of antigas) localStorage.removeItem(k);
  } catch {
    /* storage unavailable: nothing to clean */
  }
}

/**
 * `/g/<slug>`: the Grupo's Elenco. The Jogadores come from the server render;
 * every change goes through a Server Action, which revalidates the page and
 * brings the new list back. Only view state (search, sort, selection, the
 * quick draw) lives here.
 */
export function ElencoView({
  grupo,
  participacoes,
  jogadores: players,
  userId,
}: {
  grupo: Participacao;
  participacoes: readonly Participacao[];
  jogadores: Player[];
  userId: string;
}) {
  const router = useRouter();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [isTeamConfigOpen, setIsTeamConfigOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [isConvidarOpen, setIsConvidarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "position">("rating");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // What the papel allows. RLS enforces it; this only hides what would fail.
  const pode = useMemo(() => capacidades(grupo.papel, userId), [grupo.papel, userId]);

  const sorteio = useSorteioRapido(players);
  const { selectedIds, todosMarcados, alternar: toggleSelect } = sorteio;

  useEffect(esquecerCacheAntigo, []);

  const toggleSelectAll = () => {
    if (todosMarcados) {
      sorteio.limpar();
      toast.info("Seleção limpa");
    } else {
      sorteio.marcarTodos();
      toast.success(`${players.length} carta(s) selecionada(s)`);
    }
  };

  const trocarDeGrupo = useCallback((novo: string) => router.push(`/g/${novo}`), [router]);

  const salvar = useCallback(
    async (dados: DadosDaCarta): Promise<boolean> => {
      let image = dados.image;
      // A new photo (or one still stored inline) goes to Storage first; the action only takes its URL.
      if (image && isDataUrlImage(image)) {
        try {
          image = await uploadPlayerImage(createClient(), grupo.id, dados.id, image);
        } catch (e) {
          console.error("[elenco] Photo upload failed:", e);
          toast.error("Não deu pra enviar a foto", { description: "Tente de novo, ou salve sem foto." });
          return false;
        }
      }
      const resultado = await salvarJogador(grupo.slug, paraSalvar({ ...dados, image }));
      if (!resultado.ok) {
        toast.error("Não deu pra salvar a carta", { description: resultado.message });
        return false;
      }
      toast.success(resultado.valor.criado ? "Carta criada" : "Carta atualizada");
      return true;
    },
    [grupo.id, grupo.slug],
  );

  const excluir = useCallback(
    async (id: string) => {
      const resultado = await excluirJogador(grupo.slug, id);
      if (!resultado.ok) {
        toast.error("Não deu pra excluir a carta", { description: resultado.message });
        return;
      }
      toast.success("Carta excluída");
    },
    [grupo.slug],
  );

  const importar = useCallback(
    async (lista: Player[]) => {
      const resultado = await importarJogadores(grupo.slug, lista.map(paraSalvar));
      if (!resultado.ok) {
        toast.error("Não deu pra importar", { description: resultado.message });
        throw new Error(resultado.message);
      }
      toast.success("Importação concluída", { description: `${resultado.valor.total} carta(s)` });
    },
    [grupo.slug],
  );

  const handleEdit = useCallback((player: Player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  }, []);

  const handleDesvincular = useCallback(
    async (player: Player) => {
      if (!window.confirm(`Desvincular a conta de ${player.name}? O jogador continua no elenco.`)) return;
      const resultado = await desvincularJogador(grupo.slug, player.id);
      if (!resultado.ok) {
        toast.error("Não deu pra desvincular", { description: resultado.message });
        return;
      }
      toast.success("Conta desvinculada", { description: `${player.name} continua no elenco.` });
    },
    [grupo.slug],
  );

  const handleOpenNew = () => {
    setEditingPlayer(null);
    setIsModalOpen(true);
  };

  const handleDrawTeams = () => {
    if (!sorteio.sortear()) {
      toast.error("Poucos jogadores", { description: `Faltam ${sorteio.faltam} jogadores pra esse sorteio` });
      return;
    }
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
                      <span aria-hidden="true" className="h-6 w-px shrink-0 bg-divider" />
                      <div className="min-w-0 max-w-[9rem] sm:max-w-[16rem]">
                        <GrupoSwitcher grupo={grupo} participacoes={participacoes} onTrocar={trocarDeGrupo} />
                      </div>
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

                  <Button
                      isIconOnly
                      variant="flat"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                      aria-label={viewMode === "grid" ? "Modo lista" : "Modo grid"}
                  >
                      {viewMode === "grid" ? <List size={20} /> : <Grid3x3 size={20} />}
                  </Button>
                  <UserMenu />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={toggleSelectAll}
                  variant="flat"
                  startContent={todosMarcados ? <X size={16} /> : <CheckCircle2 size={16} />}
                  size="sm"
                  className="min-w-0"
                >
                  <span className="sm:hidden">{todosMarcados ? "Desmarcar" : "Selecionar"}</span>
                  <span className="hidden sm:inline">{todosMarcados ? "Desmarcar todas" : "Selecionar todas"}</span>
                </Button>

                {pode.editaElenco && (
                  <>
                <Button
                  onClick={handleOpenNew}
                  color="primary"
                  startContent={<Plus size={16} />}
                  size="sm"
                >
                  <span className="sm:hidden">Nova</span>
                  <span className="hidden sm:inline">Nova carta</span>
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
                  </>
                )}

                {pode.convida && (
                    <Button
                      onClick={() => setIsConvidarOpen(true)}
                      variant="flat"
                      startContent={<UserPlus size={16} />}
                      size="sm"
                    >
                      Convidar
                    </Button>
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
                    <span className="hidden sm:inline">Sortear times ({selectedIds.size})</span>
                  </Button>
                )}
              </div>
            </div>
            <AbasDoGrupo slug={grupo.slug} aba="elenco" className="-mb-3 sm:-mb-4" />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          {!meuJogador(players, userId) && (
            <QuemSouEu grupo={grupo} players={players} />
          )}
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
                  : pode.editaElenco
                    ? "Clique em Nova carta para começar"
                    : "Quem organiza o fut cadastra os jogadores"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 justify-items-center">
              {filteredPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onDelete={pode.editaElenco ? excluir : undefined}
                  onEdit={pode.editaElenco ? handleEdit : undefined}
                  onDesvincular={pode.desvincula(player) ? handleDesvincular : undefined}
                  isMine={player.conta_id === userId}
                  isSelected={selectedIds.has(player.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  onClick={() => toggleSelect(player.id)}
                  className={`relative cursor-pointer transition-all group ${selectedIds.has(player.id) ? "ring-2 ring-primary rounded-lg bg-primary/10" : ""}`}
                >
                  <MiniPlayerRow
                    player={player}
                    isSelected={selectedIds.has(player.id)}
                    actions={
                      pode.editaElenco ? (
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
                                void excluir(player.id);
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
            onSave={salvar}
            initialData={editingPlayer}
        />

        {/* Mounted only while open, so its copy of the Grupo's name isn't on the page otherwise. */}
        {pode.convida && isConvidarOpen && (
          <ConvidarModal isOpen onClose={() => setIsConvidarOpen(false)} grupo={grupo} />
        )}

        <ImportCsvModal
            isOpen={isImportCsvOpen}
            onClose={() => setIsImportCsvOpen(false)}
            onImport={importar}
        />

        <TeamConfigModal
            isOpen={isTeamConfigOpen}
            onClose={() => setIsTeamConfigOpen(false)}
            numTeams={sorteio.numTimes}
            setNumTeams={sorteio.setNumTimes}
            minimoPorTime={sorteio.minimoPorTime}
            setMinimoPorTime={sorteio.setMinimoPorTime}
            selectedCount={selectedIds.size}
            faltam={sorteio.faltam}
            onDraw={handleDrawTeams}
        />

        <DrawTeamsModal
            isOpen={isDrawModalOpen}
            onClose={() => setIsDrawModalOpen(false)}
            generatedTeams={sorteio.times}
            onMover={sorteio.mover}
            onRedraw={handleDrawTeams}
        />

      </div>
    </>
  );
}
