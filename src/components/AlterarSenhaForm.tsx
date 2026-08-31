"use client";

import { useActionState, useEffect, useRef } from "react";
import { alterarMinhaSenha, type AlterarSenhaState } from "@/app/(app)/minha-conta/actions";
import { Button, Field, Input } from "@/components/ui";

export function AlterarSenhaForm() {
  const [state, action, pending] = useActionState<AlterarSenhaState, FormData>(alterarMinhaSenha, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sucesso) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field label="Senha atual *">
        <Input type="password" name="senhaAtual" required />
      </Field>
      <Field label="Nova senha *">
        <Input type="password" name="novaSenha" required minLength={6} />
      </Field>
      <Field label="Confirmar nova senha *">
        <Input type="password" name="confirmarSenha" required minLength={6} />
      </Field>
      {state?.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.erro}</p>
      )}
      {state?.sucesso && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Senha alterada com sucesso.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
