"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoginForm, SignUpForm } from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Toaster } from "@/components/ui/sonner"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const router = useRouter()

  const handleSuccess = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Toaster />
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold">
            {isLogin ? "Bem-vindo" : "Criar Conta"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Faça login em sua conta para continuar"
              : "Crie uma nova conta para começar"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLogin ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : (
            <SignUpForm onSuccess={handleSuccess} />
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2 text-muted-foreground">
                {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Criar conta" : "Fazer login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
