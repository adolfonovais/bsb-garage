"use client";

import { useActionState } from "react";
import { MessageCircle } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import type { AcaoEnvioWhatsApp } from "@/lib/envio-documentos-whatsapp";

/** Botão "Enviar X por WhatsApp" — mesmo padrão do EmitirNfseButton. */
export function EnviarWhatsAppButton({ acao, rotulo }: { acao: AcaoEnvioWhatsApp; rotulo: string }) {
  const [state, action] = useActionState(acao, undefined);

  return (
    <form action={action} className="inline-flex flex-col items-end gap-1">
      <SubmitButton variant="secondary" pendingLabel="Enviando...">
        <MessageCircle className="h-4 w-4" /> {rotulo}
      </SubmitButton>
      {state?.erro && <p className="max-w-xs text-right text-xs text-red-600">{state.erro}</p>}
      {state?.sucesso && <p className="max-w-xs text-right text-xs text-emerald-600">Enviado!</p>}
    </form>
  );
}
