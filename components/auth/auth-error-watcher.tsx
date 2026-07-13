"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

/**
 * Surfaces Supabase auth errors that land on `/` (e.g. otp_expired after email verify).
 */
export function AuthErrorWatcher() {
  const shown = useRef(false)

  useEffect(() => {
    if (shown.current || typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))

    const errorCode =
      params.get("error_code") ||
      params.get("error") ||
      hashParams.get("error_code") ||
      hashParams.get("error")
    const description =
      params.get("error_description") || hashParams.get("error_description")

    if (!errorCode) return
    shown.current = true

    const message = description
      ? decodeURIComponent(description.replace(/\+/g, " "))
      : "Não foi possível confirmar o email."

    const isExpired =
      errorCode === "otp_expired" ||
      message.toLowerCase().includes("expired") ||
      message.toLowerCase().includes("invalid")

    toast.error(isExpired ? "Link de confirmação inválido ou expirado" : "Erro de autenticação", {
      description: isExpired
        ? "Scanners de email costumam abrir o link antes de você. Use Reenviar email de confirmação e abra o link mais recente."
        : message,
      duration: 9000,
    })

    const url = new URL(window.location.href)
    url.searchParams.delete("error")
    url.searchParams.delete("error_code")
    url.searchParams.delete("error_description")
    window.history.replaceState({}, "", url.pathname + url.search)
  }, [])

  return null
}
