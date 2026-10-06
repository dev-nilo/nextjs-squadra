"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoginForm, SignUpForm } from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const router = useRouter()

  const handleSuccess = () => {
    router.push("/")
  }

  return (
    <Surface>
      <div className="flex flex-col gap-1 pb-6">
        <h1 className="text-title">{isLogin ? "Bem-vindo" : "Criar Conta"}</h1>
        <p className="text-muted">
          {isLogin
            ? "Faça login em sua conta para continuar"
            : "Crie uma nova conta para começar"}
        </p>
      </div>

      <div className="space-y-6">
        {isLogin ? (
          <LoginForm onSuccess={handleSuccess} />
        ) : (
          <SignUpForm onSuccess={handleSuccess} />
        )}

        <div className="relative">
          <hr className="border-t border-divider" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="bg-content1 px-2 text-muted">
              {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
            </span>
          </div>
        </div>

        <Button variant="flat" className="w-full" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Criar conta" : "Fazer login"}
        </Button>
      </div>
    </Surface>
  )
}
