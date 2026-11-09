import { Logo } from "@/components/ui/logo";
import { KickableBall } from "./kickable-ball";

/**
 * Full-screen auth layout, shared by `/` (no Sessão) and every `/auth` route.
 * A floating card over the night pitch: content column on the left, an inset pitch picture
 * on the right (a band on top on mobile).
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen bg-panel text-panel-foreground sm:p-3 lg:p-4">
      <NightPitch id="frame" className="fixed inset-0 -z-10 h-full w-full" />
      <div className="grid min-h-screen content-start gap-2 bg-background p-2 text-foreground shadow-2xl sm:min-h-[calc(100vh-1.5rem)] sm:rounded-3xl sm:p-3 lg:min-h-[calc(100vh-2rem)] lg:grid-cols-2 lg:content-stretch">
        <main className="order-2 flex justify-center px-3 py-8 sm:py-12 lg:order-1 lg:items-center">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <PitchPicture />
      </div>
    </div>
  );
}

function PitchPicture() {
  return (
    <aside className="on-panel relative isolate order-1 flex min-h-56 flex-col justify-between overflow-hidden rounded-2xl bg-panel p-4 text-panel-foreground sm:min-h-72 sm:p-6 lg:order-2 lg:min-h-0 lg:p-8">
      <NightPitch id="picture" className="absolute inset-0 -z-10 h-full w-full" />
      <KickableBall />
      <ul className="flex justify-end gap-2" aria-label="Modalidades">
        {["Futsal", "Society"].map((tag) => (
          <li
            key={tag}
            className="rounded-full border border-panel-foreground/40 bg-panel/40 px-3 py-1 text-sm font-medium backdrop-blur-sm"
          >
            {tag}
          </li>
        ))}
      </ul>
      <p className="text-display flex max-w-xl items-start gap-3 text-balance">
        <Logo className="mt-0.5 h-7 w-7 sm:h-9 sm:w-9" />
        <span>
          Pelada boa começa com time <strong className="font-black">equilibrado</strong>.
        </span>
      </p>
    </aside>
  );
}

/**
 * A pitch at night, drawn rather than photographed: grass grain (SVG noise), mowing stripes,
 * rolling bands of floodlight and shadow and faint markings. The ball is `KickableBall`.
 * `id` keeps filter/gradient ids unique when the picture is drawn twice on a page.
 */
function NightPitch({ id, className }: { id: string; className: string }) {
  const grain = `${id}-grain`;
  const soft = `${id}-soft`;
  const flood = `${id}-flood`;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 800 1000"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none ${className}`}
    >
      <defs>
        <filter id={grain} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85 0.12" numOctaves="2" seed="11" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.9 0 0 0 -0.38" />
        </filter>
        <filter id={soft} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
        <radialGradient id={flood} cx="0.85" cy="0.05" r="0.9">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* mowing stripes */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x="0" y={i * 100} width="800" height="50" fill="currentColor" fillOpacity="0.018" />
      ))}

      {/* rolling light and shadow, like terrain under floodlights */}
      <g filter={`url(#${soft})`}>
        <path d="M-100 40 C 200 -20, 460 140, 900 30 L 900 140 C 460 250, 200 110, -100 170 Z" fill="black" fillOpacity="0.4" />
        <path d="M-100 210 C 150 120, 420 300, 900 170 L 900 300 C 460 410, 170 240, -100 340 Z" fill="currentColor" fillOpacity="0.2" />
        <path d="M-100 430 C 220 350, 500 560, 900 410 L 900 540 C 520 670, 200 500, -100 580 Z" fill="black" fillOpacity="0.5" />
        <path d="M-100 650 C 200 590, 520 760, 900 630 L 900 750 C 520 870, 220 730, -100 790 Z" fill="currentColor" fillOpacity="0.16" />
        <path d="M-100 850 C 260 790, 540 960, 900 850 L 900 1100 L -100 1100 Z" fill="black" fillOpacity="0.5" />
      </g>
      <rect width="800" height="1000" fill={`url(#${flood})`} />

      {/* grass grain */}
      <rect width="800" height="1000" filter={`url(#${grain})`} opacity="0.09" />

      {/* faint markings */}
      <g fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="2" vectorEffect="non-scaling-stroke">
        <path d="M0 500 H800" />
        <circle cx="400" cy="500" r="120" />
      </g>

    </svg>
  );
}
