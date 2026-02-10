"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LoginForm, SignUpForm } from "./auth-form"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)

  const handleSuccess = () => {
    onSuccess?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isLogin ? "Fazer Login" : "Criar Conta"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isLogin ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : (
            <SignUpForm onSuccess={handleSuccess} />
          )}

          <div className="flex items-center justify-center">
            <div className="text-sm text-muted-foreground">
              {isLogin ? "Não tem conta? " : "Já tem uma conta? "}
              <Button
                variant="link"
                className="h-auto p-0 text-foreground underline"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Criar uma" : "Fazer login"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
