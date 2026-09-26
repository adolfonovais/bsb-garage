"use client";

import { useActionState } from "react";
import { convidarUsuario, type EstadoConvite } from "@/app/(app)/configuracoes/actions";
import { Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

/** "Convidar por e-mail": a pessoa recebe um link, define nome e senha e entra na organização. */
export function ConviteForm() {
  const [state, action] = useActionState<EstadoConvite, FormData>(convidarUsuario, undefined);

  return (
    <div className="mt-3 rounded-md border border-dashed border-slate-300 p-3">
      <p className="mb-2 text-sm font-medium text-slate-700">Convidar por e-mail</p>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Field label="E-mail *">
            <Input name="email" type="email" required placeholder="pessoa@email.com" />
          </Field>
        </div>
        <div className="w-44">
          <Field label="Papel *">
            <Select name="papel" defaultValue="FUNCIONARIO">
              <option value="FUNCIONARIO">Funcionário</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </Field>
        </div>
        <SubmitButton variant="secondary" pendingLabel="Enviando...">
          Enviar convite
        </SubmitButton>
      </form>
      {state?.erro && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.erro}</p>}
      {state?.enviado && (
        <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.enviado}</p>
      )}
      {state?.link && (
        <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-medium">
            O envio de e-mail não está configurado — copie o link e mande pra pessoa (vale por 7 dias):
          </p>
          <input
            readOnly
            value={state.link}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full rounded border border-amber-200 bg-white px-2 py-1 font-mono text-[11px]"
          />
        </div>
      )}
    </div>
  );
}
