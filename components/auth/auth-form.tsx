"use client";

import React, { useState } from "react";
import { Button, Input } from "@nextui-org/react";
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
        label="Email"
        id="email"
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        isDisabled={loading}
        isRequired
        autoComplete="email"
      />

      <Input
        label="Senha"
        id="password"
        type="password"
        placeholder="Sua senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        isDisabled={loading}
        isRequired
        autoComplete="current-password"
      />

      <Button type="submit" color="primary" className="w-full" isLoading={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

export function SignUpForm({ onSuccess }: AuthFormProps) {
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
        getEmailRedirectTo(),
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
        getEmailRedirectTo(),
      );
      applySessaoToast(result, "resend", toast);
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <Input
        label="Email"
        id="signup-email"
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        isDisabled={loading}
        isRequired
        autoComplete="email"
      />

      <Input
        label="Senha"
        id="signup-password"
        type="password"
        placeholder="Mínimo 6 caracteres"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        isDisabled={loading}
        isRequired
        autoComplete="new-password"
      />

      <Input
        label="Confirmar Senha"
        id="confirm-password"
        type="password"
        placeholder="Repita sua senha"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        isDisabled={loading}
        isRequired
        autoComplete="new-password"
      />

      <Button type="submit" color="primary" className="w-full" isLoading={loading}>
        {loading ? "Criando conta..." : "Criar Conta"}
      </Button>

      {(pendingEmail || email) && (
        <Button
          type="button"
          variant="flat"
          className="w-full"
          isLoading={resending}
          onPress={handleResend}
        >
          Reenviar email de confirmação
        </Button>
      )}
    </form>
  );
}
