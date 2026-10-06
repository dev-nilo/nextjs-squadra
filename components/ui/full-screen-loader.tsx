import { Loader2 } from "lucide-react";

export function FullScreenLoader({ label = "Carregando..." }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background px-4"
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
      <p className="text-muted">{label}</p>
    </div>
  );
}
