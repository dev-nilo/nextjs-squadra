"use client";
// PROTOTYPE (#146), direction C "Lista": the list the group used to keep in WhatsApp, set in big type.
// One column, no boxes; the numbers carry the page. Built to be read in full sun. One accent: the mark's orange.

import { useState } from "react";
import { Archivo } from "next/font/google";
import { BRILHANTE, CARTAS, EU, FUT, PARTIDA, ROTULOS, TIMES, lista, type Carta } from "./dados";
import { FotoDeMentira, Marca } from "./marca";
import s from "./lista.module.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--lista-fonte" });

type Aba = "partidas" | "elenco" | "voce";

export function Lista({ escuro, lotada }: { escuro: boolean; lotada: boolean }) {
  const [aba, setAba] = useState<Aba>("partidas");
  return (
    <div className={`${s.raiz} ${archivo.variable}`} data-tema={escuro ? "escuro" : "claro"}>
      <header className={s.topo}>
        <Marca tinta="var(--tinta)" papel="var(--papel)" ponto="var(--laranja)" tamanho={30} />
        <span className={s.nomeDoApp}>Squadra</span>
        <span className={s.fut}>{FUT}</span>
      </header>
      <main className={s.conteudo}>
        {aba === "partidas" && <PartidaLista lotada={lotada} />}
        {aba === "elenco" && <ElencoLista />}
        {aba === "voce" && <VoceLista />}
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

function PartidaLista({ lotada }: { lotada: boolean }) {
  const l = lista(lotada);
  const minha = l.confirmados.indexOf(EU);
  const livres = l.vagas - l.confirmados.length;
  return (
    <>
      <section className={s.quando}>
        <h1 className={s.dia}>
          {PARTIDA.dia} <span className={s.diaNumero}>22</span>
        </h1>
        <p className={s.detalhe}>
          {PARTIDA.hora}, {PARTIDA.local}
        </p>
      </section>

      <p className={s.contagem}>
        <span className={s.contagemNumero}>{l.confirmados.length}</span> de {l.vagas} vagas,{" "}
        {livres === 0 ? "lotada" : livres === 1 ? "falta 1" : `faltam ${livres}`}
      </p>

      <ol className={s.nomes} aria-label="Quem vai">
        {Array.from({ length: l.vagas }, (_, i) => {
          const nome = l.confirmados[i];
          return (
            <li key={i} className={s.nome} data-voce={nome === EU || undefined} data-livre={!nome || undefined}>
              <span className={s.numero}>{i + 1}</span>
              <span className={s.quem}>{nome ?? ""}</span>
            </li>
          );
        })}
      </ol>

      {l.espera.length > 0 && (
        <section aria-label="Lista de espera">
          <h2 className={s.secao}>Lista de espera</h2>
          <ol className={s.nomes}>
            {l.espera.map((n, i) => (
              <li key={n} className={s.nome} data-espera>
                <span className={s.numero}>{i + 1}</span>
                <span className={s.quem}>{n}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className={s.recolhidos}>
        Não vão: {l.naoVao.join(", ")}. Sem resposta: {l.semResposta.join(", ")}.
      </p>

      <section aria-label="Times">
        <h2 className={s.secao}>Times</h2>
        <div className={s.times}>
          {TIMES.map((t, i) => (
            <div key={t.nome} className={s.time} data-time={i + 1}>
              <p className={s.timeTopo}>
                <span>{t.nome}</span>
                <span className={s.timeMedia}>{t.media}</span>
              </p>
              <ul className={s.timeNomes}>
                {t.jogadores.map((j) => (
                  <li key={j} data-voce={j === EU || undefined}>
                    {j}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* The question sits under the thumb, above the tabs, until it's answered. */}
      <section className={s.resposta} aria-label="Sua presença">
        {minha === -1 ? (
          <>
            <p className={s.respostaPergunta}>Você vai?</p>
            <button type="button" className={s.naoVou}>
              Não vou
            </button>
            <button type="button" className={s.vou}>
              Vou
            </button>
          </>
        ) : (
          <>
            <p className={s.respostaPergunta}>Você vai, é o {minha + 1}º.</p>
            <button type="button" className={s.naoVou}>
              Mudar
            </button>
          </>
        )}
      </section>
    </>
  );
}

function ElencoLista() {
  return (
    <>
      <h1 className={s.titulo}>
        Elenco <span className={s.tituloConta}>{CARTAS.length}</span>
      </h1>
      <div className={s.grade}>
        {CARTAS.map((c) => (
          <Ficha key={c.nome} carta={c} />
        ))}
      </div>
    </>
  );
}

function VoceLista() {
  const eu = CARTAS.find((c) => c.voce)!;
  return (
    <>
      <h1 className={s.titulo}>Você</h1>
      <div className={s.voceCarta}>
        <Ficha carta={eu} />
      </div>
    </>
  );
}

/** The carta as a ficha: the OVR set like a shirt number, the attributes as a table with a bar under each. */
function Ficha({ carta }: { carta: Carta }) {
  const brilhante = carta.ovr >= BRILHANTE;
  return (
    <article className={s.ficha} data-brilhante={brilhante || undefined} aria-label={`Carta de ${carta.nome}`}>
      <div className={s.fichaTopo}>
        <span className={s.fichaOvr}>{carta.ovr}</span>
        <span className={s.fichaPos}>
          {carta.posicao}
          <span className={s.fichaPais}>{carta.pais}</span>
        </span>
        {carta.foto && (
          <span className={s.fichaFoto}>
            <FotoDeMentira fundo="var(--linha)" figura="var(--suave)" />
          </span>
        )}
      </div>
      <p className={s.fichaNome}>
        {carta.nome}
        {carta.voce && <span className={s.fichaVoce}> você</span>}
      </p>
      <dl className={s.fichaAtributos}>
        {ROTULOS.map(([k, r]) => (
          <div key={k}>
            <dt>{r}</dt>
            <dd>
              {carta.atributos[k]}
              <span className={s.trilho}>
                <span style={{ width: `${carta.atributos[k]}%` }} />
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
