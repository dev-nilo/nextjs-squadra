"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoginForm, SignUpForm } from "@/components/auth/auth-form"
import { Button, Card, CardHeader, CardBody, Divider } from "@nextui-org/react"
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
      
      <Card className="w-full max-w-md p-4">
        <CardHeader className="flex flex-col gap-1 items-start">
          <h2 className="text-xl sm:text-2xl font-bold">
            {isLogin ? "Bem-vindo" : "Criar Conta"}
          </h2>
          <p className="text-sm text-default-500">
            {isLogin
              ? "Faça login em sua conta para continuar"
              : "Crie uma nova conta para começar"}
          </p>
        </CardHeader>

        <CardBody className="space-y-6">
          {isLogin ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : (
            <SignUpForm onSuccess={handleSuccess} />
          )}

          <div className="relative">
            <Divider />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="bg-background px-2 text-sm text-default-500">
                {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
              </span>
            </div>
          </div>

          <Button
            variant="bordered"
            className="w-full"
            onPress={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Criar conta" : "Fazer login"}
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
