"use client";
// PROTOTYPE (#146), direction B "Muro": everything is painted on the wall of the neighbourhood court.
// Two-tone wall, sign-painted letters, numbers in yellow discs. Flat paint, no shadows, made for sunlight.

import { useState } from "react";
import { Bowlby_One, Instrument_Sans } from "next/font/google";
import { BRILHANTE, CARTAS, EU, FUT, PARTIDA, ROTULOS, TIMES, lista, type Carta } from "./dados";
import { FotoDeMentira, Marca } from "./marca";
import s from "./muro.module.css";

const tinta = Bowlby_One({ subsets: ["latin"], weight: "400", variable: "--muro-pintura" });
const texto = Instrument_Sans({ subsets: ["latin"], axes: ["wdth"], variable: "--muro-texto" });

type Aba = "partidas" | "elenco" | "voce";

export function Muro({ escuro, lotada }: { escuro: boolean; lotada: boolean }) {
  const [aba, setAba] = useState<Aba>("partidas");
  return (
    <div className={`${s.raiz} ${tinta.variable} ${texto.variable}`} data-tema={escuro ? "escuro" : "claro"}>
      <header className={s.topo}>
        <Marca tinta="var(--cal)" papel="var(--azul)" ponto="var(--amarelo)" tamanho={36} />
        <span className={s.nomeDoApp}>Squadra</span>
        <span className={s.fut}>{FUT}</span>
      </header>
      <main className={s.conteudo}>
        {aba === "partidas" && <PartidaMuro lotada={lotada} />}
        {aba === "elenco" && <ElencoMuro />}
        {aba === "voce" && <VoceMuro />}
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

function PartidaMuro({ lotada }: { lotada: boolean }) {
  const l = lista(lotada);
  const minha = l.confirmados.indexOf(EU);
  const livres = l.vagas - l.confirmados.length;
  return (
    <>
      {/* The wall's painted sign: when and where, and the tally. */}
      <section className={s.placa}>
        <div className={s.placaTexto}>
          <p className={s.quando}>
            {PARTIDA.dia}, 22/11
            <br />
            {PARTIDA.hora}
          </p>
          <p className={s.onde}>{PARTIDA.local}</p>
        </div>
        <div className={s.tally}>
          <span className={s.tallyNumero}>{l.confirmados.length}</span>
          <span className={s.tallyDe}>de {l.vagas}</span>
        </div>
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
        </section>
      ) : (
        <section className={s.respondido} aria-label="Sua presença">
          <span>Você vai, é o {minha + 1}º.</span>
          <button type="button" className={s.mudar}>
            Mudar
          </button>
        </section>
      )}

      <section aria-label="Quem vai">
        <h2 className={s.secao}>
          Quem vai <span className={s.secaoNota}>{livres === 0 ? "lotada" : `faltam ${livres}`}</span>
        </h2>
        <ol className={s.chamada}>
          {Array.from({ length: l.vagas }, (_, i) => {
            const nome = l.confirmados[i];
            return (
              <li key={i} className={s.linha} data-voce={nome === EU || undefined} data-livre={!nome || undefined}>
                <span className={s.disco}>{i + 1}</span>
                <span className={s.linhaNome}>{nome ?? "vaga livre"}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {l.espera.length > 0 && (
        <section aria-label="Lista de espera">
          <h2 className={s.secao}>Lista de espera</h2>
          <ol className={s.chamada}>
            {l.espera.map((n, i) => (
              <li key={n} className={s.linha} data-espera>
                <span className={s.disco}>{i + 1}</span>
                <span className={s.linhaNome}>{n}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className={s.recolhidos}>
        {l.naoVao.length} não vão, {l.semResposta.length} sem resposta
      </p>

      <section aria-label="Times">
        <h2 className={s.secao}>Times</h2>
        <div className={s.times}>
          {TIMES.map((t, i) => (
            <div key={t.nome} className={s.time} data-time={i + 1}>
              <p className={s.timeNome}>
                {t.nome}
                <span className={s.timeMedia}>{t.media}</span>
              </p>
              <ul className={s.timeLista}>
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
    </>
  );
}

function ElencoMuro() {
  return (
    <>
      <h1 className={s.titulo}>Elenco</h1>
      <div className={s.grade}>
        {CARTAS.map((c) => (
          <Plaqueta key={c.nome} carta={c} />
        ))}
      </div>
    </>
  );
}

function VoceMuro() {
  const eu = CARTAS.find((c) => c.voce)!;
  return (
    <>
      <h1 className={s.titulo}>Você</h1>
      <div className={s.voceCarta}>
        <Plaqueta carta={eu} />
      </div>
    </>
  );
}

/** The carta as a painted plate: OVR in a yellow disc, the attributes as painted bars. */
function Plaqueta({ carta }: { carta: Carta }) {
  const brilhante = carta.ovr >= BRILHANTE;
  return (
    <article className={s.plaqueta} data-brilhante={brilhante || undefined} aria-label={`Carta de ${carta.nome}`}>
      <div className={s.plaquetaTopo}>
        <span className={s.plaquetaOvr}>{carta.ovr}</span>
        <span className={s.plaquetaPos}>
          {carta.posicao}
          <br />
          {carta.pais}
        </span>
        {carta.foto && (
          <span className={s.plaquetaFoto}>
            <FotoDeMentira fundo="var(--cal)" figura="var(--azul)" />
          </span>
        )}
      </div>
      <p className={s.plaquetaNome}>
        {carta.nome}
        {carta.voce && <span className={s.voce}>você</span>}
      </p>
      <dl className={s.barras}>
        {ROTULOS.map(([k, r]) => (
          <div key={k} className={s.barra}>
            <dt>{r}</dt>
            <dd className={s.barraTrilho}>
              <span className={s.barraTinta} style={{ width: `${carta.atributos[k]}%` }} />
            </dd>
            <dd className={s.barraValor}>{carta.atributos[k]}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
