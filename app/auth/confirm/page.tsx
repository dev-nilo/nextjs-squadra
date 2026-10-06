"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/full-screen-loader";
import { Surface } from "@/components/ui/surface";
import { Alert } from "@/components/ui/alert";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  applySessaoToast,
  completeEmailConfirmation,
  decodeAuthDescription,
  toSessaoAuth,
} from "@/lib/sessao";

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const confirmationUrl = searchParams.get("confirmation_url");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") || "signup") as EmailOtpType;
  const error = searchParams.get("error_description") || searchParams.get("error");

  const canConfirm = useMemo(
    () => Boolean(confirmationUrl || tokenHash),
    [confirmationUrl, tokenHash],
  );

  const handleConfirm = async () => {
    if (confirmationUrl) {
      window.location.assign(confirmationUrl);
      return;
    }

    if (!tokenHash) {
      applySessaoToast({ ok: false, code: "invalid_link" }, "confirm", toast);
      return;
    }

    setLoading(true);
    try {
      const result = await completeEmailConfirmation(toSessaoAuth(createClient()), {
        errorCode: null,
        errorDescription: null,
        code: null,
        tokenHash,
        type,
      });
      applySessaoToast(result, "confirm", toast);
      if (!result.ok) {
        if (result.code === "otp_failed") {
          router.replace("/auth?error=confirm_failed");
        }
        return;
      }
      router.replace("/");
    } catch (err) {
      console.error("[auth/confirm]", err);
      applySessaoToast({ ok: false, code: "confirm_error" }, "confirm", toast);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface>
      <div className="flex flex-col gap-1 pb-6">
        <div className="flex items-center gap-2">
          <Mail size={22} className="text-primary" aria-hidden="true" />
          <h1 className="text-title">Confirmar email</h1>
        </div>
        <p className="text-muted">
          Clique no botão abaixo para ativar sua conta. Isso evita que o link expire
          automaticamente por scanners de email.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{decodeAuthDescription(error)}</Alert>}

        {!canConfirm && !error && (
          <Alert tone="warning">
            Link incompleto. Abra o link mais recente do email de confirmação ou
            cadastre-se novamente.
          </Alert>
        )}

        <Button
          color="primary"
          className="w-full"
          isDisabled={!canConfirm || loading}
          isLoading={loading}
          startContent={<CheckCircle2 size={18} />}
          onClick={handleConfirm}
        >
          Confirmar minha conta
        </Button>

        <Button variant="flat" className="w-full" onClick={() => router.push("/auth")}>
          Voltar ao login
        </Button>
      </div>
    </Surface>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ConfirmContent />
    </Suspense>
  );
}
