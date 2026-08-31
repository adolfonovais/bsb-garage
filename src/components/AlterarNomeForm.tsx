"use client";

import { useActionState } from "react";
import { alterarMeuNome, type AlterarNomeState } from "@/app/(app)/minha-conta/actions";
import { Button, Field, Input } from "@/components/ui";

export function AlterarNomeForm({ nomeAtual }: { nomeAtual: string }) {
  const [state, action, pending] = useActionState<AlterarNomeState, FormData>(alterarMeuNome, undefined);

  return (
    <form action={action} className="space-y-4">
      <Field label="Nome *">
        <Input type="text" name="nome" defaultValue={nomeAtual} required minLength={2} />
      </Field>
      {state?.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.erro}</p>
      )}
      {state?.sucesso && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Nome atualizado com sucesso. O topo da tela atualiza no próximo login.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar nome"}
      </Button>
    </form>
  );
}
