"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
      title="Remover veículo"
    >
      <Trash2 className="h-3.5 w-3.5" /> {pending ? "Removendo..." : "Remover"}
    </button>
  );
}

/** "Remover" do veículo na página do cliente — pede confirmação antes de apagar. */
export function RemoverVeiculoButton({ acao, mensagem }: { acao: () => void | Promise<void>; mensagem: string }) {
  return (
    <form
      action={acao}
      className="mt-1 flex justify-end"
      onSubmit={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault();
      }}
    >
      <Botao />
    </form>
  );
}
