"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/full-screen-loader";
import { Alert } from "@/components/ui/alert";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";
import { concluirConfirmacao, decodeAuthDescription, explicarErro, mostrarAviso, toSessaoAuth } from "@/lib/sessao";

/**
 * The links in the confirmation and password recovery emails land here, and
 * nothing happens until the user taps the button, so an email scanner opening
 * the link can't burn the token. Where to go and what to say after that is
 * concluirConfirmacao's call.
 */
function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const canConfirm = Boolean(searchParams.get("token_hash"));
  const error = searchParams.get("error_description") || searchParams.get("error");
  const recuperacao = searchParams.get("type") === "recovery";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { destino, aviso } = await concluirConfirmacao(toSessaoAuth(createClient()), new URL(window.location.href));
      mostrarAviso(aviso, toast);
      router.replace(destino);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo className="h-12 w-12" />
        <div className="flex flex-col gap-1">
          <h1 className="text-title">{recuperacao ? "Trocar a senha" : "Confirmar email"}</h1>
          <p className="text-muted">
            {recuperacao ? "Toque em Continuar pra criar a senha nova." : "Toque no botão pra ativar sua conta."} O link
            só vale nesse toque, assim o programa de email não o gasta antes de você.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{explicarErro(decodeAuthDescription(error))}</Alert>}

        {!canConfirm && !error && (
          <Alert tone="warning">
            {recuperacao
              ? "Link incompleto. Abra o link mais recente do email de recuperação, ou peça outro em Esqueci minha senha."
              : "Link incompleto. Abra o link mais recente do email de confirmação, ou crie a conta de novo."}
          </Alert>
        )}

        <Button
          color="primary"
          size="lg"
          radius="full"
          className="w-full"
          isDisabled={!canConfirm || loading}
          isLoading={loading}
          onClick={handleConfirm}
        >
          {recuperacao ? "Continuar" : "Confirmar minha conta"}
        </Button>

        <Button variant="flat" size="lg" radius="full" className="w-full" onClick={() => router.push("/auth")}>
          Entrar
        </Button>
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ConfirmContent />
    </Suspense>
  );
}
