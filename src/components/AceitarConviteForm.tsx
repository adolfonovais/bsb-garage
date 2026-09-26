"use client";

import { useActionState } from "react";
import { aceitarConvite, type ConviteState } from "@/app/convite/actions";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function AceitarConviteForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState<ConviteState, FormData>(aceitarConvite.bind(null, token), undefined);

  return (
    <form action={action} className="space-y-4">
      <Field label="E-mail">
        <Input value={email} readOnly disabled />
      </Field>
      <Field label="Seu nome *">
        <Input name="nome" required autoFocus autoComplete="name" />
      </Field>
      <Field label="Crie uma senha *" hint="Mínimo de 6 caracteres.">
        <Input type="password" name="senha" required minLength={6} autoComplete="new-password" />
      </Field>
      {state?.erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.erro}</p>}
      <SubmitButton pendingLabel="Entrando..." className="w-full">
        Aceitar convite e entrar
      </SubmitButton>
    </form>
  );
}
