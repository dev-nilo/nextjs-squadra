// PROTOTYPE (#146): the Meio-campo mark, with its colours as props so each direction can repaint it.

export function Marca({
  tinta,
  papel,
  ponto = "#FF5B14",
  tamanho = 32,
}: {
  tinta: string;
  papel: string;
  ponto?: string;
  tamanho?: number;
}) {
  return (
    <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden="true">
      <circle cx="50" cy="50" r="34" fill={papel} />
      <path fill={tinta} d="M50 16 A34 34 0 0 0 50 84 A17 17 0 0 0 50 50 A17 17 0 0 1 50 16 Z" />
      <circle cx="50" cy="50" r="34" fill="none" stroke={tinta} strokeWidth="5" />
      <path d="M50 3 V16 M50 84 V97" stroke={tinta} strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="50" r="4.2" fill={ponto} stroke={tinta} strokeWidth="2.4" />
    </svg>
  );
}

/** A stand-in for a player's photo: there are none in the repo. Head and shoulders, in two tones. */
export function FotoDeMentira({ fundo, figura }: { fundo: string; figura: string }) {
  return (
    <svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">
      <rect width="100" height="120" fill={fundo} />
      <circle cx="50" cy="46" r="19" fill={figura} />
      <path d="M14 120 C 16 88, 34 74, 50 74 C 66 74, 84 88, 86 120 Z" fill={figura} />
    </svg>
  );
}
