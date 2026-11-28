"use client";
// PROTOTYPE (#146), direction A "Álbum": the fut is an album you fill each week.
// A Partida's vagas are slots on a page; saying "vou" sticks your figurinha in the next one.

import { useState } from "react";
import { Anybody } from "next/font/google";
import { BRILHANTE, CARTAS, EU, FUT, PARTIDA, ROTULOS, TIMES, lista, type Carta } from "./dados";
import { FotoDeMentira, Marca } from "./marca";
import s from "./album.module.css";

const anybody = Anybody({ subsets: ["latin"], axes: ["wdth"], variable: "--album-fonte" });

type Aba = "partidas" | "elenco" | "voce";

export function Album({ escuro, lotada }: { escuro: boolean; lotada: boolean }) {
  const [aba, setAba] = useState<Aba>("partidas");
  return (
    <div className={`${s.raiz} ${anybody.variable}`} data-tema={escuro ? "escuro" : "claro"}>
      <header className={s.faixa}>
        <Marca tinta="var(--faixa-tinta)" papel="var(--faixa)" tamanho={34} />
        <span className={s.nomeDoApp}>Squadra</span>
        <span className={s.fut}>{FUT}</span>
      </header>
      <main className={s.pagina}>
        {aba === "partidas" && <PartidaAlbum lotada={lotada} />}
        {aba === "elenco" && <ElencoAlbum />}
        {aba === "voce" && <VoceAlbum />}
      </main>
      <nav className={s.abas} aria-label="Seções do fut">
        {(
          [
            ["partidas", "Partidas"],
            ["elenco", "Elenco"],
            ["voce", "Você"],
          ] as const
        ).map(([id, nome]) => (
          <button key={id} type="button" className={s.aba} aria-current={aba === id} onClick={() => setAba(id)}>
            {nome}
          </button>
        ))}
      </nav>
    </div>
  );
}

function PartidaAlbum({ lotada }: { lotada: boolean }) {
  const l = lista(lotada);
  const minha = l.confirmados.indexOf(EU);
  const livres = l.vagas - l.confirmados.length;
  return (
    <>
      <section className={s.cabecalho}>
        <p className={s.dia}>{PARTIDA.dia}</p>
        <h1 className={s.data}>
          22 nov <span className={s.hora}>{PARTIDA.hora}</span>
        </h1>
        <p className={s.local}>{PARTIDA.local}</p>
      </section>

      {minha === -1 ? (
        <section className={s.pergunta} aria-label="Sua presença">
          <p className={s.perguntaTexto}>Você vai?</p>
          <div className={s.botoes}>
            <button type="button" className={s.vou}>
              Vou
            </button>
            <button type="button" className={s.naoVou}>
              Não vou
            </button>
          </div>
          <p className={s.dica}>Sua figurinha entra na vaga {l.confirmados.length + 1}.</p>
        </section>
      ) : (
        <section className={s.respondido} aria-label="Sua presença">
          <span>
            Você vai. Sua figurinha é a <b>{minha + 1}</b>.
          </span>
          <button type="button" className={s.mudar}>
            Mudar
          </button>
        </section>
      )}

      <section aria-label="Quem vai">
        <div className={s.contagem}>
          <span className={s.contagemNumero}>
            {l.confirmados.length} de {l.vagas}
          </span>
          <span>{livres === 0 ? "lotada" : livres === 1 ? "falta 1" : `faltam ${livres}`}</span>
        </div>
        <ol className={s.slots}>
          {Array.from({ length: l.vagas }, (_, i) => {
            const nome = l.confirmados[i];
            return nome ? (
              <li key={i} className={s.slot} data-voce={nome === EU || undefined}>
                <span className={s.slotNumero}>{i + 1}</span>
                <span className={s.slotInicial} aria-hidden="true">
                  {nome.slice(0, 1)}
                </span>
                <span className={s.slotNome}>{nome}</span>
              </li>
            ) : (
              <li key={i} className={s.slotVazio}>
                <span className={s.slotNumero}>{i + 1}</span>
                <span className={s.slotLivre}>livre</span>
              </li>
            );
          })}
        </ol>
      </section>

      {l.espera.length > 0 && (
        <section aria-label="Lista de espera" className={s.espera}>
          <h2 className={s.rotulo}>Na fila, se abrir vaga</h2>
          <ol className={s.esperaLista}>
            {l.espera.map((n, i) => (
              <li key={n} className={s.esperaItem}>
                <span className={s.slotNumero}>{i + 1}</span> {n}
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className={s.recolhidos}>
        {l.naoVao.length} não vão, {l.semResposta.length} sem resposta
      </p>

      <section aria-label="Times" className={s.times}>
        <h2 className={s.rotulo}>Times</h2>
        <div className={s.timesGrade}>
          {TIMES.map((t, i) => (
            <div key={t.nome} className={s.time} data-time={i + 1}>
              <div className={s.timeFaixa}>
                <span>{t.nome}</span>
                <span className={s.timeMedia}>{t.media}</span>
              </div>
              <ul>
                {t.jogadores.map((j) => (
                  <li key={j} className={s.timeJogador} data-voce={j === EU || undefined}>
                    {j}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ElencoAlbum() {
  return (
    <>
      <h1 className={s.titulo}>
        Elenco <span className={s.tituloConta}>{CARTAS.length}</span>
      </h1>
      <div className={s.album}>
        {CARTAS.map((c, i) => (
          <Figurinha key={c.nome} carta={c} numero={i + 1} />
        ))}
      </div>
    </>
  );
}

function VoceAlbum() {
  const eu = CARTAS.find((c) => c.voce)!;
  return (
    <>
      <h1 className={s.titulo}>Você</h1>
      <div className={s.voceCarta}>
        <Figurinha carta={eu} numero={1} grande />
      </div>
    </>
  );
}

function Figurinha({ carta, numero, grande = false }: { carta: Carta; numero: number; grande?: boolean }) {
  const brilhante = carta.ovr >= BRILHANTE;
  return (
    <article
      className={s.figurinha}
      data-brilhante={brilhante || undefined}
      data-grande={grande || undefined}
      aria-label={`Carta de ${carta.nome}`}
    >
      <div className={s.figMoldura}>
        <div className={s.figTopo}>
          <span className={s.figOvr}>{carta.ovr}</span>
          <span className={s.figPos}>{carta.posicao}</span>
          <span className={s.figPais}>{carta.pais}</span>
        </div>
        <div className={s.figFoto}>
          {carta.foto ? (
            <FotoDeMentira fundo="var(--foto-fundo)" figura="var(--foto-figura)" />
          ) : (
            <span className={s.figInicial}>{carta.nome.slice(0, 1)}</span>
          )}
          <span className={s.figNumero}>nº {numero}</span>
        </div>
        <p className={s.figNome}>
          {carta.nome}
          {carta.voce && <span className={s.figVoce}>você</span>}
        </p>
        <dl className={s.figAtributos}>
          {ROTULOS.map(([k, r]) => (
            <div key={k}>
              <dt>{r}</dt>
              <dd>{carta.atributos[k]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
