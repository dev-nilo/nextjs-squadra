"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/full-screen-loader";
import { PasswordInput } from "@/components/ui/password-input";
import { createClient } from "@/lib/supabase/client";
import { applySessaoToast, definirNovaSenha, toSessaoAuth } from "@/lib/sessao";

/**
 * Where a password recovery link always ends. Tapping Continuar on
 * /auth/confirm signed the person in, so the new password needs no current
 * one. Opened any other way, with no session, it says how to get here.
 */
export default function NovaSenhaPage() {
  const router = useRouter();
  const [temSessao, setTemSessao] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    void createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (ativo) setTemSessao(Boolean(data.session));
      });
    return () => {
      ativo = false;
    };
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const resultado = await definirNovaSenha(toSessaoAuth(createClient()), { newPassword: senha, confirmPassword: confirmacao });
      applySessaoToast(resultado, "recovery", toast);
      if (resultado.ok) router.replace("/");
      else if (resultado.code === "no_session") setTemSessao(false);
    } finally {
      setSalvando(false);
    }
  };

  if (temSessao === null) return <LoadingState />;

  return (
    <div>
      <div className="flex flex-col gap-1 pb-6">
        <div className="flex items-center gap-2">
          <KeyRound size={22} className="text-primary" aria-hidden="true" />
          <h1 className="text-title">Senha nova</h1>
        </div>
        <p className="text-muted">Escolha a senha que você vai usar daqui pra frente.</p>
      </div>

      {temSessao ? (
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <PasswordInput
            aria-label="Senha nova"
            id="nova-senha"
            placeholder="Senha nova (mínimo 6 caracteres)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            isDisabled={salvando}
            isRequired
            size="lg"
            autoComplete="new-password"
          />
          <PasswordInput
            aria-label="Confirme a senha nova"
            id="confirmar-nova-senha"
            placeholder="Confirme a senha nova"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            isDisabled={salvando}
            isRequired
            size="lg"
            autoComplete="new-password"
          />
          <Button type="submit" color="primary" size="lg" radius="full" className="mt-2 w-full" isLoading={salvando}>
            {salvando ? "Salvando..." : "Salvar senha nova"}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <Alert tone="warning">
            Essa página abre pelo link de recuperação. Peça um em Esqueci minha senha e abra o mais recente.
          </Alert>
          <Button variant="flat" className="w-full" onClick={() => router.push("/auth")}>
            Voltar ao login
          </Button>
        </div>
      )}
    </div>
  );
}
