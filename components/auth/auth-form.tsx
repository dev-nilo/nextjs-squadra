"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getEmailRedirectTo } from "@/lib/auth-url";
import {
  applySessaoToast,
  login,
  resendConfirmation,
  signup,
  toSessaoAuth,
} from "@/lib/sessao";

interface AuthFormProps {
  onSuccess?: () => void;
  /** Path the confirmation email brings the user back to (an invite, say). */
  redirectPath?: string;
}

export function LoginForm({ onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(toSessaoAuth(createClient()), email, password);
      applySessaoToast(result, "login", toast);
      if (result.ok) onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <Input
        aria-label="Email"
        id="email"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        isDisabled={loading}
        isRequired
        size="lg"
        autoComplete="email"
      />

      <PasswordInput
        aria-label="Senha"
        id="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        isDisabled={loading}
        isRequired
        size="lg"
        autoComplete="current-password"
      />

      <Button type="submit" color="primary" size="lg" radius="full" className="mt-2 w-full" isLoading={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

export function SignUpForm({ onSuccess, redirectPath }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signup(
        toSessaoAuth(createClient()),
        { email, password, confirmPassword },
        getEmailRedirectTo(redirectPath),
      );
      applySessaoToast(result, "signup", toast);
      if (result.ok) {
        setPendingEmail(email);
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const target = pendingEmail || email;
    setResending(true);
    try {
      const result = await resendConfirmation(
        toSessaoAuth(createClient()),
        target,
        getEmailRedirectTo(redirectPath),
      );
      applySessaoToast(result, "resend", toast);
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <Input
        aria-label="Email"
        id="signup-email"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        isDisabled={loading}
        isRequired
        size="lg"
        autoComplete="email"
      />

      <PasswordInput
        aria-label="Senha"
        id="signup-password"
        placeholder="Senha (mínimo 6 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        isDisabled={loading}
        isRequired
        size="lg"
        autoComplete="new-password"
      />

      <PasswordInput
        aria-label="Confirmar Senha"
        id="confirm-password"
        placeholder="Confirme a senha"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        isDisabled={loading}
        isRequired
        size="lg"
        autoComplete="new-password"
      />

      <Button type="submit" color="primary" size="lg" radius="full" className="mt-2 w-full" isLoading={loading}>
        {loading ? "Criando conta..." : "Criar conta"}
      </Button>

      {(pendingEmail || email) && (
        <Button
          type="button"
          variant="light"
          color="primary"
          size="sm"
          className="mx-auto"
          isLoading={resending}
          onClick={handleResend}
        >
          Reenviar email de confirmação
        </Button>
      )}
    </form>
  );
}
