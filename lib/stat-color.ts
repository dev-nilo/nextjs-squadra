/** Tailwind class for a Jogador attribute value — UI chrome, not domain. */
export const getStatColor = (value: number) => {
  if (value >= 90) return "text-chart-1";
  if (value >= 80) return "text-chart-1";
  if (value >= 70) return "text-chart-4";
  if (value >= 50) return "text-chart-5";
  return "text-destructive";
};
