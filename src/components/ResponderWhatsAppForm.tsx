"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { Textarea } from "@/components/ui";
import { responderWhatsApp } from "@/app/(app)/whatsapp/actions";

export function ResponderWhatsAppForm({
  canonico,
  telefone,
  clienteId,
}: {
  canonico: string;
  telefone: string;
  clienteId: string | null;
}) {
  const acao = responderWhatsApp.bind(null, canonico, telefone, clienteId);
  const [state, formAction] = useActionState(acao, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <Textarea name="texto" rows={2} placeholder="Escreva uma mensagem..." required />
      {state?.erro && <p className="text-xs text-red-600">{state.erro}</p>}
      <p className="text-xs text-slate-400">
        Só é entregue se o cliente mandou mensagem nas últimas 24h — fora desse prazo, use &quot;Enviar OS/orçamento/NF&quot; na tela do documento.
      </p>
      <SubmitButton variant="primary" pendingLabel="Enviando...">
        <Send className="h-4 w-4" /> Enviar
      </SubmitButton>
    </form>
  );
}
