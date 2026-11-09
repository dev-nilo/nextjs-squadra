"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoginForm, SignUpForm } from "./auth-form";

/** Login / sign-up switcher that sits in the AuthShell content column. */
export function AuthPanel({ onSuccess }: { onSuccess?: () => void }) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{isLogin ? "Bora pro jogo" : "Monte seu elenco"}</h1>
        <p className="text-muted">
          {isLogin
            ? "Entre para ver suas cartas e sortear os times."
            : "Crie a conta e cadastre a primeira carta."}
        </p>
      </div>

      {isLogin ? <LoginForm onSuccess={onSuccess} /> : <SignUpForm onSuccess={onSuccess} />}

      <p className="text-center text-sm text-default-500">
        {isLogin ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
        <Button
          variant="light"
          color="primary"
          size="sm"
          className="h-auto p-0 font-bold underline-offset-4 hover:bg-transparent hover:underline"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Criar conta" : "Entrar"}
        </Button>
      </p>
    </div>
  );
}
