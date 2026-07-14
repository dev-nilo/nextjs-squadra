"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  applySessaoToast,
  completeEmailConfirmation,
  toSessaoAuth,
} from "@/lib/sessao";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const handleCallback = async () => {
      const result = await completeEmailConfirmation(toSessaoAuth(createClient()), {
        errorCode: searchParams.get("error_code") || searchParams.get("error"),
        errorDescription: searchParams.get("error_description"),
        code: searchParams.get("code"),
        tokenHash: searchParams.get("token_hash"),
        type: (searchParams.get("type") || "signup") as EmailOtpType,
      });

      if (!result.ok) {
        if (result.code === "pkce_failed" || result.code === "otp_failed") {
          console.error("[auth/callback]", result.code, result.message);
        } else if (result.code === "confirm_error") {
          console.error("[auth/callback]", result);
        }
        if (result.code !== "no_session") {
          applySessaoToast(result, "callback", toast);
        }
        router.replace("/auth");
        return;
      }

      applySessaoToast(result, "callback", toast);
      router.replace("/");
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground" />
      <p className="text-default-500">Processando autenticação...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Toaster position="top-center" richColors />
      <Suspense
        fallback={
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground" />
            <p className="text-default-500">Processando autenticação...</p>
          </div>
        }
      >
        <CallbackContent />
      </Suspense>
    </div>
  );
}
