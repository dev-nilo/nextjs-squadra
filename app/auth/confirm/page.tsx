"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, CardHeader } from "@nextui-org/react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { toast, Toaster } from "sonner";
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
    <Card className="w-full max-w-md p-2 sm:p-4">
      <CardHeader className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Mail size={22} />
          <h1 className="text-xl sm:text-2xl font-black text-foreground">
            Confirmar email
          </h1>
        </div>
        <p className="text-sm text-default-500 font-normal">
          Clique no botão abaixo para ativar sua conta. Isso evita que o link expire
          automaticamente por scanners de email.
        </p>
      </CardHeader>
      <CardBody className="gap-4">
        {error && (
          <div className="rounded-lg bg-danger/10 text-danger text-sm px-3 py-2 font-medium">
            {decodeAuthDescription(error)}
          </div>
        )}

        {!canConfirm && !error && (
          <div className="rounded-lg bg-warning/10 text-warning-600 text-sm px-3 py-2 font-medium">
            Link incompleto. Abra o link mais recente do email de confirmação ou
            cadastre-se novamente.
          </div>
        )}

        <Button
          color="primary"
          size="lg"
          className="w-full font-semibold"
          isDisabled={!canConfirm || loading}
          isLoading={loading}
          startContent={!loading ? <CheckCircle2 size={18} /> : undefined}
          onPress={handleConfirm}
        >
          Confirmar minha conta
        </Button>

        <Button variant="flat" className="w-full" onPress={() => router.push("/auth")}>
          Voltar ao login
        </Button>
      </CardBody>
    </Card>
  );
}

export default function AuthConfirmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Toaster position="top-center" richColors />
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3 text-default-500">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Carregando...</p>
          </div>
        }
      >
        <ConfirmContent />
      </Suspense>
    </div>
  );
}
