"use client";

import { useActionState } from "react";
import { autenticar, type LoginState } from "@/app/login/actions";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(autenticar, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />
      <Field label="E-mail">
        <Input type="email" name="email" required autoFocus placeholder="voce@bsbgarage.com.br" />
      </Field>
      <Field label="Senha">
        <Input type="password" name="senha" required placeholder="••••••••" />
      </Field>
      {state?.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.erro}</p>
      )}
      <SubmitButton pendingLabel="Entrando..." className="w-full">
        Entrar
      </SubmitButton>
    </form>
  );
}
