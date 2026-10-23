"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";

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
  const aviso = useRef<HTMLDivElement>(null);

  // O botão de salvar fica no fim da página; sem rolar, o aviso passava despercebido.
  useEffect(() => {
    if (estado?.erro) aviso.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [estado]);

  return (
    <form action={formAction} className={className}>
      {estado?.erro && (
        <div ref={aviso} role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {estado.erro}
        </div>
      )}
      {children}
    </form>
  );
}
