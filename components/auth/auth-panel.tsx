"use client";

import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { LoginForm, SignUpForm } from "./auth-form";

/** Login / sign-up switcher that sits in the AuthShell content column. */
export function AuthPanel({ onSuccess }: { onSuccess?: () => void }) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo className="h-12 w-12" />
        <div className="flex flex-col gap-1">
          <h1 className="text-title">{isLogin ? "Bora pro jogo!" : "Monte seu elenco"}</h1>
          <p className="text-sm text-default-500">
            {isLogin ? "Primeira vez aqui?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="rounded font-bold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isLogin ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </div>
      </div>

      {isLogin ? <LoginForm onSuccess={onSuccess} /> : <SignUpForm onSuccess={onSuccess} />}
    </div>
  );
}
