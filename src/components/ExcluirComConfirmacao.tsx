"use client";

import { Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import type { buttonVariants } from "@/components/ui";

/** Botão de excluir que pede confirmação antes — um toque errado não apaga mais nada. */
export function ExcluirComConfirmacao({
  acao,
  mensagem,
  rotulo,
  variant = "ghost",
  className,
}: {
  acao: () => void | Promise<void>;
  mensagem: string;
  rotulo: string;
  variant?: keyof typeof buttonVariants;
  className?: string;
}) {
  return (
    <form
      action={acao}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault();
      }}
    >
      <SubmitButton variant={variant}>
        <Trash2 className="h-4 w-4" /> {rotulo}
      </SubmitButton>
    </form>
  );
}
