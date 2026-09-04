"use client";

import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";

export type EstadoSimples = { sucesso?: boolean; erro?: string } | undefined;
type AcaoComEstado = (prevState: EstadoSimples, formData: FormData) => Promise<EstadoSimples>;

const FecharContext = createContext<() => void>(() => {});

/** Botão "Cancelar" — fecha o painel sem salvar. Usado dentro de <DetailsForm>. */
export function BotaoCancelarDetails() {
  const fechar = useContext(FecharContext);
  return (
    <button type="button" onClick={fechar} className="text-sm font-medium text-slate-500 hover:text-slate-700">
      Cancelar
    </button>
  );
}

/**
 * Um <details>/<summary> com formulário de Server Action dentro. Ao salvar
 * com sucesso, fecha sozinho (e limpa os campos, se `limparAoSalvar`) — sem
 * isso o painel continuava aberto depois de salvar, dando a impressão de
 * que nada tinha acontecido. <BotaoCancelarDetails /> fecha e limpa sem
 * salvar nada.
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

  function fechar() {
    if (detailsRef.current) detailsRef.current.open = false;
    formRef.current?.reset();
  }

  return (
    <details ref={detailsRef} className={detailsClassName}>
      <summary className="cursor-pointer list-none text-sm font-medium text-amber-700 [&::-webkit-details-marker]:hidden">
        {resumo}
      </summary>
      <FecharContext.Provider value={fechar}>
        <form ref={formRef} action={formAction} className={formClassName}>
          {children}
          {state?.erro && <p className="col-span-2 text-sm text-red-700">{state.erro}</p>}
        </form>
      </FecharContext.Provider>
    </details>
  );
}
