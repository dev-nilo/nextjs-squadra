"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { FileUp, Plus, Search, Shuffle, User, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { excluirJogador, importarJogadores, salvarJogador } from "@/app/actions/jogador";
import { desvincularJogador, vincularJogador } from "@/app/actions/vinculo";
import { ConvidarModal } from "@/components/convite/convidar-modal";
import { CartaAberta } from "@/components/elenco/carta-aberta";
import { capacidades, SO_LEITURA } from "@/lib/capacidades";
import { useSemConexao } from "@/lib/pwa/conexao";
import { useSorteioRapido } from "@/hooks/use-sorteio-rapido";
import type { Participacao } from "@/lib/grupo";
import { isDataUrlImage, uploadPlayerImage } from "@/lib/player-image";
import { createClient } from "@/lib/supabase/client";
import { meuJogador } from "@/lib/vinculo";
import type { Player } from "@/types";
import { Button } from "@/components/ui/button";
import { MenuDeAcoes } from "@/components/ui/menu-de-acoes";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Logo } from "@/components/ui/logo";
import { PlayerCard } from "@/components/player/PlayerCard";
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
 * `/g/<slug>/elenco`: the fut's album of cards. The Jogadores come from the
 * server render; every change goes through a Server Action, which revalidates
 * the page and brings the new list back. Only view state (search, sort, the
 * opened card, the quick draw) lives here.
 *
 * A tap opens a card with its actions. "Sortear rápido" (in the ⋯ menu) is a
 * mode where taps tick cards instead, with a counter bar to draw Times.
 */
export function ElencoView({
  grupo,
  jogadores: players,
  userId,
}: {
  grupo: Participacao;
  jogadores: Player[];
  userId: string;
}) {

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [isTeamConfigOpen, setIsTeamConfigOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [isConvidarOpen, setIsConvidarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "position">("rating");
  const [aberta, setAberta] = useState<Player | null>(null);
  const [selecionando, setSelecionando] = useState(false);

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // What the papel allows. RLS enforces it; this only hides what would fail.
  const semConexao = useSemConexao();
  // With no signal the album is read-only: no new cards, no edits, no claiming.
  const pode = useMemo(() => (semConexao ? SO_LEITURA : capacidades(grupo.papel, userId)), [semConexao, grupo.papel, userId]);

  const sorteio = useSorteioRapido(players);
  const { selectedIds, todosMarcados, alternar: toggleSelect } = sorteio;

  useEffect(esquecerCacheAntigo, []);

  const meu = meuJogador(players, userId);

  const toggleSelectAll = () => (todosMarcados ? sorteio.limpar() : sorteio.marcarTodos());

  const sairDaSelecao = () => {
    sorteio.limpar();
    setSelecionando(false);
  };

  const tocar = (player: Player) => (selecionando ? toggleSelect(player.id) : setAberta(player));

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
    async (player: Player) => {
      if (!window.confirm(`Excluir a carta de ${player.name}? Não dá pra desfazer.`)) return;
      setAberta(null);
      const resultado = await excluirJogador(grupo.slug, player.id);
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
    setAberta(null);
    setEditingPlayer(player);
    setIsModalOpen(true);
  }, []);

  const souEu = useCallback(
    async (player: Player) => {
      const resultado = await vincularJogador(grupo.slug, player.id);
      if (!resultado.ok) {
        toast.error("Não deu pra vincular", { description: resultado.message });
        return;
      }
      setAberta(null);
      toast.success(`Pronto, você é o ${player.name}`);
    },
    [grupo.slug],
  );

  const handleDesvincular = useCallback(
    async (player: Player) => {
      if (!window.confirm(`Desvincular a conta de ${player.name}? O jogador continua no elenco.`)) return;
      const resultado = await desvincularJogador(grupo.slug, player.id);
      if (!resultado.ok) {
        toast.error("Não deu pra desvincular", { description: resultado.message });
        return;
      }
      setAberta(null);
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

  const ordenar = (valor: string) => setSortBy(valor as typeof sortBy);

  return (
    <>
      <div className={`flex flex-col gap-4 ${selecionando ? "pb-24" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-title">
            Elenco <span className="font-normal text-default-500 tabular-nums">{players.length}</span>
          </h1>
          <div className="flex items-center gap-2">
            {pode.editaElenco && (
              <Button onClick={handleOpenNew} color="primary" startContent={<Plus size={16} />} size="sm">
                Nova carta
              </Button>
            )}
            <MenuDeAcoes
              nome="Mais ações do elenco"
              acoes={[
                { rotulo: "Sortear rápido", icone: <Shuffle size={16} />, onSelect: () => setSelecionando(true) },
                ...(pode.editaElenco ? [{ rotulo: "Importar CSV", icone: <FileUp size={16} />, onSelect: () => setIsImportCsvOpen(true) }] : []),
                ...(pode.convida ? [{ rotulo: "Convidar", icone: <UserPlus size={16} />, onSelect: () => setIsConvidarOpen(true) }] : []),
              ]}
            />
          </div>
        </div>

        {selecionando ? (
          <p className="text-muted">Toque nas cartas de quem vai jogar.</p>
        ) : (
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Input
                placeholder="Buscar jogador..."
                aria-label="Buscar jogador"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search size={18} className="shrink-0 text-default-400" />}
              />
            </div>
            <Select value={sortBy} onChange={(e) => ordenar(e.target.value)} className="w-32 shrink-0 sm:w-40" aria-label="Ordenar por">
              <option value="rating">Maior OVR</option>
              <option value="name">Nome</option>
              <option value="position">Posição</option>
            </Select>
          </div>
        )}

        {filteredPlayers.length === 0 ? (
          <div className="px-2 py-12 text-center sm:py-16">
            {searchQuery ? (
              <User size={64} className="mx-auto mb-4 text-default-400" aria-hidden="true" />
            ) : (
              <Logo className="mx-auto mb-4 h-20 w-20 opacity-90" />
            )}
            <p className="text-section">{searchQuery ? "Nenhuma carta encontrada" : "Nenhuma carta criada ainda"}</p>
            <p className="text-muted mt-2">
              {searchQuery
                ? "Tente ajustar a busca"
                : pode.editaElenco
                  ? "Toque em Nova carta para começar"
                  : "Quem organiza o fut cadastra os jogadores"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {filteredPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isMine={player.conta_id === userId}
                isSelected={selectedIds.has(player.id)}
                selecting={selecionando}
                onPress={() => tocar(player)}
              />
            ))}
          </div>
        )}
      </div>

      {selecionando && (
        <section
          aria-label="Sortear rápido"
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-divider bg-content1/95 shadow-2xl backdrop-blur-sm md:bottom-0"
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-6">
            <p className="text-sm text-default-600">
              <span className="font-semibold tabular-nums text-foreground">{selectedIds.size}</span>{" "}
              {selectedIds.size === 1 ? "selecionado" : "selecionados"}
            </p>
            <Button variant="light" size="sm" onClick={toggleSelectAll}>
              {todosMarcados ? "Desmarcar todos" : "Selecionar todos"}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="flat" size="sm" onClick={sairDaSelecao}>
                Cancelar
              </Button>
              <Button
                color="secondary"
                size="sm"
                startContent={<Shuffle size={16} />}
                isDisabled={selectedIds.size === 0}
                onClick={() => setIsTeamConfigOpen(true)}
              >
                Sortear times ({selectedIds.size})
              </Button>
            </div>
          </div>
        </section>
      )}

      {aberta && (
        <CartaAberta
          player={aberta}
          isMine={aberta.conta_id === userId}
          onClose={() => setAberta(null)}
          onEditar={pode.editaElenco ? () => handleEdit(aberta) : undefined}
          onExcluir={pode.editaElenco ? () => void excluir(aberta) : undefined}
          onDesvincular={aberta.conta_id && pode.desvincula(aberta) ? () => void handleDesvincular(aberta) : undefined}
          onSouEu={!meu && !aberta.conta_id && !semConexao ? () => void souEu(aberta) : undefined}
        />
      )}

      <PlayerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={salvar} initialData={editingPlayer} />

      {/* Mounted only while open, so its copy of the Grupo's name isn't on the page otherwise. */}
      {pode.convida && isConvidarOpen && <ConvidarModal isOpen onClose={() => setIsConvidarOpen(false)} grupo={grupo} />}

      <ImportCsvModal isOpen={isImportCsvOpen} onClose={() => setIsImportCsvOpen(false)} onImport={importar} />

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
    </>
  );
}
