"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { applySessaoToast, classifyAuthUrlError } from "@/lib/sessao";

/**
 * Surfaces Supabase auth errors that land on `/` (e.g. otp_expired after email verify).
 */
export function AuthErrorWatcher() {
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const errorCode =
      params.get("error_code") ||
      params.get("error") ||
      hashParams.get("error_code") ||
      hashParams.get("error");
    const description =
      params.get("error_description") || hashParams.get("error_description");

    if (!errorCode) return;
    shown.current = true;

    const classified = classifyAuthUrlError({
      errorCode,
      errorDescription: description,
    });

    applySessaoToast(
      {
        ok: false,
        code: classified.kind === "expired_link" ? "expired_link" : "confirm_url_error",
        message: classified.message,
      },
      "watcher",
      toast,
    );

    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("error_code");
    url.searchParams.delete("error_description");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, []);

  return null;
}
