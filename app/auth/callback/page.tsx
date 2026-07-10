"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Toaster } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Exchange the code for a session
        const code = searchParams.get("code")

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            console.error("[app] Auth callback error:", error)
            toast.error("Erro ao autenticar", {
              description: error.message,
            })
            router.push("/auth")
          } else {
            toast.success("Email confirmado com sucesso!")
            router.push("/")
          }
        } else {
          router.push("/auth")
        }
      } catch (error) {
        console.error("[app] Callback error:", error)
        toast.error("Erro ao processar callback")
        router.push("/auth")
      }
    }

    handleCallback()
  }, [searchParams, router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Toaster />
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground" />
        <p className="text-muted-foreground">Processando autenticação...</p>
      </div>
    </div>
  )
}
