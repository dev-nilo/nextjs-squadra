"use client"

import { useState } from "react"
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from "@nextui-org/react"
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
    <Modal
      isOpen={open}
      onOpenChange={onOpenChange}
      size="md"
      classNames={{
        base: "mx-2 sm:mx-auto w-[calc(100vw-1rem)] sm:w-full max-w-[calc(100vw-1rem)] sm:max-w-md",
        header: "px-4 sm:px-6",
        body: "px-4 sm:px-6 pb-6",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {isLogin ? "Fazer Login" : "Criar Conta"}
            </ModalHeader>
            <ModalBody className="pb-6">
              <div className="space-y-6">
                {isLogin ? (
                  <LoginForm onSuccess={handleSuccess} />
                ) : (
                  <SignUpForm onSuccess={handleSuccess} />
                )}

                <div className="flex items-center justify-center">
                  <div className="text-sm text-default-500">
                    {isLogin ? "Não tem conta? " : "Já tem uma conta? "}
                    <Button
                      variant="light"
                      color="primary"
                      size="sm"
                      className="h-auto p-0 ml-1 text-foreground"
                      onPress={() => setIsLogin(!isLogin)}
                    >
                      {isLogin ? "Criar uma" : "Fazer login"}
                    </Button>
                  </div>
                </div>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
