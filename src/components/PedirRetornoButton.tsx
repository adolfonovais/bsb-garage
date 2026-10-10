"use client";

import { useActionState } from "react";
import { MessageCircleMore } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { pedirRetornoWhatsApp } from "@/app/(app)/whatsapp/actions";

/**
 * Manda ao cliente o template que avisa que há um assunto do interesse dele e
 * pede que responda — abre conversa (ou retoma depois das 24h).
 */
export function PedirRetornoButton({
  telefone,
  clienteId,
  nomeCliente,
  rotulo = "Pedir retorno no WhatsApp",
}: {
  telefone: string;
  clienteId: string | null;
  nomeCliente: string;
  rotulo?: string;
}) {
  const acao = pedirRetornoWhatsApp.bind(null, telefone, clienteId, nomeCliente);
  const [state, formAction] = useActionState(acao, undefined);

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <SubmitButton variant="secondary" pendingLabel="Enviando...">
        <MessageCircleMore className="h-4 w-4" /> {rotulo}
      </SubmitButton>
      {state?.erro && <p className="max-w-sm text-xs text-red-600">{state.erro}</p>}
      {state?.sucesso && (
        <p className="max-w-sm text-xs text-emerald-700">
          Enviado. Quando o cliente responder, a conversa aparece em WhatsApp.
        </p>
      )}
    </form>
  );
}
