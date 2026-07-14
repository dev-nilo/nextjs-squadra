# Time is domain-only (no presentation tokens)

A Time from a Sorteio carries name, members, and average rating — not Tailwind (or other) style tokens. UI maps team index to colors at the presentation seam so balancing stays testable and free of chrome. Rejected: attaching `color` / `borderColor` / `headerColor` on the domain result (the previous `TeamData` shape).
