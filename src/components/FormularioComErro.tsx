"use client";

import { useActionState, type ReactNode } from "react";

export type EstadoComErro = { sucesso?: boolean; erro?: string } | undefined;

/**
 * <form> baseado em useActionState que mostra `estado.erro` como uma
 * mensagem na própria tela, em vez de deixar uma validação (ex: "valor
 * menor que o já recebido") virar a página de erro genérica do Next —
 * que acontece quando a action lança uma exceção direto num <form
 * action={...}> "cru". A action deve validar e devolver { erro: "..." }
 * em vez de lançar, e pode continuar chamando redirect() no caminho de
 * sucesso normalmente.
 */
export function FormularioComErro({
  action,
  children,
  className,
}: {
  action: (estado: EstadoComErro, formData: FormData) => Promise<EstadoComErro> | EstadoComErro;
  children: ReactNode;
  className?: string;
}) {
  const [estado, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={className}>
      {estado?.erro && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {estado.erro}
        </div>
      )}
      {children}
    </form>
  );
}
