"use client"

import React, { useState } from "react"
import { Button, Input } from "@nextui-org/react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { getEmailRedirectTo } from "@/lib/auth-url"

interface AuthFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      toast.error("Configuração ausente", {
        description: "Supabase não está configurado. Adicione as variáveis de ambiente.",
      })
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const needsConfirm =
          error.message.toLowerCase().includes("email not confirmed") ||
          error.message.toLowerCase().includes("not confirmed")

        toast.error(needsConfirm ? "Email não confirmado" : "Erro ao fazer login", {
          description: needsConfirm
            ? "Confirme o email pelo link enviado (ou peça um novo reenvio)."
            : error.message,
        })
        return
      }

      toast.success("Login realizado com sucesso!", {
        description: "Bem-vindo de volta!",
      })
      onSuccess?.()
    } catch (error) {
      console.error("[app] Login error:", error)
      toast.error("Erro", {
        description: "Algo deu errado. Tente novamente.",
      })
    } finally {
      setLoading(false)
    }
  }

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
  )
}

export function SignUpForm({ onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      toast.error("Configuração ausente", {
        description: "Supabase não está configurado. Adicione as variáveis de ambiente.",
      })
      return
    }

    if (password !== confirmPassword) {
      toast.error("Senhas não conferem", {
        description: "Por favor, verifique suas senhas.",
      })
      return
    }

    if (password.length < 6) {
      toast.error("Senha muito curta", {
        description: "A senha deve ter pelo menos 6 caracteres.",
      })
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getEmailRedirectTo(),
        },
      })

      if (error) {
        toast.error("Erro ao criar conta", {
          description: error.message,
        })
        return
      }

      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        toast.error("Email já cadastrado", {
          description: "Tente fazer login ou recuperar a senha.",
        })
        return
      }

      setPendingEmail(email)
      toast.success("Conta criada!", {
        description: "Abra o email e clique em Confirmar. Se o link expirar, use Reenviar abaixo.",
        duration: 8000,
      })
      onSuccess?.()
    } catch (error) {
      console.error("[app] SignUp error:", error)
      toast.error("Erro", {
        description: "Algo deu errado. Tente novamente.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    const target = pendingEmail || email
    if (!target) {
      toast.error("Informe o email para reenviar a confirmação")
      return
    }

    setResending(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: target,
        options: {
          emailRedirectTo: getEmailRedirectTo(),
        },
      })

      if (error) {
        toast.error("Não foi possível reenviar", { description: error.message })
        return
      }

      toast.success("Email reenviado", {
        description: "Use o link mais recente. Links antigos deixam de valer.",
      })
    } catch (error) {
      console.error("[app] Resend error:", error)
      toast.error("Erro ao reenviar email")
    } finally {
      setResending(false)
    }
  }

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
  )
}
