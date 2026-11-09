import { LOGO_INNER_PATH, LOGO_OFFSET, LOGO_SEAL_PATH, LOGO_VIEWBOX } from "./logo-paths";

interface LogoProps {
  className?: string;
  /** Slowly rotates the wavy seal only; ball, tickets and scoreboard stay still. Off under prefers-reduced-motion. */
  spinning?: boolean;
  /** Accessible name. Omit when the mark sits next to the "Squadra" wordmark. */
  title?: string;
}

/** The Squadra seal. Colors come from the `brand` tokens, so it inverts in dark mode. */
export function Logo({ className = "h-8 w-8", spinning = false, title }: LogoProps) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={`shrink-0 ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g className={spinning ? "animate-spin-slow" : undefined} style={{ transformOrigin: "416px 416px" }}>
        <path transform={LOGO_OFFSET} className="fill-brand" d={LOGO_SEAL_PATH} />
      </g>
      <path transform={LOGO_OFFSET} className="fill-brand-foreground" fillRule="evenodd" d={LOGO_INNER_PATH} />
    </svg>
  );
}

const LOCKUP_SIZES = {
  sm: { mark: "h-9 w-9", text: "text-xl" },
  lg: { mark: "h-20 w-20", text: "text-3xl" },
} as const;

/** Seal + "Squadra" wordmark. `stacked` centers the wordmark under the seal (auth screens). */
export function BrandLockup({
  size = "sm",
  stacked = false,
  className = "",
}: {
  size?: keyof typeof LOCKUP_SIZES;
  stacked?: boolean;
  className?: string;
}) {
  const s = LOCKUP_SIZES[size];
  return (
    <div className={`flex items-center ${stacked ? "flex-col gap-2" : "gap-2"} ${className}`}>
      <Logo className={s.mark} />
      <span className={`${s.text} font-black tracking-tight text-brand leading-none`}>Squadra</span>
    </div>
  );
}
