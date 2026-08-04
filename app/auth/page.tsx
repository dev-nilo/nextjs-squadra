"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoginForm, SignUpForm } from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"
import { Toaster } from "sonner"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const router = useRouter()

  const handleSuccess = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Toaster />
      
      <div className="w-full max-w-md rounded-2xl bg-content1 p-4 shadow-2xl">
        <div className="flex flex-col items-start gap-1 px-2 pb-4 pt-2">
          <h2 className="text-xl sm:text-2xl font-bold">
            {isLogin ? "Bem-vindo" : "Criar Conta"}
          </h2>
          <p className="text-sm text-default-500">
            {isLogin
              ? "Faça login em sua conta para continuar"
              : "Crie uma nova conta para começar"}
          </p>
        </div>

        <div className="space-y-6 px-2 pb-2">
          {isLogin ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : (
            <SignUpForm onSuccess={handleSuccess} />
          )}

          <div className="relative">
            <hr className="border-t border-divider" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="bg-content1 px-2 text-sm text-default-500">
                {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
              </span>
            </div>
          </div>

          <Button
            variant="bordered"
            className="w-full"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Criar conta" : "Fazer login"}
          </Button>
        </div>
      </div>
    </div>
  )
}
