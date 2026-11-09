import { Logo } from "@/components/ui/logo";

/**
 * Full-screen auth layout: the "pitch" brand panel (left on desktop, a band on top on mobile)
 * and a content column. Shared by `/`, `/auth`, `/auth/confirm` and `/auth/callback`.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <PitchPanel />
      <main className="flex justify-center px-4 py-8 sm:py-12 lg:items-center">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

function PitchPanel() {
  return (
    <aside className="on-panel relative isolate overflow-hidden bg-panel text-panel-foreground lg:sticky lg:top-0 lg:h-screen">
      <PitchMarkings />
      <div className="relative flex h-full flex-col gap-6 px-6 py-7 sm:gap-10 sm:px-10 sm:py-10 lg:justify-between lg:px-14 lg:py-12">
        <div className="flex items-center gap-2.5">
          <Logo className="h-11 w-11 sm:h-12 sm:w-12" />
          <span className="text-2xl font-black tracking-tight leading-none sm:text-3xl">Squadra</span>
        </div>

        <div className="flex max-w-lg flex-col gap-4">
          <p className="text-display text-balance">Pelada boa começa com time equilibrado.</p>
          <p className="hidden text-base text-panel-foreground/75 sm:block">
            Cadastre o elenco em cartas, sorteie os times pela média e mande a escalação no grupo.
          </p>
        </div>

        <Scoreboard />
      </div>
    </aside>
  );
}

/** A futsal court seen from above (40×20 m, 30 units per meter), sliced to fill the panel. */
function PitchMarkings() {
  const stripes = Array.from({ length: 21 }, (_, i) => i).filter((i) => i % 2 === 0);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 640 1240"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
    >
      {/* mowing stripes, 2 m wide */}
      {stripes.map((i) => (
        <rect key={i} x="0" y={20 + i * 60} width="640" height="60" fill="currentColor" fillOpacity="0.025" />
      ))}
      {/* the mark as a watermark in the center circle */}
      <path
        fill="currentColor"
        fillOpacity="0.07"
        d="M320 530 A90 90 0 0 0 320 710 A45 45 0 0 0 320 620 A45 45 0 0 1 320 530 Z"
      />
      <g fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="3" vectorEffect="non-scaling-stroke">
        <rect x="20" y="20" width="600" height="1200" />
        <path d="M20 620 H620" />
        <circle cx="320" cy="620" r="90" />
        <path d="M95 20 A180 180 0 0 0 275 200 H365 A180 180 0 0 0 545 20" />
        <path d="M95 1220 A180 180 0 0 1 275 1040 H365 A180 180 0 0 1 545 1220" />
        <path d="M275 20 V6 H365 V20 M275 1220 V1234 H365 V1220" />
      </g>
      <g fill="currentColor" fillOpacity="0.3">
        <circle cx="320" cy="620" r="5" />
      </g>
    </svg>
  );
}

/** The old logo's scoreboard, now saying what the app does. Labelled as an example. */
function Scoreboard() {
  return (
    <figure className="hidden flex-col gap-2 sm:flex">
      <div className="inline-flex w-fit items-center gap-4 rounded-xl bg-panel-foreground px-4 py-3 text-panel shadow-2xl">
        <Crest letter="A" className="bg-team-1" />
        <span className="text-3xl font-black tabular-nums leading-none">72</span>
        <span className="text-xl font-black leading-none opacity-50" aria-hidden="true">×</span>
        <span className="text-3xl font-black tabular-nums leading-none">71</span>
        <Crest letter="B" className="bg-team-2" />
      </div>
      <figcaption className="text-xs font-medium text-panel-foreground/60">
        Exemplo de sorteio: médias dos dois times, 1 ponto de diferença
      </figcaption>
    </figure>
  );
}

function Crest({ letter, className }: { letter: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-background ${className}`}
    >
      {letter}
    </span>
  );
}
