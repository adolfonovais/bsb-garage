"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";

export type EstadoSimples = { sucesso?: boolean; erro?: string } | undefined;
type AcaoComEstado = (prevState: EstadoSimples, formData: FormData) => Promise<EstadoSimples>;

/**
 * Um <details>/<summary> com formulário de Server Action dentro. Ao salvar
 * com sucesso, fecha sozinho (e limpa os campos, se `limparAoSalvar`) — sem
 * isso o painel continuava aberto depois de salvar, dando a impressão de
 * que nada tinha acontecido.
 */
export function DetailsForm({
  resumo,
  detailsClassName,
  formClassName,
  action,
  children,
  limparAoSalvar = false,
}: {
  resumo: ReactNode;
  detailsClassName?: string;
  formClassName?: string;
  action: AcaoComEstado;
  children: ReactNode;
  limparAoSalvar?: boolean;
}) {
  const [state, formAction] = useActionState<EstadoSimples, FormData>(action, undefined);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sucesso) {
      if (detailsRef.current) detailsRef.current.open = false;
      if (limparAoSalvar) formRef.current?.reset();
    }
  }, [state, limparAoSalvar]);

  return (
    <details ref={detailsRef} className={detailsClassName}>
      <summary className="cursor-pointer list-none text-sm font-medium text-amber-700 [&::-webkit-details-marker]:hidden">
        {resumo}
      </summary>
      <form ref={formRef} action={formAction} className={formClassName}>
        {children}
        {state?.erro && <p className="col-span-2 text-sm text-red-700">{state.erro}</p>}
      </form>
    </details>
  );
}
