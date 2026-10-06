"use client"

import { useState } from "react"
import { Modal, ModalHeader, ModalBody } from "@/components/ui/modal"
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
    <Modal isOpen={open} onClose={() => onOpenChange(false)} className="max-w-md">
      <ModalHeader className="flex flex-col gap-1">
        <h2 className="text-title">{isLogin ? "Bem-vindo" : "Criar Conta"}</h2>
        <p className="text-muted">
          {isLogin
            ? "Faça login em sua conta para continuar"
            : "Crie uma nova conta para começar"}
        </p>
      </ModalHeader>
      <ModalBody className="pb-6">
        <div className="space-y-6">
          {isLogin ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : (
            <SignUpForm onSuccess={handleSuccess} />
          )}

          <div className="flex items-center justify-center">
            <div className="text-muted">
              {isLogin ? "Não tem conta? " : "Já tem uma conta? "}
              <Button
                variant="light"
                color="primary"
                size="sm"
                className="h-auto p-0 ml-1 text-foreground"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Criar uma" : "Fazer login"}
              </Button>
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  )
}
