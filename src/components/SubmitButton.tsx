"use client";

import { useFormStatus } from "react-dom";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui";

/**
 * Botão de submit que mostra um spinner sozinho enquanto o formulário está
 * sendo enviado (via useFormStatus — funciona com Server Actions "cruas" e
 * com useActionState). Sem isso, clicar em Salvar/Criar/Adicionar não dava
 * nenhum feedback até a página inteira recarregar, o que em conexões mais
 * lentas com o banco parecia que o clique não tinha feito nada.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: ReactNode;
  variant?: keyof typeof buttonVariants;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      {...props}
      disabled={pending || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${buttonVariants[variant]} ${className ?? ""}`}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
