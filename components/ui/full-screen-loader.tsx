import { Loader2 } from "lucide-react";

/** Spinner + label. Use directly inside a layout that already centers on the viewport (e.g. app/auth/layout.tsx). */
export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
      <p className="text-muted">{label}</p>
    </div>
  );
}

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <LoadingState label={label} />
    </div>
  );
}
