/** Tailwind class for a Jogador attribute value — UI chrome, not domain. */
export const getStatColor = (value: number) => {
  if (value >= 80) return "text-success";
  if (value >= 70) return "text-primary";
  if (value >= 50) return "text-warning-600";
  return "text-danger";
};
