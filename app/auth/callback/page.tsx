"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LoadingState } from "@/components/ui/full-screen-loader";
import { concluirConfirmacao, mostrarAviso, toSessaoAuth } from "@/lib/sessao";

/**
 * Where confirmation emails used to send everyone, and where Supabase sends an
 * error or a PKCE `code`. Same policy as /auth/confirm (concluirConfirmacao);
 * this page only shows the notice and goes where it says.
 */
function CallbackContent() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      const { destino, aviso } = await concluirConfirmacao(toSessaoAuth(createClient()), new URL(window.location.href));
      mostrarAviso(aviso, toast);
      router.replace(destino);
    })();
  }, [router]);

  return <LoadingState label="Processando autenticação..." />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingState label="Processando autenticação..." />}>
      <CallbackContent />
    </Suspense>
  );
}
