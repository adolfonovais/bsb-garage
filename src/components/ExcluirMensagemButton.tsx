"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

function Icone() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Excluir mensagem"
      title="Excluir mensagem"
      className="inline-flex items-center rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 disabled:opacity-30"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  );
}

/** Lixeira pequena no balão da mensagem; pede confirmação antes de excluir. */
export function ExcluirMensagemButton({ acao, mensagem }: { acao: () => void | Promise<void>; mensagem: string }) {
  return (
    <form
      action={acao}
      className="inline-flex"
      onSubmit={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault();
      }}
    >
      <Icone />
    </form>
  );
}
