"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { erroDaUrl, mostrarAviso, sessaoToast } from "@/lib/sessao";

/**
 * Surfaces Supabase auth errors that land on `/` (e.g. otp_expired after email verify).
 */
export function AuthErrorWatcher() {
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || typeof window === "undefined") return;

    const erro = erroDaUrl(new URL(window.location.href));
    if (!erro) return;
    shown.current = true;
    mostrarAviso(sessaoToast(erro, "watcher"), toast);

    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("error_code");
    url.searchParams.delete("error_description");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, []);

  return null;
}
