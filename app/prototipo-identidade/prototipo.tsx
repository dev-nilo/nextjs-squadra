"use client";
// PROTOTYPE (#146): the switcher strip and the three directions. Not part of any design being judged.

import { useEffect, useState } from "react";
import { Album } from "./album";
import { Lista } from "./lista";
import { Muro } from "./muro";
import s from "./prototipo.module.css";

const VARIANTES = [
  { id: "A", nome: "Álbum", Componente: Album },
  { id: "B", nome: "Muro", Componente: Muro },
  { id: "C", nome: "Lista", Componente: Lista },
] as const;
type Id = (typeof VARIANTES)[number]["id"];

export function Prototipo({ inicial }: { inicial: { variante: Id; escuro: boolean; lotada: boolean } }) {
  const [variante, setVariante] = useState<Id>(inicial.variante);
  const [escuro, setEscuro] = useState(inicial.escuro);
  const [lotada, setLotada] = useState(inicial.lotada);
  const i = VARIANTES.findIndex((v) => v.id === variante);
  const atual = VARIANTES[i] ?? VARIANTES[0];

  // The URL keeps the choice, so a link opens the same screen.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", variante);
    url.searchParams.set("tema", escuro ? "escuro" : "claro");
    url.searchParams.set("lista", lotada ? "lotada" : "vagas");
    window.history.replaceState(null, "", url);
    window.scrollTo(0, 0);
  }, [variante, escuro, lotada]);

  const passar = (passo: number) => {
    const proxima = VARIANTES[(i + passo + VARIANTES.length) % VARIANTES.length];
    if (proxima) setVariante(proxima.id);
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") passar(-1);
      if (e.key === "ArrowRight") passar(1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const { Componente } = atual;
  return (
    <div className={s.fundo}>
      <div className={s.trocador} role="toolbar" aria-label="Protótipo">
        <button type="button" onClick={() => passar(-1)} aria-label="Direção anterior">
          ‹
        </button>
        <span className={s.nome}>
          {atual.id} {atual.nome}
        </span>
        <button type="button" onClick={() => passar(1)} aria-label="Próxima direção">
          ›
        </button>
        <span className={s.espaco} />
        <button type="button" className={s.opcao} onClick={() => setEscuro((e) => !e)}>
          {escuro ? "Escuro" : "Claro"}
        </button>
        <button type="button" className={s.opcao} onClick={() => setLotada((l) => !l)}>
          {lotada ? "Lotada" : "Com vagas"}
        </button>
      </div>
      <div className={s.celular}>
        <Componente key={atual.id} escuro={escuro} lotada={lotada} />
      </div>
    </div>
  );
}
