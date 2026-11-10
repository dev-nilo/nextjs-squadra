"use client";

import { useActionState, useEffect, useState } from "react";
import { criarGrupo, type CriarGrupoState } from "@/app/actions/grupo";
import { AuthShell } from "@/components/auth/auth-shell";
import { UserMenu } from "@/components/auth/user-menu";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { NOME_DO_GRUPO_MAX, type Participacao } from "@/lib/grupo";

const INICIAL: CriarGrupoState = { status: "idle" };

/** First access: a signed-in user with no Grupo names theirs before seeing the Elenco. */
export function NomearGrupo({ onCriado }: { onCriado: (grupo: Participacao) => void }) {
  const [state, action, pending] = useActionState(criarGrupo, INICIAL);
  // Controlled, because React resets an uncontrolled form after its action runs
  // and the name must survive a validation error.
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (state.status === "ok") onCriado(state.grupo);
  }, [state, onCriado]);

  const erro = state.status === "error" ? state.message : null;

  return (
    <AuthShell>
      <div className="flex flex-col gap-8">
        <div className="flex justify-end">
          <UserMenu />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="h-12 w-12" />
          <div className="flex flex-col gap-1">
            <h1 className="text-title">Dê um nome pro seu fut</h1>
            <p className="text-sm text-default-500">É o nome que a galera vê quando você chama pro jogo.</p>
          </div>
        </div>

        <form action={action} className="space-y-4" noValidate>
          <Input
            label="Nome do fut"
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={NOME_DO_GRUPO_MAX}
            isDisabled={pending}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "nome-do-fut-erro" : undefined}
            size="lg"
            autoComplete="off"
            autoFocus
          />

          {erro && (
            <div id="nome-do-fut-erro">
              <Alert tone="danger">{erro}</Alert>
            </div>
          )}

          <Button type="submit" color="primary" size="lg" radius="full" className="mt-2 w-full" isLoading={pending}>
            {pending ? "Criando..." : "Criar fut"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
