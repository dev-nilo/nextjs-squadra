"use client";

import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { LoginForm, RecoveryForm, SignUpForm } from "./auth-form";

type Modo = "entrar" | "criar" | "recuperar";

const SUBTITULO: Record<Modo, string> = {
  entrar: "Primeira vez aqui?",
  criar: "Já tem conta?",
  recuperar: "Lembrou a senha?",
};

/** Sign-in, sign-up and password recovery, in the AuthShell content column. */
export function AuthPanel({
  onSuccess,
  redirectPath,
  title,
}: {
  onSuccess?: () => void;
  /** Path the confirmation email brings a new account back to. */
  redirectPath?: string;
  /** Replaces the "Bora pro jogo!" heading (the invite page names the Grupo). */
  title?: React.ReactNode;
}) {
  const [modo, setModo] = useState<Modo>("entrar");

  const titulo =
    modo === "recuperar" ? "Recuperar a senha" : (title ?? (modo === "entrar" ? "Bora pro jogo!" : "Monte seu elenco"));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo className="h-12 w-12" />
        <div className="flex flex-col gap-1">
          <h1 className="text-title">{titulo}</h1>
          {modo === "recuperar" && (
            <p className="text-muted">A gente manda um link pro seu email. Ele abre o Squadra pra você criar uma senha nova.</p>
          )}
          <p className="text-sm text-default-500">
            {SUBTITULO[modo]}{" "}
            <button
              type="button"
              onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
              className="area-de-toque rounded font-bold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {modo === "entrar" ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </div>
      </div>

      {modo === "entrar" && <LoginForm onSuccess={onSuccess} onEsqueci={() => setModo("recuperar")} />}
      {modo === "criar" && <SignUpForm onSuccess={onSuccess} redirectPath={redirectPath} />}
      {modo === "recuperar" && <RecoveryForm />}
    </div>
  );
}
