"use client";

import { useActionState } from "react";
import { criarConta, type CadastroState } from "@/app/cadastro/actions";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function CadastroForm() {
  const [state, action] = useActionState<CadastroState, FormData>(criarConta, undefined);

  return (
    <form action={action} className="space-y-4">
      {/* Campo-isca anti-robô: fica fora da tela e não deve ser preenchido. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <input type="text" name="site" tabIndex={-1} autoComplete="off" />
      </div>
      <Field label="Nome da oficina *">
        <Input name="nomeOficina" required autoFocus placeholder="Ex: Oficina Martelinho Premium" />
      </Field>
      <Field label="Cidade - UF *">
        <Input name="cidadeUf" required placeholder="Ex: Goiânia - GO" />
      </Field>
      <Field label="Seu nome *">
        <Input name="nome" required autoComplete="name" />
      </Field>
      <Field label="E-mail *">
        <Input type="email" name="email" required autoComplete="email" />
      </Field>
      <Field label="Senha *" hint="Mínimo de 6 caracteres.">
        <Input type="password" name="senha" required minLength={6} autoComplete="new-password" />
      </Field>
      {state?.erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.erro}</p>}
      <SubmitButton pendingLabel="Criando sua conta..." className="w-full">
        Criar conta grátis
      </SubmitButton>
    </form>
  );
}
