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
  const formulario = useRef<HTMLFormElement>(null);
  const aviso = useRef<HTMLDivElement>(null);
  const enviado = useRef<FormData | null>(null);

  useEffect(() => {
    if (!estado?.erro) return;

    // O React limpa os campos não controlados depois de uma ação; devolve o que
    // a pessoa tinha digitado pra ela não perder o trabalho por causa do aviso.
    const form = formulario.current;
    const dados = enviado.current;
    if (form && dados) {
      for (const el of Array.from(form.elements)) {
        if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) continue;
        if (!el.name || el.disabled) continue;
        if (el instanceof HTMLInputElement && ["hidden", "file", "password", "submit", "button"].includes(el.type)) continue;
        if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
          el.checked = dados.getAll(el.name).includes(el.value);
          continue;
        }
        const valor = dados.get(el.name);
        if (typeof valor === "string" && el.value !== valor) el.value = valor;
      }
    }

    // O botão de salvar fica no fim da página; sem rolar, o aviso passava despercebido.
    aviso.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [estado]);

  return (
    <form
      ref={formulario}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        enviado.current = new FormData(e.currentTarget);
      }}
    >
      {estado?.erro && (
        <div
          ref={aviso}
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
        >
          {estado.erro}
        </div>
      )}
      {children}
    </form>
  );
}
