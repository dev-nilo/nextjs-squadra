"use client"

import { Suspense, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Toaster, toast } from "sonner"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const handleCallback = async () => {
      const supabase = createClient()

      const errorCode = searchParams.get("error_code") || searchParams.get("error")
      const errorDescription = searchParams.get("error_description")

      if (errorCode) {
        const message = errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
          : "Não foi possível confirmar o email."

        const isExpired =
          errorCode === "otp_expired" ||
          message.toLowerCase().includes("expired") ||
          message.toLowerCase().includes("invalid")

        toast.error(isExpired ? "Link expirado ou inválido" : "Erro na confirmação", {
          description: isExpired
            ? "Peça um novo email de confirmação. Scanners de email costumam invalidar o link antigo."
            : message,
          duration: 8000,
        })
        router.replace("/auth")
        return
      }

      const code = searchParams.get("code")
      const tokenHash = searchParams.get("token_hash")
      const type = (searchParams.get("type") || "signup") as EmailOtpType

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error("[auth/callback] exchangeCodeForSession:", error)
            toast.error("Erro ao autenticar", { description: error.message })
            router.replace("/auth")
            return
          }
          toast.success("Email confirmado com sucesso!")
          router.replace("/")
          return
        }

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          })
          if (error) {
            console.error("[auth/callback] verifyOtp:", error)
            toast.error("Erro ao confirmar", { description: error.message })
            router.replace("/auth")
            return
          }
          toast.success("Email confirmado com sucesso!")
          router.replace("/")
          return
        }

        // Implicit flow fallback (hash tokens) — getSession picks them up
        const { data, error } = await supabase.auth.getSession()
        if (!error && data.session) {
          toast.success("Login realizado!")
          router.replace("/")
          return
        }

        router.replace("/auth")
      } catch (error) {
        console.error("[auth/callback]", error)
        toast.error("Erro ao processar confirmação")
        router.replace("/auth")
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground" />
      <p className="text-default-500">Processando autenticação...</p>
    </div>
  )
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
  )
}
