"use client";

import { useActionState } from "react";
import { autenticar, reenviarConfirmacao, type LoginState } from "@/app/login/actions";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(autenticar, undefined);
  const [reenvio, reenviar] = useActionState<LoginState, FormData>(reenviarConfirmacao, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />
      <Field label="E-mail">
        <Input type="email" name="email" required autoFocus placeholder="voce@email.com" />
      </Field>
      <Field label="Senha">
        <Input type="password" name="senha" required placeholder="••••••••" />
      </Field>
      {state?.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.erro}</p>
      )}
      {state?.naoVerificado && (
        <button
          type="submit"
          formAction={reenviar}
          className="w-full text-sm font-medium text-amber-700 hover:underline"
        >
          Reenviar e-mail de confirmação
        </button>
      )}
      {reenvio?.info && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{reenvio.info}</p>
      )}
      {reenvio?.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{reenvio.erro}</p>
      )}
      <SubmitButton pendingLabel="Entrando..." className="w-full">
        Entrar
      </SubmitButton>
    </form>
  );
}
