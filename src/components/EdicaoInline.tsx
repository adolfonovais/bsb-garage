"use client";

import { createContext, ReactNode, useActionState, useContext, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui";

const CancelarContext = createContext<() => void>(() => {});

/** Botão "Cancelar edição" — usado dentro do `formulario` passado a <EdicaoInline>. */
export function BotaoCancelarEdicao() {
  const cancelar = useContext(CancelarContext);
  return (
    <Button type="button" variant="ghost" onClick={cancelar}>
      Cancelar edição
    </Button>
  );
}

export type EstadoFormulario = { sucesso?: boolean } | undefined;

/**
 * Substituto do <form action={...}> dentro do `formulario` de <EdicaoInline>
 * pra quando a action é assíncrona baseada em useActionState (recebe
 * `(estadoAnterior, formData)` e retorna `{ sucesso: true }`). Sem isso, o
 * formulário salvava de verdade mas continuava aberto na tela — nada
 * fechava a edição de volta pra visualização, parecendo que não tinha
 * salvo nada.
 */
export function FormularioComFechamento({
  action,
  children,
  className,
}: {
  action: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario> | EstadoFormulario;
  children: ReactNode;
  className?: string;
}) {
  const fechar = useContext(CancelarContext);
  const [estado, formAction] = useActionState(action, undefined);

  useEffect(() => {
    if (estado?.sucesso) fechar();
  }, [estado, fechar]);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}

/**
 * Alterna entre uma visualização somente-leitura (com botão "Editar") e um
 * formulário de edição (que deve incluir <BotaoCancelarEdicao /> e um botão
 * de submit). Usado nas telas de Cliente/Oficina/Peça/Repasse, que editam
 * os dados direto na própria tela de detalhe, sem uma rota /editar separada.
 */
export function EdicaoInline({
  visualizacao,
  formulario,
}: {
  visualizacao: React.ReactNode;
  formulario: React.ReactNode;
}) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <div>
        {visualizacao}
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={() => setEditando(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        </div>
      </div>
    );
  }

  return <CancelarContext.Provider value={() => setEditando(false)}>{formulario}</CancelarContext.Provider>;
}
