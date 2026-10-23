"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

function Botao({ titulo, className, iconeClassName }: { titulo: string; className?: string; iconeClassName?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={titulo}
      aria-label={titulo}
      className={`${className ?? "text-slate-400 hover:text-red-600"} disabled:opacity-40`}
    >
      <Trash2 className={iconeClassName ?? "h-4 w-4"} />
    </button>
  );
}

/** Lixeira (só o ícone) pra linhas de tabela e miniaturas; pede confirmação antes de apagar. */
export function ExcluirIconeComConfirmacao({
  acao,
  mensagem,
  titulo = "Excluir",
  className,
  iconeClassName,
  formClassName,
}: {
  acao: (formData: FormData) => void | Promise<void>;
  mensagem: string;
  titulo?: string;
  className?: string;
  iconeClassName?: string;
  formClassName?: string;
}) {
  return (
    <form
      action={acao}
      className={formClassName}
      onSubmit={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault();
      }}
    >
      <Botao titulo={titulo} className={className} iconeClassName={iconeClassName} />
    </form>
  );
}
