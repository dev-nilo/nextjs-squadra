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
      // Both colors live on the root: `color` (navy half, ring) and the inherited `fill` (cream half).
      // Children only use currentColor or inherit, because html-to-image (PNG export) copies the
      // computed style of the <svg> root but clones its children without their class styles.
      className={`shrink-0 text-brand fill-brand-foreground ${tossing ? "animate-coin-toss" : ""} ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <circle cx="50" cy="50" r="34" />
      <path fill="currentColor" d="M50 16 A34 34 0 0 0 50 84 A17 17 0 0 0 50 50 A17 17 0 0 1 50 16 Z" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M50 3 V16 M50 84 V97" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      {/* The center spot is the mark's one coral point. A literal color, like the
          other two, so the PNG export (html-to-image) keeps it on the cloned child. */}
      <circle cx="50" cy="50" r="4.2" fill="#FF6B5B" stroke="currentColor" strokeWidth="2.4" />
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
  compactOnMobile = false,
  className = "",
}: {
  size?: keyof typeof LOCKUP_SIZES;
  stacked?: boolean;
  /** Below `sm`, keep only the mark (the wordmark stays for screen readers). */
  compactOnMobile?: boolean;
  className?: string;
}) {
  const s = LOCKUP_SIZES[size];
  return (
    <div className={`flex items-center ${s.gap} ${stacked ? "flex-col" : ""} ${className}`}>
      <Logo className={s.mark} />
      <span
        className={`${s.text} font-black tracking-tight text-brand leading-none ${compactOnMobile ? "sr-only sm:not-sr-only" : ""}`}
      >
        Squadra
      </span>
    </div>
  );
}
