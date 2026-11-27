"use client";

import { useRef, useState } from "react";
import type { Player } from "@/types";
import { importPlayersFromCsv } from "@/lib/csv-import";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (players: Player[]) => Promise<void>;
}

/** Read file as UTF-8 text (strips BOM if present). */
async function readUtf8(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(buffer);
  return text.replace(/^\uFEFF/, "");
}

export function ImportCsvModal({ isOpen, onClose, onImport }: ImportCsvModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Player[]>([]);
  const [skippedRows, setSkippedRows] = useState(0);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFileName(null);
    setPreview([]);
    setSkippedRows(0);
    setParseErrors([]);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setParseErrors([]);
    setFileName(file.name);

    try {
      const text = await readUtf8(file);
      const result = importPlayersFromCsv(text);
      if (result.players.length === 0) {
        setPreview([]);
        setSkippedRows(result.skippedRows);
        setParseErrors(result.errors);
        setError(result.errors[0] ?? "Nenhum jogador no arquivo. Confira se a primeira linha tem os cabeçalhos.");
        return;
      }
      setPreview(result.players);
      setSkippedRows(result.skippedRows);
      setParseErrors(result.errors);
    } catch {
      setPreview([]);
      setError("Não deu pra ler o arquivo. Salve o CSV em UTF-8 e tente de novo.");
    }
  };

  const handleConfirm = async () => {
    if (preview.length === 0 || importing) return;
    setImporting(true);
    try {
      await onImport(preview);
      reset();
      onClose();
    } catch {
      setError("Não deu pra importar os jogadores. Confira a conexão e tente de novo.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-lg">
      <ModalHeader className="flex flex-col gap-1">
        <h2 className="text-title">Importar CSV</h2>
        <p className="text-muted">
          Em UTF-8, com os cabeçalhos JOGADOR, VEL, RES, CHU, PAS, POS, DEF, DRI e FIS, em qualquer ordem.
        </p>
      </ModalHeader>

      <ModalBody className="flex flex-col gap-4">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />

        <Button variant="flat" onClick={() => inputRef.current?.click()} isDisabled={importing} className="w-full">
          {fileName ? "Trocar arquivo" : "Escolher arquivo CSV"}
        </Button>

        {fileName && (
          <p className="text-muted truncate" title={fileName}>
            {fileName}
          </p>
        )}

        {error && <Alert tone="danger">{error}</Alert>}

        {preview.length > 0 && (
          <div className="rounded-xl border border-divider bg-default-50 p-3">
            <p className="text-sm font-medium text-foreground mb-2">
              {preview.length === 1 ? "1 jogador pronto" : `${preview.length} jogadores prontos`}
              {skippedRows === 1
                ? ", 1 linha ficou de fora"
                : skippedRows > 1
                  ? `, ${skippedRows} linhas ficaram de fora`
                  : ""}
            </p>
            <ul className="max-h-40 overflow-y-auto space-y-1 text-sm text-default-600">
              {preview.slice(0, 12).map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <span className="tabular-nums shrink-0 text-default-400">OVR {p.rating}</span>
                </li>
              ))}
              {preview.length > 12 && <li className="text-default-400">e mais {preview.length - 12}</li>}
            </ul>
          </div>
        )}

        {parseErrors.length > 0 && preview.length > 0 && (
          <details className="text-xs text-default-500">
            <summary className="cursor-pointer">
              {parseErrors.length === 1 ? "1 linha com aviso" : `${parseErrors.length} linhas com aviso`}
            </summary>
            <ul className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
              {parseErrors.slice(0, 20).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </details>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="flat" onClick={handleClose} isDisabled={importing}>
          Cancelar
        </Button>
        <Button
          color="primary"
          onClick={() => void handleConfirm()}
          isDisabled={preview.length === 0 || importing}
          isLoading={importing}
        >
          {importing ? "Importando…" : `Importar ${preview.length || ""}`.trim()}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
