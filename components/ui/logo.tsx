interface LogoProps {
  className?: string;
  /** Flips the mark like a coin toss (the Sorteio before kick-off). Off under prefers-reduced-motion. */
  tossing?: boolean;
  /** Accessible name. Omit when the mark sits next to the "Squadra" wordmark. */
  title?: string;
}

/**
 * The Squadra mark, "Meio-campo": the pitch's center circle split by an S into two equal halves
 * (two balanced Times), with the halfway line and the center spot. Colors come from the `brand`
 * tokens, so it inverts in dark mode. The favicons use a simplified variant (see DESIGN.md).
 */
export function Logo({ className = "h-8 w-8", tossing = false, title }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`shrink-0 ${tossing ? "animate-coin-toss" : ""} ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <circle cx="50" cy="50" r="34" className="fill-brand-foreground" />
      <path className="fill-brand" d="M50 16 A34 34 0 0 0 50 84 A17 17 0 0 0 50 50 A17 17 0 0 1 50 16 Z" />
      <circle cx="50" cy="50" r="34" fill="none" strokeWidth="5" className="stroke-brand" />
      <path d="M50 3 V16 M50 84 V97" strokeWidth="5" strokeLinecap="round" className="stroke-brand" />
      <circle cx="50" cy="50" r="4.2" strokeWidth="2.4" className="fill-brand-foreground stroke-brand" />
    </svg>
  );
}

const LOCKUP_SIZES = {
  sm: { mark: "h-9 w-9", text: "text-xl", gap: "gap-1.5" },
  lg: { mark: "h-20 w-20", text: "text-3xl", gap: "gap-2" },
} as const;

/** Mark + "Squadra" wordmark. `stacked` centers the wordmark under the mark (auth screens). */
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
    <div className={`flex items-center ${s.gap} ${stacked ? "flex-col" : ""} ${className}`}>
      <Logo className={s.mark} />
      <span className={`${s.text} font-black tracking-tight text-brand leading-none`}>Squadra</span>
    </div>
  );
}
