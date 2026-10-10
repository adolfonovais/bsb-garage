"use client";

import { useActionState, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { Textarea } from "@/components/ui";
import { responderWhatsApp } from "@/app/(app)/whatsapp/actions";
import { PedirRetornoButton } from "@/components/PedirRetornoButton";

export function ResponderWhatsAppForm({
  canonico,
  telefone,
  clienteId,
  nomeCliente,
  janelaAberta,
}: {
  canonico: string;
  telefone: string;
  clienteId: string | null;
  nomeCliente: string;
  /** false = passou de 24h do último contato do cliente: a Meta recusa mensagem livre. */
  janelaAberta: boolean;
}) {
  const acao = responderWhatsApp.bind(null, canonico, telefone, clienteId);
  const [state, formAction] = useActionState(acao, undefined);
  const [nomeAnexo, setNomeAnexo] = useState<string | null>(null);

  if (!janelaAberta) {
    return (
      <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <p className="font-medium">Passaram mais de 24h desde a última mensagem do cliente.</p>
        <p className="mt-1 text-xs">
          O WhatsApp só entrega mensagem livre dentro de 24h do último contato dele. Peça que ele responda:
          ele recebe um aviso de que há um assunto do interesse dele e, ao responder, a conversa reabre.
        </p>
        <div className="mt-2">
          <PedirRetornoButton
            telefone={telefone}
            clienteId={clienteId}
            nomeCliente={nomeCliente}
            rotulo="Pedir retorno ao cliente"
          />
        </div>
      </div>
    );
  }

  return (
    // A key muda a cada envio com sucesso: remonta o formulário e limpa texto e anexo.
    <form key={state?.enviadoEm ?? 0} action={formAction} className="space-y-2">
      <Textarea name="texto" rows={2} placeholder="Escreva uma mensagem (ou só anexe um arquivo)..." />

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
          <Paperclip className="h-3.5 w-3.5" />
          Anexar foto, áudio, vídeo ou documento
          <input
            type="file"
            name="anexo"
            className="hidden"
            accept="image/jpeg,image/png,video/mp4,audio/ogg,audio/mpeg,audio/mp4,audio/aac,audio/amr,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={(e) => setNomeAnexo(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        {nomeAnexo && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
            {nomeAnexo}
            <button
              type="button"
              aria-label="Remover anexo"
              onClick={(e) => {
                const campo = e.currentTarget.closest("form")?.querySelector<HTMLInputElement>('input[name="anexo"]');
                if (campo) campo.value = "";
                setNomeAnexo(null);
              }}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>

      {state?.erro && <p className="text-xs text-red-600">{state.erro}</p>}
      <p className="text-xs text-slate-400">
        Entrega só dentro de 24h do último contato do cliente. Anexos até 10MB (foto JPG/PNG, vídeo MP4, áudio,
        PDF e documentos do Office).
      </p>
      <SubmitButton variant="primary" pendingLabel="Enviando...">
        <Send className="h-4 w-4" /> Enviar
      </SubmitButton>
    </form>
  );
}
