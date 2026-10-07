"use client";

import { useActionState } from "react";
import { salvarWhatsApp, type EstadoWhatsApp } from "@/app/(app)/configuracoes/actions";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function WhatsAppConfigForm({ phoneIdAtual }: { phoneIdAtual: string }) {
  const [state, action] = useActionState<EstadoWhatsApp, FormData>(salvarWhatsApp, undefined);

  return (
    <form action={action} className="space-y-3">
      <Field
        label="Phone Number ID"
        hint="Meta for Developers → WhatsApp → Configuração da API → “Identificação do número de telefone”. Deixe vazio pra desligar o WhatsApp."
      >
        <Input
          name="whatsappPhoneId"
          defaultValue={phoneIdAtual}
          inputMode="numeric"
          placeholder="ex: 1335454696319726"
        />
      </Field>
      {state?.erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.erro}</p>}
      {state?.sucesso && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Salvo.</p>}
      <div className="flex justify-end">
        <SubmitButton>Salvar</SubmitButton>
      </div>
    </form>
  );
}
