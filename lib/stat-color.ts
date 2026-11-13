/** Tailwind class for a Jogador attribute value — UI chrome, not domain. */
export const getStatColor = (value: number) => {
  if (value >= 80) return "text-success";
  if (value >= 70) return "text-primary";
  if (value >= 50) return "text-warning-600";
  return "text-danger";
};

/**
 * The same four bands, printed on the figurinha's paper (Papel, the same in
 * both themes), so the colors don't follow the theme the way `getStatColor`'s
 * tokens do (paper-bom, paper-medio, paper-fraco: 4.5:1 or more on Papel).
 */
export const corNoPapel = (value: number) => {
  if (value >= 80) return "text-paper-bom";
  if (value >= 70) return "text-paper-foreground";
  if (value >= 50) return "text-paper-medio";
  return "text-paper-fraco";
};

/** From this OVR on, the figurinha is a "brilhante" (foil). */
export const OVR_BRILHANTE = 85;
